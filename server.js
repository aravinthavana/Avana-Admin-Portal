const http = require('http');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dns = require('dns');
const net = require('net');
const tls = require('tls');

// Simple .env parser to avoid npm dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

// Load env variables
loadEnv();

const crypto = require('crypto');
const adminSessions = new Map(); // stores token -> timestamp (ms)

async function verifyAdminSession(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7).trim();
  
  let sessionTime = null;
  if (mongoSessionsCollection) {
    try {
      const doc = await mongoSessionsCollection.findOne({ token });
      if (doc) {
        sessionTime = doc.timestamp;
      }
    } catch (err) {
      console.error('[DB] MongoDB session lookup failure:', err.message);
    }
  } else {
    sessionTime = adminSessions.get(token);
  }

  if (!sessionTime) {
    return false;
  }

  const maxAge = 2 * 60 * 60 * 1000; // 2 hours in ms
  if (Date.now() - sessionTime > maxAge) {
    if (mongoSessionsCollection) {
      await mongoSessionsCollection.deleteOne({ token }).catch(() => {});
    } else {
      adminSessions.delete(token); // Expired
    }
    return false;
  }

  // Refresh session activity on successful verify
  if (mongoSessionsCollection) {
    await mongoSessionsCollection.updateOne({ token }, { $set: { timestamp: Date.now() } }).catch(() => {});
  } else {
    adminSessions.set(token, Date.now());
  }
  return true;
}

const PORT = process.env.PORT || 3000;

// BACK-H3: Fail fast if ADMIN_PASSWORD_HASH is not explicitly set
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
if (!ADMIN_PASSWORD_HASH) {
  console.error('[FATAL] ADMIN_PASSWORD_HASH environment variable is not set. Set it in your .env file and restart.');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com';
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const MOCK_EMAIL_FILE = path.join(__dirname, 'mock_emails.log');
const MOCK_SMS_FILE = path.join(__dirname, 'mock_sms.log');
const LOGINS_FILE = path.join(__dirname, 'employee_logins.json');
const EMPLOYEE_CREDENTIALS_FILE = path.join(__dirname, 'employee_credentials.json');
const otpStore = {};
const employeeSessions = new Map(); // Store authenticated employee sessions
const captchaStore = new Map(); // Store generated captchas by IP
let adminResetOTP = null; // Store active admin reset OTP code and expiry

// Dynamic .env updater
function updateEnvValue(key, value) {
  const envPath = path.join(__dirname, '.env');
  let lines = [];
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    lines = content.split(/\r?\n/);
  }
  let keyFound = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#') || !trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const currentKey = trimmed.substring(0, eqIdx).trim();
      if (currentKey === key) {
        lines[i] = `${key}=${value}`;
        keyFound = true;
        break;
      }
    }
  }
  if (!keyFound) {
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  process.env[key] = value;
}

// Get and Save Employee Credentials from employee_credentials.json
function getEmployeeCredentials() {
  try {
    if (fs.existsSync(EMPLOYEE_CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(EMPLOYEE_CREDENTIALS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read employee credentials:', e);
  }
  return {};
}

function saveEmployeeCredentials(creds) {
  try {
    fs.writeFileSync(EMPLOYEE_CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write employee credentials:', e);
    return false;
  }
}

// BACK-H2: Simple in-memory rate limiter  keyed by IP + action
const _rateMap = new Map();
function isRateLimited(ip, action, maxRequests, windowMs) {
  const key = `${ip}::${action}`;
  const now = Date.now();
  let entry = _rateMap.get(key);
  if (!entry || now - entry.start > windowMs) {
    entry = { count: 0, start: now };
  }
  entry.count++;
  _rateMap.set(key, entry);
  return entry.count > maxRequests;
}
// Cleanup rate map every 15 minutes to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [k, v] of _rateMap.entries()) {
    if (v.start < cutoff) _rateMap.delete(k);
  }
}, 15 * 60 * 1000).unref();

// Pure Node.js SMTP Client with STARTTLS & Direct MX Fallback support (Fallback when nodemailer is absent/fails)
function sendEmailViaRawSocket({ to, subject, htmlBody }) {
  return new Promise((resolve, reject) => {
    const domain = to.split('@')[1];
    
    // SMTP Client Config from env or fallback to direct MX lookup
    const smtpConfig = {
      host: process.env.SMTP_HOST || null,
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || null,
      pass: process.env.SMTP_PASS || null
    };

    const runSmtp = (host, port, isSecure) => {
      let socket;
      let step = 0;
      const emailFrom = smtpConfig.user || 'helpdesk@avanamedical.com';
      let secureSocket = null;

      const write = (cmd) => {
        socket.write(cmd + '\r\n');
      };

      const onData = (data) => {
        const response = data.toString();
        const code = response.slice(0, 3);

        if (step === 0 && code === '220') {
          write('EHLO localhost');
          step = 1;
        } else if (step === 1 && (code === '250' || code === '220')) {
          if (smtpConfig.user && smtpConfig.pass && !isSecure) {
            write('STARTTLS');
            step = 1.5;
          } else if (smtpConfig.user && smtpConfig.pass && isSecure) {
            write('AUTH LOGIN');
            step = 2;
          } else {
            write(`MAIL FROM:<${emailFrom}>`);
            step = 3;
          }
        } else if (step === 1.5 && code === '220') {
          // Upgrade connection to secure TLS socket
          secureSocket = tls.connect({
            socket: socket,
            rejectUnauthorized: true
          }, () => {
            socket = secureSocket;
            socket.on('data', onData);
            socket.on('error', (err) => reject(err));
            write('EHLO localhost');
            step = 1.8;
          });
          isSecure = true;
        } else if (step === 1.8 && code === '250') {
          write('AUTH LOGIN');
          step = 2;
        } else if (step === 2 && code === '334') {
          write(Buffer.from(smtpConfig.user).toString('base64'));
          step = 2.3;
        } else if (step === 2.3 && code === '334') {
          write(Buffer.from(smtpConfig.pass).toString('base64'));
          step = 2.6;
        } else if (step === 2.6 && code === '235') {
          write(`MAIL FROM:<${emailFrom}>`);
          step = 3;
        } else if (step === 3 && code === '250') {
          write(`RCPT TO:<${to}>`);
          step = 4;
        } else if (step === 4 && code === '250') {
          write('DATA');
          step = 5;
        } else if (step === 5 && code === '354') {
          const mailContent = 
            `From: ${emailFrom}\r\n` +
            `To: ${to}\r\n` +
            `Subject: ${subject}\r\n` +
            `Content-Type: text/html; charset=utf-8\r\n\r\n` +
            `${htmlBody}\r\n.`;
          write(mailContent);
          step = 6;
        } else if (step === 6 && code === '250') {
          write('QUIT');
          step = 7;
        } else if (step === 7 || code === '221') {
          socket.end();
          resolve(true);
        } else {
          socket.end();
          reject(new Error(`SMTP Failure at step ${step}: ${response}`));
        }
      };

      if (isSecure) {
        socket = tls.connect({ host, port, rejectUnauthorized: false }, () => {});
      } else {
        socket = net.connect({ host, port }, () => {});
      }

      socket.on('data', onData);
      socket.on('error', (err) => {
        socket.end();
        reject(err);
      });
    };

    if (smtpConfig.host) {
      // Custom authenticated SMTP route
      runSmtp(smtpConfig.host, smtpConfig.port, smtpConfig.port === 465);
    } else {
      // Fallback to Direct-to-MX Delivery
      dns.resolveMx(domain, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          reject(new Error('DNS failed to resolve MX records for domain ' + domain));
          return;
        }
        addresses.sort((a, b) => a.priority - b.priority);
        const mxHost = addresses[0].exchange;
        runSmtp(mxHost, 25, false);
      });
    }
  });
}

// Wrapper sendEmail with dynamic nodemailer load & raw socket fallback
function sendEmail({ to, subject, htmlBody }) {
  return new Promise((resolve, reject) => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Log mock email if no user/pass configured (local dev fallback)
    if (!smtpUser || !smtpPass) {
      logMockEmail(to, subject, htmlBody);
      resolve({ success: true, info: 'Mock email logged.' });
      return;
    }

    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.office365.com',
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: true
        }
      });

      const mailOptions = {
        from: smtpUser,
        to: to,
        subject: subject,
        html: htmlBody
      };

      const fallbackChain = () => {
        console.log('Attempting PowerShell SMTP fallback...');
        sendEmailViaPowershell(to, subject, htmlBody)
          .then(resolve)
          .catch(psErr => {
            console.error('PowerShell SMTP fallback failed. Attempting Raw Socket fallback...', psErr);
            sendEmailViaRawSocket({ to, subject, htmlBody }).then(resolve).catch(reject);
          });
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Nodemailer send error:', error);
          fallbackChain();
        } else {
          resolve({ success: true, info });
        }
      });
    } catch (e) {
      console.log('Nodemailer not found or failed, entering fallback chain.');
      const fallbackChain = () => {
        console.log('Attempting PowerShell SMTP fallback...');
        sendEmailViaPowershell(to, subject, htmlBody)
          .then(resolve)
          .catch(psErr => {
            console.error('PowerShell SMTP fallback failed. Attempting Raw Socket fallback...', psErr);
            sendEmailViaRawSocket({ to, subject, htmlBody }).then(resolve).catch(reject);
          });
      };
      fallbackChain();
    }
  });
}

if (!fs.existsSync(LOGINS_FILE)) {
  fs.writeFileSync(LOGINS_FILE, JSON.stringify([], null, 2));
}

//  MongoDB Atlas Support 
// When MONGODB_URI env variable is set (on cloud), uses MongoDB.
// When running locally without MONGODB_URI, falls back to local JSON files.
let mongoCollection = null;
let mongoHelpdeskCollection = null;
let mongoSessionsCollection = null;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!uri) {
    if (isProduction) {
      console.error('[DB] FATAL ERROR: MONGODB_URI is required in production mode. System exiting.');
      process.exit(1);
    }
    console.log('[DB] MONGODB_URI not set  using local JSON file storage.');
    return;
  }
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('avana_booking');
    mongoCollection = db.collection('bookings');
    mongoHelpdeskCollection = db.collection('helpdesk_requests');
    mongoSessionsCollection = db.collection('admin_sessions');
    console.log('[DB] Connected to MongoDB Atlas successfully!');
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    if (isProduction) {
      console.error('[DB] FATAL ERROR: MongoDB connection required in production mode. System exiting.');
      process.exit(1);
    }
    console.log('[DB] Falling back to local JSON file storage.');
    mongoCollection = null;
    mongoHelpdeskCollection = null;
    mongoSessionsCollection = null;
  }
}

// Async: Get all bookings (MongoDB or local JSON)
async function getBookingsDB() {
  if (mongoCollection) {
    try {
      const docs = await mongoCollection.find({}).toArray();
      // Remove MongoDB's _id field before returning
      return docs.map(({ _id, ...rest }) => rest);
    } catch (err) {
      console.error('[DB] MongoDB read error:', err.message);
    }
  }
  return getBookings(); // local JSON fallback
}

// Async: Save all bookings (MongoDB or local JSON)
// BACK-CF1: Use upsert per document  eliminates deleteMany+insertMany race condition and data-loss on crash
async function saveBookingsDB(bookings) {
  if (mongoCollection) {
    try {
      const ops = bookings.map(b => ({
        replaceOne: { filter: { id: b.id }, replacement: b, upsert: true }
      }));
      if (ops.length > 0) await mongoCollection.bulkWrite(ops, { ordered: false });
      // Remove records no longer in the bookings array
      const ids = bookings.map(b => b.id);
      await mongoCollection.deleteMany({ id: { $nin: ids } });
      return true;
    } catch (err) {
      console.error('[DB] MongoDB bookings save error:', err.message);
      // Do NOT silently fall through  return false so caller knows
      return false;
    }
  }
  return saveBookings(bookings); // local JSON fallback
}

// Setup local bookings.json (used as fallback)
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
}

//  Help Desk Requests Storage 
const HELPDESK_FILE = path.join(__dirname, 'helpdesk_requests.json');
if (!fs.existsSync(HELPDESK_FILE)) {
  fs.writeFileSync(HELPDESK_FILE, JSON.stringify([], null, 2));
}

async function getHelpdeskRequests() {
  if (mongoHelpdeskCollection) {
    try {
      const docs = await mongoHelpdeskCollection.find({}).toArray();
      return docs.map(({ _id, ...rest }) => rest);
    } catch (err) {
      console.error('[DB] MongoDB helpdesk read error:', err.message);
    }
  }
  try {
    const data = fs.readFileSync(HELPDESK_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) { return []; }
}

async function saveHelpdeskRequests(requests) {
  if (mongoHelpdeskCollection) {
    try {
      // BACK-CF2: Use upsert per document  eliminates deleteMany+insertMany race condition
      const ops = requests.map(r => ({
        replaceOne: { filter: { id: r.id }, replacement: r, upsert: true }
      }));
      if (ops.length > 0) await mongoHelpdeskCollection.bulkWrite(ops, { ordered: false });
      const ids = requests.map(r => r.id);
      await mongoHelpdeskCollection.deleteMany({ id: { $nin: ids } });
      return true;
    } catch (err) {
      console.error('[DB] MongoDB helpdesk save error:', err.message);
      return false;
    }
  }
  try {
    fs.writeFileSync(HELPDESK_FILE, JSON.stringify(requests, null, 2));
    return true;
  } catch (e) { return false; }
}

//  Stationery Stock Storage & Helpers
const STATIONERY_STOCK_FILE = path.join(__dirname, 'stationery_stock.json');
const STATIONERY_CATALOG_FILE = path.join(__dirname, 'stationery_catalog.json');

const DEFAULT_PRINTING_ITEMS = [
  'A4 Paper', 'Address Sticker', 'AMD Letterhead', 'AMD Continue Sheet',
  'ASSPL Letterhead', 'ASSPL Continue Sheet', 'ATS Letterhead'
];

const DEFAULT_STATIONERY_ITEMS = [
  'AA battery', 'AAA battery', 'Bell pins', 'Binder clips 19mm', 'Binder clips 25mm',
  'Binding Tag', 'Blue Pen', 'Board Marker black', 'Board Marker Blue', 'Box File',
  'Button File', 'Cable tag', 'Calculator', 'CD marker', 'Cloth Cover A3',
  'Cloth Cover A4', 'Colin', 'Cutter small', 'Cutter blade small', 'Corbon paper',
  'Cutter blade Big', 'Cutter big', 'Drawning Pin', 'Eraser', 'Fevi Stick',
  'Flat file', 'Green paper (A4 size)', 'Highlighter green', 'Highlighter Pink', 'Highlighter yellow',
  'L-folder', 'Paper clips big', 'Paper clips Small', 'Paper punching', 'Pencil',
  'Permanent Marker', 'Petty cash book AMD', 'Petty cash book ASSPL', 'Punch Folder', 'Red File Tag',
  'Red Pen', 'Room Spray', 'Rubber band', 'Rule Note', 'Ruler',
  'scissors', 'Sharpner', 'Stapler', 'Stapler pin big', 'stapler pin remover',
  'Stapler pin small', 'Stick File', 'Sticky notes', 'Tapes 1Inch White', 'Tapes 2Inch Brown',
  'White Envelope big', 'White Envelope check type', 'White Envelope Small', 'Whitner', 'HIGHLIGHTER ORANGE'
];

async function getStationeryCatalog() {
  try {
    if (!fs.existsSync(STATIONERY_CATALOG_FILE)) {
      const catalog = {};
      DEFAULT_PRINTING_ITEMS.forEach(item => {
        catalog[item] = 'printing';
      });
      DEFAULT_STATIONERY_ITEMS.forEach(item => {
        catalog[item] = 'stationery';
      });
      fs.writeFileSync(STATIONERY_CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf8');
      return catalog;
    }
    const data = fs.readFileSync(STATIONERY_CATALOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading catalog:', e);
    return {};
  }
}

async function saveStationeryCatalog(catalog) {
  try {
    fs.writeFileSync(STATIONERY_CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving catalog:', e);
    return false;
  }
}

async function getStationeryStock() {
  try {
    const catalog = await getStationeryCatalog();
    const catalogKeys = Object.keys(catalog);
    
    if (!fs.existsSync(STATIONERY_STOCK_FILE)) {
      const initialStock = {};
      catalogKeys.forEach(item => {
        initialStock[item] = 0; // Default stock level: 0
      });
      fs.writeFileSync(STATIONERY_STOCK_FILE, JSON.stringify(initialStock, null, 2), 'utf8');
      return initialStock;
    }
    
    const data = fs.readFileSync(STATIONERY_STOCK_FILE, 'utf8');
    const stock = JSON.parse(data);
    
    // Backfill any newly added catalog items with stock 0 if they don't exist in stock file yet
    let modified = false;
    catalogKeys.forEach(item => {
      if (stock[item] === undefined) {
        stock[item] = 0; // Initialize newly added items with 0 stock
        modified = true;
      }
    });
    if (modified) {
      fs.writeFileSync(STATIONERY_STOCK_FILE, JSON.stringify(stock, null, 2), 'utf8');
    }
    
    return stock;
  } catch (e) {
    console.error('Error reading stationery stock:', e);
    return {};
  }
}

async function saveStationeryStock(stock) {
  try {
    fs.writeFileSync(STATIONERY_STOCK_FILE, JSON.stringify(stock, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving stationery stock:', e);
    return false;
  }
}

async function checkLowStockAlert(item, newQty) {
  const threshold = 5; // Alert if stock is 5 or less
  if (newQty <= threshold) {
    console.log(`[Inventory Alert] "${item}" is low in stock: ${newQty}`);
    const subject = `Low Stock Alert: "${item}"`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background-color: #fef3c7; color: #b45309; padding: 12px 16px; border-radius: 8px; font-weight: bold; margin-bottom: 16px; display: inline-flex; align-items: center; gap: 8px; width: fit-content;">
          Low Stock Warning
        </div>
        <h2 style="color: #1f2937; margin-top: 0;">Stationery Item Stock is Low</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          This is an automated system alert notifying you that the inventory level for the following item has fallen below the threshold (5 items):
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Item Name:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #1f2937; font-weight: bold;">${item}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Current Stock:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold; font-size: 18px;">${newQty}</td>
          </tr>
        </table>
        <p style="color: #4b5563; font-size: 14px; margin-top: 20px;">
          Please log into the Admin portal to manually replenish this item as soon as possible.
        </p>
      </div>
    `;
    
    sendEmail({
      to: ADMIN_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    }).catch(err => console.error('Low stock email alert failed:', err));
  }
}

//  Stationery Transaction Logging Storage & Helpers
const STATIONERY_TRANSACTIONS_FILE = path.join(__dirname, 'stationery_transactions.json');

async function getStationeryTransactions() {
  try {
    if (!fs.existsSync(STATIONERY_TRANSACTIONS_FILE)) {
      fs.writeFileSync(STATIONERY_TRANSACTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(STATIONERY_TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading transactions:', e);
    return [];
  }
}

async function logStationeryTransaction(item, type, quantity, previousStock, newStock) {
  try {
    const logs = await getStationeryTransactions();
    const logEntry = {
      timestamp: new Date().toISOString(),
      item,
      type, // "purchase" or "use"
      quantity: parseInt(quantity) || 0,
      previousStock: parseInt(previousStock) || 0,
      newStock: parseInt(newStock) || 0
    };
    logs.push(logEntry);
    fs.writeFileSync(STATIONERY_TRANSACTIONS_FILE, JSON.stringify(logs, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving transaction:', e);
    return false;
  }
}

//  Stationery Audit Overrides Storage & Helpers
const STATIONERY_OVERRIDES_FILE = path.join(__dirname, 'stationery_audit_overrides.json');

async function getAuditOverrides() {
  try {
    if (!fs.existsSync(STATIONERY_OVERRIDES_FILE)) {
      fs.writeFileSync(STATIONERY_OVERRIDES_FILE, JSON.stringify({}, null, 2), 'utf8');
      return {};
    }
    const data = fs.readFileSync(STATIONERY_OVERRIDES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading audit overrides:', e);
    return {};
  }
}

async function saveAuditOverrides(overrides) {
  try {
    fs.writeFileSync(STATIONERY_OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving audit overrides:', e);
    return false;
  }
}

//  Housekeeping Stock Storage & Helpers
const HOUSEKEEPING_CATALOG_FILE = path.join(__dirname, 'housekeeping_catalog.json');
const HOUSEKEEPING_STOCK_FILE = path.join(__dirname, 'housekeeping_stock.json');
const HOUSEKEEPING_TRANSACTIONS_FILE = path.join(__dirname, 'housekeeping_transactions.json');
const HOUSEKEEPING_OVERRIDES_FILE = path.join(__dirname, 'housekeeping_audit_overrides.json');

const defaultHousekeepingCatalog = [
  "Handwash Bottle",
  "Disinfectant Spray",
  "Toilet Paper Roll",
  "Floor Cleaner",
  "Garbage Bags"
];

async function getHousekeepingCatalog() {
  try {
    if (!fs.existsSync(HOUSEKEEPING_CATALOG_FILE)) {
      fs.writeFileSync(HOUSEKEEPING_CATALOG_FILE, JSON.stringify(defaultHousekeepingCatalog, null, 2), 'utf8');
      return defaultHousekeepingCatalog;
    }
    const data = fs.readFileSync(HOUSEKEEPING_CATALOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading housekeeping catalog:', e);
    return defaultHousekeepingCatalog;
  }
}

async function getHousekeepingStock() {
  try {
    const catalog = await getHousekeepingCatalog();
    if (!fs.existsSync(HOUSEKEEPING_STOCK_FILE)) {
      const initialStock = {};
      catalog.forEach(item => {
        initialStock[item] = 0;
      });
      fs.writeFileSync(HOUSEKEEPING_STOCK_FILE, JSON.stringify(initialStock, null, 2), 'utf8');
      return initialStock;
    }
    const data = fs.readFileSync(HOUSEKEEPING_STOCK_FILE, 'utf8');
    const stock = JSON.parse(data);
    
    let modified = false;
    catalog.forEach(item => {
      if (stock[item] === undefined) {
        stock[item] = 0;
        modified = true;
      }
    });
    if (modified) {
      fs.writeFileSync(HOUSEKEEPING_STOCK_FILE, JSON.stringify(stock, null, 2), 'utf8');
    }
    return stock;
  } catch (e) {
    console.error('Error reading housekeeping stock:', e);
    return {};
  }
}

async function saveHousekeepingStock(stock) {
  try {
    fs.writeFileSync(HOUSEKEEPING_STOCK_FILE, JSON.stringify(stock, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving housekeeping stock:', e);
    return false;
  }
}

async function getHousekeepingTransactions() {
  try {
    if (!fs.existsSync(HOUSEKEEPING_TRANSACTIONS_FILE)) {
      fs.writeFileSync(HOUSEKEEPING_TRANSACTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(HOUSEKEEPING_TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading housekeeping transactions:', e);
    return [];
  }
}

async function logHousekeepingTransaction(item, type, quantity, previousStock, newStock) {
  try {
    const logs = await getHousekeepingTransactions();
    const logEntry = {
      timestamp: new Date().toISOString(),
      item,
      type, // "purchase" or "use"
      quantity: parseInt(quantity) || 0,
      previousStock: parseInt(previousStock) || 0,
      newStock: parseInt(newStock) || 0
    };
    logs.push(logEntry);
    fs.writeFileSync(HOUSEKEEPING_TRANSACTIONS_FILE, JSON.stringify(logs, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving housekeeping transaction:', e);
    return false;
  }
}

async function getHousekeepingOverrides() {
  try {
    if (!fs.existsSync(HOUSEKEEPING_OVERRIDES_FILE)) {
      fs.writeFileSync(HOUSEKEEPING_OVERRIDES_FILE, JSON.stringify({}, null, 2), 'utf8');
      return {};
    }
    const data = fs.readFileSync(HOUSEKEEPING_OVERRIDES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading housekeeping overrides:', e);
    return {};
  }
}

async function saveHousekeepingOverrides(overrides) {
  try {
    fs.writeFileSync(HOUSEKEEPING_OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving housekeeping overrides:', e);
    return false;
  }
}

//  AMC (Annual Maintenance Contracts) Storage & Helpers
const AMC_FILE = path.join(__dirname, 'amc_contracts.json');

async function getAMCContracts() {
  try {
    if (!fs.existsSync(AMC_FILE)) {
      fs.writeFileSync(AMC_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = fs.readFileSync(AMC_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading AMC contracts:', e);
    return [];
  }
}

async function saveAMCContracts(contracts) {
  try {
    fs.writeFileSync(AMC_FILE, JSON.stringify(contracts, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving AMC contracts:', e);
    return false;
  }
}

async function checkAMCAlerts() {
  try {
    const contracts = await getAMCContracts();
    const adminEmail = ADMIN_EMAIL; // BACK-C2: Fix hardcoded email
    let modified = false;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Tomorrow date for service due check
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    
    for (let c of contracts) {
      if (!c.alertsSent) {
        c.alertsSent = { serviceDue: [], expiryWeeks: [] };
        modified = true;
      }
      
      // 1. Next Service Reminder: 1 day before nextServiceDate
      if (c.nextServiceDate) {
        if (c.nextServiceDate === tomorrowStr) {
          if (!c.alertsSent.serviceDue.includes(c.nextServiceDate)) {
            console.log(`[AMC Alert] Service due tomorrow for AMC: ${c.name}`);
            const subject = ` Tomorrow AMC Service Due: ${c.name}`;
            const html = `
              <div style="font-family:sans-serif;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
                <div style="background-color:#fee2e2;color:#b91c1c;padding:10px 16px;border-radius:8px;font-weight:bold;margin-bottom:16px;display:inline-block;">
                   AMC Service Due Tomorrow
                </div>
                <h2>AMC Service Reminder</h2>
                <p>Dear Admin,</p>
                <p>This is a reminder that the scheduled service for the following contract is due tomorrow:</p>
                <table style="width:100%;border-collapse:collapse;margin:15px 0;">
                  <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">AMC Name:</td><td style="padding:8px;border:1px solid #e5e7eb;">${c.name}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Next Service Date:</td><td style="padding:8px;border:1px solid #e5e7eb;color:#b91c1c;font-weight:bold;">${c.nextServiceDate}</td></tr>
                  <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Vendor Name:</td><td style="padding:8px;border:1px solid #e5e7eb;">${c.vendorName || 'N/A'}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Vendor Contact:</td><td style="padding:8px;border:1px solid #e5e7eb;">${c.vendorPhone || 'N/A'}</td></tr>
                  <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Coverage Details:</td><td style="padding:8px;border:1px solid #e5e7eb;">${c.coverage || 'N/A'}</td></tr>
                </table>
                <p>Please follow up with the vendor to coordinate the service tomorrow.</p>
              </div>
            `;
            sendEmail({ to: adminEmail, subject, htmlBody: html });
            c.alertsSent.serviceDue.push(c.nextServiceDate);
            modified = true;
          }
        }
      }
      
      // 2. Expiry Reminders: Last 3 weeks (once a week)
      if (c.endDate) {
        const endD = new Date(c.endDate);
        endD.setHours(0,0,0,0);
        const diffTime = endD - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let weekKey = null;
        if (diffDays > 14 && diffDays <= 21) weekKey = 3;
        else if (diffDays > 7 && diffDays <= 14) weekKey = 2;
        else if (diffDays > 0 && diffDays <= 7) weekKey = 1;
        else if (diffDays <= 0) weekKey = 0;
        
        if (weekKey !== null && !c.alertsSent.expiryWeeks.includes(weekKey)) {
          console.log(`[AMC Alert] Expiry warning: ${c.name} expires in ${diffDays} days`);
          const isExpired = weekKey === 0;
          const subject = isExpired ? ` AMC Contract EXPIRED: ${c.name}` : ` AMC Contract Expiry Reminder (${weekKey} Week${weekKey > 1 ? 's' : ''} Left): ${c.name}`;
          const html = `
            <div style="font-family:sans-serif;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
              <div style="background-color:${isExpired ? '#fef2f2' : '#fffbeb'};color:${isExpired ? '#991b1b' : '#92400e'};padding:10px 16px;border-radius:8px;font-weight:bold;margin-bottom:16px;display:inline-block;">
                ${isExpired ? ' AMC Contract Expired' : ' AMC Contract Expiry Impending'}
              </div>
              <h2>AMC Expiry Reminder</h2>
              <p>Dear Admin,</p>
              <p>This is a notice regarding the renewal of your Annual Maintenance Contract:</p>
              <table style="width:100%;border-collapse:collapse;margin:15px 0;">
                <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">AMC Name:</td><td style="padding:8px;border:1px solid #e5e7eb;">${c.name}</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">End Date:</td><td style="padding:8px;border:1px solid #e5e7eb;color:${isExpired ? '#dc2626' : '#b45309'};font-weight:bold;">${c.endDate}</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Days Remaining:</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">${diffDays > 0 ? diffDays : 'Expired'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Price / Cost:</td><td style="padding:8px;border:1px solid #e5e7eb;">INR ${c.pricing || '0'}</td></tr>
                <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Vendor Name:</td><td style="padding:8px;border:1px solid #e5e7eb;">${c.vendorName || 'N/A'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Vendor Contact:</td><td style="padding:8px;border:1px solid #e5e7eb;">${c.vendorPhone || 'N/A'}</td></tr>
              </table>
              <p>Please contact the vendor or initiate standard administrative review to renew this AMC.</p>
            </div>
          `;
          sendEmail({ to: adminEmail, subject, htmlBody: html });
          c.alertsSent.expiryWeeks.push(weekKey);
          modified = true;
        }
      }
    }
    
    if (modified) {
      await saveAMCContracts(contracts);
    }
  } catch (err) {
    console.error('Error running checkAMCAlerts:', err);
  }
}

//  Utility Payments Storage & Helpers
const UTILITY_PAYMENTS_FILE = path.join(__dirname, 'utility_payments.json');

function getUtilityPayments() {
  try {
    if (!fs.existsSync(UTILITY_PAYMENTS_FILE)) {
      fs.writeFileSync(UTILITY_PAYMENTS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    return JSON.parse(fs.readFileSync(UTILITY_PAYMENTS_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading utility payments:', e);
    return [];
  }
}

function saveUtilityPayments(entries) {
  try {
    fs.writeFileSync(UTILITY_PAYMENTS_FILE, JSON.stringify(entries, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving utility payments:', e);
    return false;
  }
}

function checkUtilityReminders() {
  try {
    const entries = getUtilityPayments();
    const adminEmail = ADMIN_EMAIL;
    let modified = false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 2);
    const reminderStr = reminderDate.toISOString().slice(0, 10);

    // Group unpaid entries due in 2 days by serviceType
    const groups = {};
    for (const entry of entries) {
      if (entry.paid) continue;
      if (entry.dueDate !== reminderStr) continue;
      if (entry.reminderSent) continue;
      if (!groups[entry.serviceType]) groups[entry.serviceType] = [];
      groups[entry.serviceType].push(entry);
    }

    const serviceTitles = {
      mobile: 'Mobile Bill',
      landline: 'Landline Bill',
      broadband: 'Broadband Bill',
      electricity: 'Electricity Bill'
    };

    for (const [svcType, items] of Object.entries(groups)) {
      const title = serviceTitles[svcType] || svcType;
      const rows = items.map(it => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.serviceProvider || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.userName || it.location || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.number || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.dueDate || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:#dc2626;">INR ${it.amount || '0'}</td>
        </tr>`).join('');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0891b2;color:white;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;"> Utility Payment Reminder</h2>
            <p style="margin:4px 0 0;opacity:0.9;">${title}  Due in 2 Days</p>
          </div>
          <div style="background:#f9fafb;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
            <p>Dear Admin, the following <strong>${title}</strong> payments are due on <strong>${reminderStr}</strong>:</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:0.9rem;">
              <thead><tr style="background:#e0f2fe;">
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Provider</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Name/Location</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Number</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Due Date</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Amount</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="color:#6b7280;font-size:0.85rem;">Please log in to the Admin Portal to mark these as paid once completed.</p>
          </div>
        </div>`;

      setImmediate(() => {
        sendEmail({ to: adminEmail, subject: `Payment Reminder: ${title} due on ${reminderStr}`, htmlBody: html });
      });

      // Mark reminder sent
      for (const item of items) {
        const idx = entries.findIndex(e => e.id === item.id);
        if (idx !== -1) { entries[idx].reminderSent = true; modified = true; }
      }
    }

    if (modified) saveUtilityPayments(entries);
  } catch (err) {
    console.error('Error running checkUtilityReminders:', err);
  }
}

function rolloverUtilityPayments() {
  try {
    const entries = getUtilityPayments();
    let modified = false;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    // Calculate previous month
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const defaultNewDueDate = `${currentMonthStr}-01`;

    const prevMonthEntries = entries.filter(e => e.dueDate && e.dueDate.startsWith(prevMonthStr));
    const currentMonthEntries = entries.filter(e => e.dueDate && e.dueDate.startsWith(currentMonthStr));

    for (const old of prevMonthEntries) {
      // Check if this account already rolled over
      const exists = currentMonthEntries.some(c => c.number === old.number && c.serviceType === old.serviceType);
      if (!exists) {
        const oldDay = old.dueDate.split('-')[2] || '01';
        entries.push({
          id: crypto.randomUUID(),
          serviceType: old.serviceType,
          serviceProvider: old.serviceProvider,
          userName: old.userName || '',
          location: old.location || '',
          number: old.number,
          dueDate: `${currentMonthStr}-${oldDay}`,
          amount: 0,
          paid: false,
          paidOn: null,
          reminderSent: false,
          createdAt: new Date().toISOString()
        });
        modified = true;
      }
    }

    if (modified) saveUtilityPayments(entries);
  } catch (err) {
    console.error('Error running rolloverUtilityPayments:', err);
  }
}

// ── Tax Payments Storage & Helpers ─────────────────────────────────────
const TAX_PAYMENTS_FILE = path.join(__dirname, 'tax_payments.json');

function getTaxPayments() {
  try {
    if (!fs.existsSync(TAX_PAYMENTS_FILE)) {
      fs.writeFileSync(TAX_PAYMENTS_FILE, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(TAX_PAYMENTS_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function saveTaxPayments(entries) {
  try {
    fs.writeFileSync(TAX_PAYMENTS_FILE, JSON.stringify(entries, null, 2));
  } catch(e) {
    console.error('Error writing tax payments', e);
  }
}

function checkTaxReminders() {
  try {
    const entries = getTaxPayments();
    let modified = false;

    // Check for entries that are 7 days away from due date
    const reminderDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const reminderStr = reminderDate.toISOString().slice(0, 10);
    const adminEmail = process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com';

    const groups = {};
    for (const entry of entries) {
      if (entry.paid) continue;
      if (entry.reminderSent) continue;
      
      let isDueSoon = false;
      if (entry.dueDate && entry.dueDate.length === 7) {
        // Format YYYY-MM. We trigger the reminder on the 24th of the month.
        const [remYear, remMonth, remDay] = reminderStr.split('-');
        const [dueYear, dueMonth] = entry.dueDate.split('-');
        if (dueYear === remYear && dueMonth === remMonth && remDay === '24') {
          isDueSoon = true;
        }
      } else {
        if (entry.dueDate === reminderStr) isDueSoon = true;
      }
      
      if (!isDueSoon) continue;
      
      if (!groups[entry.serviceType]) groups[entry.serviceType] = [];
      groups[entry.serviceType].push(entry);
    }

    const serviceTitles = {
      property: 'Property Tax',
      water: 'Water Tax'
    };

    for (const [svcType, items] of Object.entries(groups)) {
      const title = serviceTitles[svcType] || svcType;
      const rows = items.map(it => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.location || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.billNumber || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.year} - ${it.term}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${it.dueDate || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:#dc2626;">INR ${it.amount || '0'}</td>
        </tr>`).join('');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0891b2;color:white;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;">Tax Payment Reminder</h2>
            <p style="margin:4px 0 0;opacity:0.9;">${title} — Due in 1 Week</p>
          </div>
          <div style="background:#f9fafb;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
            <p>Dear Admin, the following <strong>${title}</strong> payments are due on <strong>${reminderStr}</strong>:</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:0.9rem;">
              <thead><tr style="background:#e0f2fe;">
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Location</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Bill Number</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Year & Term</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Due Date</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Amount</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="color:#6b7280;font-size:0.85rem;">Please log in to the Admin Portal to mark these as paid once completed.</p>
          </div>
        </div>`;

      setImmediate(() => {
        sendEmail({ to: adminEmail, subject: `Payment Reminder: ${title} due on ${reminderStr}`, htmlBody: html });
      });

      // Mark reminder sent
      for (const item of items) {
        const idx = entries.findIndex(e => e.id === item.id);
        if (idx !== -1) { entries[idx].reminderSent = true; modified = true; }
      }
    }

    if (modified) saveTaxPayments(entries);
  } catch (err) {
    console.error('Error running checkTaxReminders:', err);
  }
}

// Local JSON: read bookings
function getBookings() {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) {
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
    }
    const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading bookings:', err);
    return [];
  }
}

// Local JSON: save bookings
function saveBookings(bookings) {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing bookings:', err);
    return false;
  }
}

// Convert "HH:MM" to minutes from midnight
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Generate all date strings in the range [startDateStr, endDateStr] in a timezone-safe local manner
function getDatesInRange(startDateStr, endDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Check time overlap across the requested date range
function checkConflict(newBooking, existingBookings) {
  const newStart = newBooking.startDate || newBooking.date;
  const newEnd = newBooking.endDate || newBooking.date;

  // Validate dates
  if (new Date(newStart + 'T00:00:00') > new Date(newEnd + 'T00:00:00')) {
    return 'End date must be on or after start date.';
  }

  const requestedDates = getDatesInRange(newStart, newEnd);

  for (const date of requestedDates) {
    const sameDateBookings = existingBookings.filter(b => {
      // Only check conflicts against confirmed bookings (or legacy bookings without status)
      if (b.status && b.status !== 'confirmed') return false;
      const bStart = b.startDate || b.date;
      const bEnd = b.endDate || b.date;
      return date >= bStart && date <= bEnd;
    });

    // If there's already a full day booking on this date, conflict!
    if (sameDateBookings.some(b => b.bookingType === 'full')) {
      return `The room is already booked for the entire day on ${date}.`;
    }

    // If new booking is full day, there must be NO other bookings on this day
    if (newBooking.bookingType === 'full' && sameDateBookings.length > 0) {
      return `The room has existing bookings on ${date} and cannot be booked for the full day.`;
    }

    // Check overlap for time-slot bookings
    if (newBooking.bookingType === 'time') {
      const newTimeStart = timeToMinutes(newBooking.startTime);
      const newTimeEnd = timeToMinutes(newBooking.endTime);

      if (newTimeStart >= newTimeEnd) {
        return 'End time must be after start time.';
      }

      for (const b of sameDateBookings) {
        if (b.bookingType === 'full') {
          return `The room is already booked for the entire day on ${date}.`;
        }
        if (b.bookingType === 'time') {
          const bTimeStart = timeToMinutes(b.startTime);
          const bTimeEnd = timeToMinutes(b.endTime);

          // Overlap condition: startA < endB and endA > startB
          if (newTimeStart < bTimeEnd && newTimeEnd > bTimeStart) {
            return `Time slot conflicts with an existing booking on ${date}: ${b.startTime} - ${b.endTime} (${b.name})`;
          }
        }
      }
    }
  }

  return null; // No conflict
}

// Send email using PowerShell Send-MailMessage (handles Windows environment natively)
function sendEmailViaPowershell(to, subject, bodyHtml) {
  return new Promise((resolve, reject) => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'bookings@example.com';

    // Check if SMTP is configured
    if (!smtpHost) {
      console.log('SMTP host not configured. Email sending skipped.');
      resolve({ logged: true });
      return;
    }

    // If running on Linux/Cloud (e.g., Google Cloud Run), use Nodemailer instead of PowerShell
    if (process.platform !== 'win32') {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort) || 587,
          secure: parseInt(smtpPort) === 465,
          auth: (smtpUser && smtpPass) ? { user: smtpUser, pass: smtpPass } : undefined,
          tls: { rejectUnauthorized: true }
        });
        transporter.sendMail({
          from: smtpFrom,
          to: to,
          subject: subject,
          html: bodyHtml
        }, (err, info) => {
          if (err) {
            console.error('Nodemailer Send Error:', err);
            reject(err);
          } else {
            console.log(`Nodemailer email sent successfully to: ${to}`);
            resolve({ sent: true });
          }
        });
        return;
      } catch (e) {
        console.error('Nodemailer fallback failed:', e);
        reject(e);
        return;
      }
    }

    // Write HTML content to a temporary file to avoid command-line escaping errors
    const tempFile = path.join(__dirname, `temp_mail_${Date.now()}.html`);
    fs.writeFileSync(tempFile, bodyHtml, 'utf8');

    // BACK-M1: Write all config parameters to a JSON file to prevent PowerShell injection
    const jsonFile = path.join(__dirname, `temp_mail_config_${Date.now()}.json`);
    const configData = {
      to,
      subject,
      tempFile,
      smtpHost,
      smtpPort: parseInt(smtpPort) || 25,
      smtpFrom,
      smtpUser: smtpUser || '',
      smtpPass: smtpPass || ''
    };
    fs.writeFileSync(jsonFile, JSON.stringify(configData), 'utf8');

    // Build the PowerShell command
    const psCommand = `
$config = Get-Content "${jsonFile}" -Raw | ConvertFrom-Json
$to = $config.to
$subject = $config.subject
$body = Get-Content $config.tempFile -Raw
$smtpHost = $config.smtpHost
$smtpPort = $config.smtpPort
$from = $config.smtpFrom

if ($config.smtpUser -and $config.smtpPass) {
  $secpasswd = ConvertTo-SecureString $config.smtpPass -AsPlainText -Force
  $creds = New-Object System.Management.Automation.PSCredential ($config.smtpUser, $secpasswd)
  Send-MailMessage -To $to -From $from -Subject $subject -Body $body -BodyAsHtml -SmtpServer $smtpHost -Port $smtpPort -Credential $creds -UseSsl
} else {
  Send-MailMessage -To $to -From $from -Subject $subject -Body $body -BodyAsHtml -SmtpServer $smtpHost -Port $smtpPort
}
`;

    // Encode in Base64 UTF-16LE for safety in execution
    const psBase64 = Buffer.from(psCommand, 'utf16le').toString('base64');
    
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${psBase64}`, (err, stdout, stderr) => {
      // Cleanup temp files
      try { fs.unlinkSync(tempFile); } catch (e) {}
      try { fs.unlinkSync(jsonFile); } catch (e) {}

      if (err) {
        console.error('PowerShell Mail Send Error:', stderr);
        reject(err);
      } else {
        console.log(`PowerShell email sent successfully to: ${to}`);
        resolve({ sent: true });
      }
    });
  });
}

// Log mock email content locally
function logMockEmail(to, subject, html) {
  const timestamp = new Date().toISOString();
  const logMessage = `
========================================
[MOCK EMAIL SENT] Time: ${timestamp}
To: ${to}
Subject: ${subject}
----------------------------------------
HTML Content:
${html}
========================================
\n`;
  fs.appendFileSync(MOCK_EMAIL_FILE, logMessage, 'utf8');
  console.log(`[MOCK EMAIL] Email logged in mock_emails.log for: ${to}`);
}

// Send email notifications to user and admin
// Send email notifications to user and admin
async function sendEmailNotification(booking, host) {
  setImmediate(async () => {
    try {
      loadEnv(); // Reload env dynamically so SMTP updates take effect immediately
      const foodText = booking.food === 'none' 
        ? 'No Food' 
        : `${booking.food === 'others' ? `Other (${booking.foodSpecify})` : booking.food} (Count: ${booking.foodCount})`;

      const timeText = booking.bookingType === 'full' 
        ? 'Full Day' 
        : `${booking.startTime} to ${booking.endTime}`;

      const start = booking.startDate || booking.date;
      const end = booking.endDate || booking.date;
      const dateText = start === end ? start : `${start} to ${end}`;

      const emailSubject = `Conference Room Booked: ${dateText} (${timeText})`;
      
      const emailHtml = `
        <div style="font-family: Calibri, Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; color: #000000; line-height: 1.5; font-size: 15px;">
          <p style="margin-bottom: 15px;">Dear ${booking.name},</p>
          <p style="margin-bottom: 20px;">Your request for the conference room booking has been received, and the room has been successfully reserved.</p>
          
          <p style="margin-bottom: 8px; font-weight: bold;">Booking Details:</p>
          <ul style="list-style-type: none; padding-left: 15px; margin-top: 0; margin-bottom: 25px;">
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Booking Person Name: ${booking.name}</li>
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Date: ${dateText}</li>
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Time: ${timeText}</li>
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Meeting Purpose: ${booking.reason}</li>
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Food Requirement: ${foodText}</li>
          </ul>
          
          <p style="margin-bottom: 5px; font-weight: bold;">Important Note:</p>
          <p style="margin-top: 0; margin-bottom: 25px;">After completing the meeting, kindly ensure that the lights, AC, and TV are switched off. Also, please remove any meeting-related papers or chat items/materials used during the meeting and do not leave any items in the storage unit.</p>
          
          <p style="margin-bottom: 10px;">The conference room has been blocked for the above-mentioned schedule.</p>
          <p style="margin-top: 0; margin-bottom: 20px;">In case of any further assistance , please feel free to contact us.</p>

          <div style="margin-top: 20px; border-top: 1px solid #dddddd; padding-top: 20px;">
            <p style="margin-top: 0; margin-bottom: 15px;">For cancellation of room Please click below</p>
            <a href="${host}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}" 
               style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">
              Cancel This Booking
            </a>
          </div>
        </div>
      `;

      // Always write mock emails first (for local debugging/receipts)
      logMockEmail(booking.email, emailSubject, emailHtml);
      logMockEmail(ADMIN_EMAIL, emailSubject, emailHtml);

      // If SMTP details exist, attempt sending real emails to user and admin
      if (process.env.SMTP_HOST) {
        try {
          await sendEmail({ to: booking.email, subject: emailSubject, htmlBody: emailHtml });
          await sendEmail({ to: ADMIN_EMAIL, subject: emailSubject, htmlBody: emailHtml });
        } catch (err) {
          console.error('SMTP sending failed, logged to mock_emails.log');
        }
      }
    } catch (e) {
      console.error('Background sendEmailNotification failed:', e);
    }
  });
}

// Send notification to Admin that a new booking is requested
async function sendBookingRequestToAdminNotification(booking, host) {
  setImmediate(async () => {
    try {
      const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
      const start = booking.startDate || booking.date;
      const end = booking.endDate || booking.date;
      const dateText = start === end ? start : `${start} to ${end}`;
      const subject = ` ACTION REQUIRED: New Conference Room Request - ${booking.name}`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">New Booking Request Submitted</h2>
          <p>Hello Admin,</p>
          <p>An employee has requested to book the conference room. Here are the booking details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 35%;">Requester Name:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Email Address:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.email}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Phone:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Date:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${dateText}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Timings:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${timeText}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Purpose / Reason:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${booking.reason}</td>
            </tr>
          </table>

          <p style="margin-top: 25px; text-align: center;">
            <a href="${host}/helpdesk-admin" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Open Admin Portal to Approve / Reject
            </a>
          </p>
        </div>
      `;

      // Log mock email locally
      logMockEmail(ADMIN_EMAIL, subject, htmlBody);

      // Send live email using our verified sendEmail utility!
      await sendEmail({ to: ADMIN_EMAIL, subject, htmlBody });
    } catch (e) {
      console.error('Background sendBookingRequestToAdminNotification failed:', e);
    }
  });
}

// Send approval & confirmation notification to Employee
async function sendBookingApprovalToEmployeeNotification(booking, host) {
  setImmediate(async () => {
    try {
      const foodText = booking.food === 'none' ? 'No Food' : `${booking.food} (Count: ${booking.foodCount})`;
      const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
      const start = booking.startDate || booking.date;
      const end = booking.endDate || booking.date;
      const dateText = start === end ? start : `${start} to ${end}`;
      const subject = ` Conference Room Booking Confirmed`;

      const htmlBody = `
        <div style="font-family: Calibri, Arial, sans-serif; max-width: 650px; margin: auto; padding: 20px; color: #000000; line-height: 1.5; font-size: 15px;">
          <p style="margin-bottom: 15px; font-weight: bold; color: #059669; font-size: 1.1rem;"> Your booking has been confirmed!</p>
          <p style="margin-bottom: 15px;">Dear ${booking.name},</p>
          <p style="margin-bottom: 20px;">Your request for the conference room booking has been reviewed and confirmed by the Admin team.</p>
          
          <p style="margin-bottom: 8px; font-weight: bold;">Confirmed Details:</p>
          <ul style="list-style-type: none; padding-left: 15px; margin-top: 0; margin-bottom: 25px;">
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Date: ${dateText}</li>
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Time: ${timeText}</li>
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Meeting Purpose: ${booking.reason}</li>
            <li style="margin-bottom: 6px;">&bull;&nbsp;&nbsp;Food Arrangement: ${foodText}</li>
          </ul>
          
          <p style="margin-bottom: 5px; font-weight: bold;">Important Meeting Rules:</p>
          <p style="margin-top: 0; margin-bottom: 25px;">After completing the meeting, kindly ensure that the lights, AC, and TV are switched off. Also, please remove any meeting-related papers or materials and do not leave any trash behind.</p>
          
          <div style="margin-top: 20px; border-top: 1px solid #dddddd; padding-top: 20px;">
            <p style="margin-top: 0; margin-bottom: 15px;">For cancellation of room Please click below</p>
            <a href="${host}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}" 
               style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">
              Cancel This Booking
            </a>
          </div>
        </div>
      `;

      logMockEmail(booking.email, subject, htmlBody);
      await sendEmail({ to: booking.email, subject, htmlBody });
    } catch (e) {
      console.error('Background sendBookingApprovalToEmployeeNotification failed:', e);
    }
  });
}

// Send rejection notification to Employee
async function sendBookingRejectionToEmployeeNotification(booking, reason) {
  setImmediate(async () => {
    try {
      const timeText = booking.bookingType === 'full' ? 'Full Day' : `${booking.startTime} to ${booking.endTime}`;
      const start = booking.startDate || booking.date;
      const end = booking.endDate || booking.date;
      const dateText = start === end ? start : `${start} to ${end}`;
      const subject = ` REJECTED: Conference Room Booking Request`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Booking Request Rejected</h2>
          <p>Dear ${booking.name},</p>
          <p>We regret to inform you that your request to book the conference room has been declined by the Admin team.</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #991b1b; display: block; margin-bottom: 5px;">Reason for Rejection:</strong>
            <span style="color: #7f1d1d;">${reason}</span>
          </div>

          <p style="margin-bottom: 8px; font-weight: bold;">Request Details:</p>
          <ul style="padding-left: 20px; margin-top: 0; margin-bottom: 20px; color: #4b5563;">
            <li style="margin-bottom: 5px;">Date: ${dateText}</li>
            <li style="margin-bottom: 5px;">Time: ${timeText}</li>
            <li style="margin-bottom: 5px;">Purpose: ${booking.reason}</li>
          </ul>
          
          <p style="color: #6b7280; font-size: 0.9rem; margin-top: 25px;">Please check the calendar page to find alternative available times or submit another request.</p>
        </div>
      `;

      logMockEmail(booking.email, subject, htmlBody);
      await sendEmail({ to: booking.email, subject, htmlBody });
    } catch (e) {
      console.error('Background sendBookingRejectionToEmployeeNotification failed:', e);
    }
  });
}

// Send email notifications for Help Desk Requests to user and admin
// Send email notification to Admin and user for a Help Desk Request submission
async function sendHelpdeskEmailNotification(request, host) {
  setImmediate(async () => {
    try {
      loadEnv();
      const catTitle = request.categoryTitle || request.category;
      const emailSubject = `Help Desk Request #${request.id}: ${catTitle}`;
      
      let detailsText = '';
      if (Array.isArray(request.items)) {
        detailsText = request.items.map(it => `<strong>${it.item}</strong> (Qty: ${it.quantity})`).join(', ');
      } else if (request.item) {
        detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
      } else {
        detailsText = request.exact_issue || 'N/A';
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">Avana Help Desk - Request #${request.id} Confirmation</h2>
          <p>Hello,</p>
          <p>Your help desk request has been successfully received by the Admin team. Here are the details of your submission:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 35%;">Service Request No:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #4f46e5;">#${request.id}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Category:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${catTitle}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Sub-Type / Priority:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.subcategory || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Floor:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.floor || 'N/A'}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Details / Issue:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${detailsText}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Remarks:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.remarks || 'None'}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Requested By:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.requester_name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.requester_email || 'N/A'}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Phone:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.requester_phone || 'N/A'}</td>
            </tr>
          </table>
          
          <p style="margin-top: 25px; font-size: 0.9em; color: #555; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            The Admin team is reviewing your request and will take action shortly.
          </p>
        </div>
      `;

      if (request.requester_email) {
        logMockEmail(request.requester_email, emailSubject, emailHtml);
      }
      logMockEmail(ADMIN_EMAIL, emailSubject, emailHtml);

      if (process.env.SMTP_HOST) {
        // Send emails in parallel
        const sends = [];
        if (request.requester_email) {
          sends.push(sendEmail({ to: request.requester_email, subject: emailSubject, htmlBody: emailHtml }));
        }
        sends.push(sendEmail({ to: ADMIN_EMAIL, subject: emailSubject, htmlBody: emailHtml }));
        await Promise.all(sends);
      }
    } catch (err) {
      console.error('Background sendHelpdeskEmailNotification failed:', err);
    }
  });
}

// Send email notification to employee when Help Desk Request is marked as completed
async function sendHelpdeskCompletionEmailNotification(request, host) {
  setImmediate(async () => {
    try {
      loadEnv();
      if (!request.requester_email) {
        console.log(`[EMAIL SKIPPED] No requester_email found for request #${request.id}`);
        return;
      }

      const catTitle = request.categoryTitle || request.category;
      const emailSubject = `Service Request #${request.id} Completed: ${catTitle}`;
      
      let detailsText = '';
      if (Array.isArray(request.items)) {
        detailsText = request.items.map(it => `<strong>${it.item}</strong> (Qty: ${it.quantity})`).join(', ');
      } else if (request.item) {
        detailsText = `${request.stationery_type || 'Item'}: <strong>${request.item}</strong> (Qty: ${request.quantity || 1})`;
      } else {
        detailsText = request.exact_issue || 'N/A';
      }

      const emailHtml = `
        <div style="font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff; color: #000000; line-height: 1.5; font-size: 15px;">
          <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-top: 0;">Avana Help Desk - Request #${request.id} Completed</h2>
          <p style="margin-bottom: 15px;">Dear ${request.requester_name || 'Employee'},</p>
          <p style="margin-bottom: 20px;">We are pleased to inform you that your service request (<strong>#${request.id}</strong>) has been successfully completed by the Admin team.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; font-size: 15px;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; width: 35%;">Service Request No:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #10b981;">#${request.id}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Category:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${catTitle}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Sub-Type / Priority:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.subcategory || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Floor:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.floor || 'N/A'}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Details / Issue:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${detailsText}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Remarks:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${request.remarks || 'None'}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Status:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #10b981;">Completed &#10004;</td>
            </tr>
          </table>
          
          <p style="margin-top: 0; margin-bottom: 10px;">In case of any further assistance , please feel free to contact us.</p>
        </div>
      `;

      logMockEmail(request.requester_email, emailSubject, emailHtml);

      if (process.env.SMTP_HOST) {
        try {
          await sendEmail({ to: request.requester_email, subject: emailSubject, htmlBody: emailHtml });
        } catch (err) {
          console.error('SMTP completion sending failed, logged to mock_emails.log');
        }
      }
    } catch (err) {
      console.error('Background sendHelpdeskCompletionEmailNotification failed:', err);
    }
  });
}

// Send SMS using Twilio HTTP REST API (dependency-free)
function sendTwilioSms(to, body) {
  return new Promise((resolve, reject) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.log('Twilio settings not fully configured. SMS sending skipped.');
      resolve({ logged: true });
      return;
    }

    const postData = querystring.stringify({
      To: to,
      From: fromNumber,
      Body: body
    });

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, res => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Twilio SMS successfully sent to: ${to}`);
          resolve(JSON.parse(resBody));
        } else {
          console.error(`Twilio SMS error code ${res.statusCode}: ${resBody}`);
          reject(new Error(resBody));
        }
      });
    });

    req.on('error', err => {
      console.error('Twilio SMS HTTPS Error:', err);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Log SMS locally
function logMockSms(to, body) {
  const timestamp = new Date().toISOString();
  const logMessage = `
========================================
[MOCK SMS SENT] Time: ${timestamp}
To: ${to}
Message: ${body}
========================================
\n`;
  fs.appendFileSync(MOCK_SMS_FILE, logMessage, 'utf8');
  console.log(`[MOCK SMS] SMS logged in mock_sms.log for: ${to}`);
}

// Send SMS notifications
// Send SMS notifications
async function sendSmsNotification(booking, host) {
  setImmediate(async () => {
    try {
      loadEnv(); // Reload env dynamically

      const timeText = booking.bookingType === 'full' 
        ? 'Full Day' 
        : `${booking.startTime} to ${booking.endTime}`;
      
      const start = booking.startDate || booking.date;
      const end = booking.endDate || booking.date;
      const dateText = start === end ? start : `${start} to ${end}`;
      
      const smsMessage = `Hi ${booking.name}, your conference room booking on ${dateText} (${timeText}) is confirmed. Reason: ${booking.reason}. Cancel link: ${host}/api/bookings/cancel?id=${booking.id}&email=${encodeURIComponent(booking.email)}`;

      logMockSms(booking.phone, smsMessage);

      if (process.env.TWILIO_ACCOUNT_SID) {
        await sendTwilioSms(booking.phone, smsMessage);
      }
    } catch (err) {
      console.error('Background sendSmsNotification failed:', err);
    }
  });
}

// Helper to read request body stream
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // BACK-Q4: Prevent memory exhaustion DoS (limit body to ~2MB)
      if (body.length > 2 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

// Helper to serve static files with correct MIME type
function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// BACK-Q5: Helper function to build AMC visit intervals dynamically
const buildVisitsList = (amcObj, prevObj = {}) => {
  const N = parseInt(amcObj.visitsPerYear) || 4;
  const start = new Date(amcObj.startDate);
  const end = new Date(amcObj.endDate);
  const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const intervalMonths = Math.max(1, Math.round(diffMonths / N));
  
  const visits = [];
  for (let i = 1; i <= N; i++) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + (i * intervalMonths));
    const scheduledD = d > end ? end : d;
    
    // Look up previous completion date for visit number i
    const prevVisit = prevObj.visits && prevObj.visits.find(v => v.visitNo === i);
    visits.push({
      visitNo: i,
      scheduledDate: scheduledD.toISOString().slice(0, 10),
      actualDate: prevVisit ? (prevVisit.actualDate || '') : '',
      status: prevVisit ? (prevVisit.status || 'Pending') : 'Pending'
    });
  }
  return visits;
};

// BACK-Q1: Reusable function to calculate stock audit for a single month
const calculateAuditForMonth = (stock, sortedLogs, month, overrides) => {
  const audit = {};
  Object.keys(stock).forEach(item => {
    audit[item] = { startingStock: 0, purchased: 0, used: 0, endingStock: 0 };
  });

  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const parts = month.split('-');
  const targetYear = parseInt(parts[0]);
  const targetMonth = parseInt(parts[1]);
  const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  const nextMonthNum = targetMonth === 12 ? 1 : targetMonth + 1;
  const nextMonthStr = nextMonthNum < 10 ? `0${nextMonthNum}` : `${nextMonthNum}`;
  const monthEnd = new Date(`${nextMonthYear}-${nextMonthStr}-01T00:00:00Z`);

  const itemStockAtStart = {};
  const itemStockAtEnd = {};
  const timelineStock = {};
  
  Object.keys(stock).forEach(item => {
    itemStockAtStart[item] = 0;
    itemStockAtEnd[item] = 0;
    timelineStock[item] = 0;
  });

  sortedLogs.forEach(log => {
    const logTime = new Date(log.timestamp);
    const logItem = log.item;
    if (timelineStock[logItem] === undefined) return;
    
    if (timelineStock[logItem] === 0 && log.previousStock !== 0) {
      timelineStock[logItem] = log.previousStock;
    }

    if (logTime < monthStart) {
      timelineStock[logItem] = log.newStock;
      itemStockAtStart[logItem] = log.newStock;
      itemStockAtEnd[logItem] = log.newStock;
    } else if (logTime >= monthStart && logTime < monthEnd) {
      if (itemStockAtStart[logItem] === 0 && log.previousStock !== 0) {
        itemStockAtStart[logItem] = log.previousStock;
      }
      if (log.type === 'purchase') {
        audit[logItem].purchased += log.quantity;
      } else if (log.type === 'use') {
        audit[logItem].used += log.quantity;
      }
      timelineStock[logItem] = log.newStock;
      itemStockAtEnd[logItem] = log.newStock;
    }
  });

  Object.keys(stock).forEach(item => {
    audit[item].startingStock = itemStockAtStart[item];
    audit[item].endingStock = itemStockAtEnd[item];
  });

  if (overrides && overrides[month]) {
    const monthOverrides = overrides[month];
    Object.keys(monthOverrides).forEach(item => {
      if (audit[item]) {
        const ov = monthOverrides[item];
        if (ov.startingStock !== undefined) audit[item].startingStock = ov.startingStock;
        if (ov.purchased !== undefined) audit[item].purchased = ov.purchased;
        if (ov.used !== undefined) audit[item].used = ov.used;
        if (ov.endingStock !== undefined) audit[item].endingStock = ov.endingStock;
      }
    });
  }

  return audit;
};

// HTTP Server
const server = http.createServer(async (req, res) => {
  // BACK-H4: Add standard security headers to all responses
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:");

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Set CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Routes ---

  // GET /api/bookings (returns bookings for display - sanitized)
  if (pathname === '/api/bookings' && req.method === 'GET') {
    const bookings = await getBookingsDB();
    const sanitized = bookings.map(b => ({
      id: b.id,
      date: b.date,
      startDate: b.startDate || b.date,
      endDate: b.endDate || b.date,
      bookingType: b.bookingType,
      startTime: b.startTime,
      endTime: b.endTime,
      name: b.name
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sanitized));
    return;
  }

  // GET /api/bookings/cancel (cancel booking via email link)
  if (pathname === '/api/bookings/cancel' && req.method === 'GET') {
    const id = parsedUrl.searchParams.get('id');
    const email = parsedUrl.searchParams.get('email');

    if (!id || !email) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; text-align: center; padding-top: 10%;">
          <h1 style="color: #ef4444;">Invalid Request</h1>
          <p>Missing booking ID or email address parameter.</p>
        </body>
        </html>
      `);
      return;
    }

    let bookings = await getBookingsDB();
    const index = bookings.findIndex(b => b.id === id && b.email.toLowerCase() === email.toLowerCase());

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; text-align: center; padding-top: 10%;">
          <h1 style="color: #ef4444;">Booking Not Found</h1>
          <p>No active booking matched the provided details or it has already been cancelled.</p>
          <a href="/" style="color: #4f46e5; text-decoration: none; font-weight: bold;">Back to Calendar</a>
        </body>
        </html>
      `);
      return;
    }

    const cancelledBooking = bookings[index];

    // Check if the meeting is already over
    const endDateTimeStr = `${cancelledBooking.endDate || cancelledBooking.date}T${cancelledBooking.endTime || '23:59'}:00`;
    const meetingEndTime = new Date(endDateTimeStr);
    if (new Date() > meetingEndTime) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; text-align: center; padding-top: 10%;">
          <div style="background-color: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 2.5rem; display: inline-block; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
            <h1 style="color: #f59e0b; margin-bottom: 1rem;">Meeting Already Completed</h1>
            <p style="color: #9ca3af; margin-bottom: 1.5rem; font-size: 1.1rem;">The meeting scheduled for <strong>${cancelledBooking.date} (${cancelledBooking.startTime || '00:00'} - ${cancelledBooking.endTime || '23:59'})</strong> is already over.</p>
            <p style="color: #e5e7eb; margin-bottom: 2rem; font-size: 1.05rem;">Click below to book the room for a new date.</p>
            <a href="/" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 1rem;">Book the Room</a>
          </div>
        </body>
        </html>
      `);
      return;
    }

    bookings.splice(index, 1);

    if (await saveBookingsDB(bookings)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; text-align: center; padding-top: 10%;">
          <div style="background-color: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 2.5rem; display: inline-block; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
            <h1 style="color: #10b981; margin-bottom: 1rem;">Booking Cancelled Successfully</h1>
            <p style="color: #9ca3af; margin-bottom: 1.5rem;">Your reservation for the date <strong>${cancelledBooking.date}</strong> has been cancelled and the room is now available.</p>
            <a href="/" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Back to Calendar</a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; text-align: center; padding-top: 10%;">
          <h1 style="color: #ef4444;">Server Error</h1>
          <p>Failed to update the booking database. Please try again later.</p>
        </body>
        </html>
      `);
    }
    return;
  }

  // POST /api/bookings (create a new booking)
  if (pathname === '/api/bookings' && req.method === 'POST') {
    try {
      const bodyText = await getRequestBody(req);
      const data = JSON.parse(bodyText);

      const { name, email, phone, startDate, endDate, bookingType, startTime, endTime, reason, attendees, remarks, food, foodSpecify, foodCount } = data;

      const sDate = startDate || data.date;
      const eDate = endDate || data.date || sDate;

      // BACK-M4: Format validation on required booking fields
      if (!name || !email || !phone || !sDate || !eDate || !bookingType || !reason || !attendees) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Please fill in all required fields (Name, Email, Phone, Start Date, End Date, Type, Reason, and Attendees).' }));
        return;
      }
      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRx.test(email)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
        return;
      }
      const phoneRx = /^\+?[\d\s\-().]{7,20}$/;
      if (!phoneRx.test(phone)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Please enter a valid phone number.' }));
        return;
      }
      const dateRx = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRx.test(sDate) || !dateRx.test(eDate) || isNaN(Date.parse(sDate)) || isNaN(Date.parse(eDate))) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD.' }));
        return;
      }
      if (new Date(eDate) < new Date(sDate)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'End date cannot be before start date.' }));
        return;
      }

      if (bookingType === 'time' && (!startTime || !endTime)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Start and End times are required for time-slot bookings.' }));
        return;
      }

      const bookings = await getBookingsDB();

      const newBooking = {
        id: crypto.randomUUID(), // BACK-M3: Predictable ID fixed
        name,
        email,
        phone,
        date: sDate,
        startDate: sDate,
        endDate: eDate,
        bookingType,
        startTime: bookingType === 'full' ? '00:00' : startTime,
        endTime: bookingType === 'full' ? '23:59' : endTime,
        reason,
        attendees,
        remarks: remarks || '',
        food: food || 'none',
        foodSpecify: food === 'others' ? foodSpecify : '',
        foodCount: food !== 'none' ? parseInt(foodCount) || 1 : 0,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      const conflictError = checkConflict(newBooking, bookings);
      if (conflictError) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: conflictError }));
        return;
      }

      bookings.push(newBooking);
      if (await saveBookingsDB(bookings)) {
        let base = process.env.BASE_URL;
        if (!base) {
          const host = req.headers.host || `localhost:${PORT}`;
          base = `http://${host}`;
        }
        
        // Notify ADMIN only on initial request submission
        sendBookingRequestToAdminNotification(newBooking, base).catch(err => console.error('Admin booking alert failed:', err));

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Booking request submitted for Admin approval.', booking: newBooking }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database save failure.' }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON request payload.' }));
    }
    return;
  }

  // DELETE /api/admin/logout
  if (pathname === '/api/admin/logout' && req.method === 'DELETE') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (mongoSessionsCollection) await mongoSessionsCollection.deleteOne({ token }).catch(()=>{});
      adminSessions.delete(token);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Logged out successfully.' }));
    return;
  }

  // POST /api/admin/login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    loadEnv(); // Reload env dynamically
    // BACK-H2: Rate limit admin login  max 10 attempts per IP per 15 minutes
    const loginIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    if (isRateLimited(loginIp, 'admin-login', 10, 15 * 60 * 1000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many login attempts. Please wait 15 minutes and try again.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { password } = JSON.parse(bodyText);

      // BACK-H3: PBKDF2 hash comparison for admin login
      let isMatch = false;
      const currentHash = process.env.ADMIN_PASSWORD_HASH || '';
      const parts = currentHash.split(':');
      if (parts.length === 2) {
        const salt = parts[0];
        const hash = parts[1];
        const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        isMatch = (derivedKey === hash);
      }

      if (isMatch) {
        // Generate cryptographically secure random session token (32-byte hex)
        const token = crypto.randomBytes(32).toString('hex');
        if (mongoSessionsCollection) {
          await mongoSessionsCollection.updateOne({ token }, { $set: { token, timestamp: Date.now() } }, { upsert: true }).catch(() => {});
        } else {
          adminSessions.set(token, Date.now());
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, token }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Incorrect password.' }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request payload.' }));
    }
    return;
  }

  // POST /api/admin/forgot-password (public)
  if (pathname === '/api/admin/forgot-password' && req.method === 'POST') {
    try {
      const bodyText = await getRequestBody(req);
      const { email } = JSON.parse(bodyText);
      if (!email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email is required.' }));
        return;
      }
      
      const adminEmail = process.env.ADMIN_EMAIL || 'Karthicksankar@avanamedical.com';
      if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Incorrect administrator email.' }));
        return;
      }

      // Generate secure 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      adminResetOTP = {
        code: otp,
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
      };

      // Email the OTP code
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px;">
          <h2 style="color: #1e3a8a; margin-top: 0;">Admin Password Reset Request</h2>
          <p>You requested a password reset for the Admin Portal. Please use the following 6-digit verification code to reset your password:</p>
          <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 5px; color: #1e3a8a; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please secure your credentials immediately.</p>
        </div>
      `;

      console.log(`============================================`);
      console.log(`[ADMIN OTP] Sent reset code to: ${adminEmail}`);
      console.log(`[ADMIN OTP] CODE: ${otp}`);
      console.log(`============================================`);

      try {
        await sendEmail({
          to: adminEmail,
          subject: 'Admin Password Reset Verification Code',
          htmlBody
        });
      } catch (mailErr) {
        // Fallback PowerShell notification if nodemailer fails
        try {
          sendEmailViaPowershell(adminEmail, 'Admin Password Reset Verification Code', htmlBody);
        } catch(psErr) {
          console.error('[ADMIN OTP] Failed to send email fallback:', psErr);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Verification code sent to admin email.' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request.' }));
    }
    return;
  }

  // POST /api/admin/reset-password (public)
  if (pathname === '/api/admin/reset-password' && req.method === 'POST') {
    try {
      const bodyText = await getRequestBody(req);
      const { otp, newPassword } = JSON.parse(bodyText);

      if (!otp || !newPassword) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Verification code and new password are required.' }));
        return;
      }

      if (newPassword.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 6 characters.' }));
        return;
      }

      if (!adminResetOTP || Date.now() > adminResetOTP.expires || adminResetOTP.code !== otp.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or expired verification code.' }));
        return;
      }

      // Generate new PBKDF2 hash
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newHashKey = crypto.pbkdf2Sync(newPassword, newSalt, 100000, 64, 'sha512').toString('hex');
      const newHash = `${newSalt}:${newHashKey}`;

      updateEnvValue('ADMIN_PASSWORD_HASH', newHash);
      adminResetOTP = null; // Clear OTP state

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Admin password reset successfully!' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request.' }));
    }
    return;
  }

  // POST /api/admin/change-password (secure)
  if (pathname === '/api/admin/change-password' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { currentPassword, newPassword } = JSON.parse(bodyText);
      if (!currentPassword || !newPassword) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Current password and new password are required.' }));
        return;
      }
      
      // Verify current password
      let isMatch = false;
      const currentHash = process.env.ADMIN_PASSWORD_HASH || '';
      const parts = currentHash.split(':');
      if (parts.length === 2) {
        const salt = parts[0];
        const hash = parts[1];
        const derivedKey = crypto.pbkdf2Sync(currentPassword, salt, 100000, 64, 'sha512').toString('hex');
        isMatch = (derivedKey === hash);
      }

      if (!isMatch) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Incorrect current password.' }));
        return;
      }

      // Hash and update the new password
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newHashKey = crypto.pbkdf2Sync(newPassword, newSalt, 100000, 64, 'sha512').toString('hex');
      const newHash = `${newSalt}:${newHashKey}`;
      
      updateEnvValue('ADMIN_PASSWORD_HASH', newHash);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Password changed successfully.' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request payload.' }));
    }
    return;
  }

  // POST /api/admin/change-smtp-password (secure)
  if (pathname === '/api/admin/change-smtp-password' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { newSmtpPass } = JSON.parse(bodyText);
      if (!newSmtpPass) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'New SMTP password is required.' }));
        return;
      }
      
      updateEnvValue('SMTP_PASS', newSmtpPass);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'SMTP/Outlook email password updated successfully.' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request payload.' }));
    }
    return;
  }

  // GET /api/admin/bookings (secure)
  if (pathname === '/api/admin/bookings' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }

    const bookings = await getBookingsDB();
    const sorted = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sorted));
    return;
  }

  // DELETE /api/admin/bookings/:id (secure)
  if (pathname.startsWith('/api/admin/bookings/') && req.method === 'DELETE') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }

    const parts = pathname.split('/');
    const id = parts[parts.length - 1];

    let bookings = await getBookingsDB();
    const index = bookings.findIndex(b => b.id === id);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Booking not found.' }));
      return;
    }

    bookings.splice(index, 1);
    if (await saveBookingsDB(bookings)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Booking deleted successfully.' }));
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete booking.' }));
    }
    return;
  }

  // POST /api/helpdesk  submit a new help desk request
  if (pathname === '/api/helpdesk' && req.method === 'POST') {
    try {
      const bodyText = await getRequestBody(req);
      const data = JSON.parse(bodyText);
      if (!data.category || !data.requester_name || !data.requester_phone) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields.' }));
        return;
      }
      
      const phoneRx = /^\+?[\d\s\-().]{7,20}$/;
      if (!phoneRx.test(data.requester_phone)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Please enter a valid phone number.' }));
        return;
      }

      if (data.requester_email) {
        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(data.requester_email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
          return;
        }
      }
      const requests = await getHelpdeskRequests();
      let maxNum = 0;
      for (const r of requests) {
        const match = String(r.id).match(/^(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num < 10000 && num > maxNum) maxNum = num;
        }
      }
      data.id = String(maxNum + 1).padStart(2, '0');
      data.submittedAt = new Date().toISOString();
      data.status = 'pending';
      requests.push(data);
      if (await saveHelpdeskRequests(requests)) {
        const host = (req.headers['x-forwarded-proto'] || 'http') + '://' + req.headers.host;
        sendHelpdeskEmailNotification(data, host);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Request submitted successfully.', id: data.id }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save request.' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request payload.' }));
    }
    return;
  }

  // GET /api/helpdesk/counts  public: count of requests per category (for home page badges)
  if (pathname === '/api/helpdesk/counts' && req.method === 'GET') {
    const requests = await getHelpdeskRequests();
    const bookings = await getBookingsDB();
    const counts = {};
    requests.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    counts['conference'] = bookings.length;
    counts.total = requests.length + bookings.length;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(counts));
    return;
  }

  // GET /api/helpdesk  get all requests (admin only)
  if (pathname === '/api/helpdesk' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const requests = await getHelpdeskRequests();
    const bookings = await getBookingsDB();
    const conferenceRequests = bookings.map(b => ({
      id: b.id,
      category: 'conference',
      categoryTitle: 'Conference Room Booking',
      submittedAt: b.submittedAt || new Date(b.startDate || b.date).toISOString(),
      subcategory: b.bookingType === 'full' ? 'Full Day' : `${b.startTime} - ${b.endTime}`,
      floor: 'Conference Room',
      exact_issue: `Reason: ${b.reason || 'N/A'} | Date: ${b.startDate || b.date}` + (b.endDate && b.endDate !== b.startDate ? ` to ${b.endDate}` : '') + (b.attendees ? ` | Attendees: ${b.attendees}` : '') + (b.food && b.food !== 'none' ? ` | Food: ${b.food}` : ''),
      reason: b.reason || 'N/A',
      attendees: b.attendees || 'None',
      food: b.food || 'none',
      foodCount: b.foodCount || 0,
      foodSpecify: b.foodSpecify || '',
      startDate: b.startDate || b.date,
      endDate: b.endDate || b.date,
      remarks: b.remarks || 'None',
      status: b.status || 'pending',
      requester_name: b.name,
      requester_phone: b.phone || b.email
    }));
    const allCombined = [...requests, ...conferenceRequests];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(allCombined));
    return;
  }

  // PATCH /api/helpdesk/status  mark request/booking as completed or pending (admin only)
  if (pathname === '/api/helpdesk/status' && req.method === 'PATCH') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const parsedBody = JSON.parse(bodyText);
      const { id, category, status, rejectionReason, remarks } = parsedBody;
      if (!id || !status) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing id or status.' }));
        return;
      }
      if (category === 'conference') {
        let bookings = await getBookingsDB();
        const b = bookings.find(item => item.id === id);
        if (b) {
          b.status = status;

          if (status === 'rejected') {
            b.rejectionReason = rejectionReason || 'No reason provided.';
          }

          await saveBookingsDB(bookings);

          let base = process.env.BASE_URL;
          if (!base) {
            const host = req.headers.host || `localhost:${PORT}`;
            base = `http://${host}`;
          }

          // Send employee confirmation / rejection emails based on Admin action
          if (status === 'confirmed') {
            sendBookingApprovalToEmployeeNotification(b, base).catch(err => console.error('Approval dispatch failed:', err));
          } else if (status === 'rejected') {
            sendBookingRejectionToEmployeeNotification(b, b.rejectionReason).catch(err => console.error('Rejection dispatch failed:', err));
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Status updated successfully.' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Booking not found.' }));
        }
      } else {
        let requests = await getHelpdeskRequests();
        const r = requests.find(item => item.id === id);
        if (r) {
          // Deduct stock if marking stationery request as completed for the first time
          if (r.category === 'stationery' && r.status !== 'completed' && status === 'completed') {
            if (Array.isArray(r.items)) {
              const stock = await getStationeryStock();
              for (const singleItem of r.items) {
                const reqItem = singleItem.item;
                const reqQty = parseInt(singleItem.quantity) || 1;
                if (reqItem && stock[reqItem] !== undefined) {
                  const prev = stock[reqItem];
                  stock[reqItem] = Math.max(0, stock[reqItem] - reqQty);
                  await logStationeryTransaction(reqItem, 'use', reqQty, prev, stock[reqItem]);
                  console.log(`[Inventory] Auto-deducted multiple: ${reqQty} of "${reqItem}". New stock: ${stock[reqItem]}`);
                  await checkLowStockAlert(reqItem, stock[reqItem]);
                }
              }
              await saveStationeryStock(stock);
            } else {
              const reqItem = r.item;
              const reqQty = parseInt(r.quantity) || 1;
              if (reqItem) {
                const stock = await getStationeryStock();
                if (stock[reqItem] !== undefined) {
                  const prev = stock[reqItem];
                  stock[reqItem] = Math.max(0, stock[reqItem] - reqQty);
                  await saveStationeryStock(stock);
                  await logStationeryTransaction(reqItem, 'use', reqQty, prev, stock[reqItem]);
                  console.log(`[Inventory] Auto-deducted legacy: ${reqQty} of "${reqItem}". New stock: ${stock[reqItem]}`);
                  await checkLowStockAlert(reqItem, stock[reqItem]);
                }
              }
            }
          }
          if (remarks !== undefined && remarks !== null && remarks.trim() !== '') {
            r.remarks = r.remarks ? `${r.remarks} | Admin: ${remarks.trim()}` : remarks.trim();
          }
          r.status = status;
          await saveHelpdeskRequests(requests);

          if (status === 'completed') {
            let base = process.env.BASE_URL;
            if (!base) {
              const host = req.headers.host || `localhost:${PORT}`;
              base = `http://${host}`;
            }
            sendHelpdeskCompletionEmailNotification(r, base).catch(err => console.error('Completion email error:', err));
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Status updated successfully.' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request not found.' }));
        }
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // DELETE /api/helpdesk?id=<id>&category=<category>  delete request/booking (admin only)
  if (pathname === '/api/helpdesk' && req.method === 'DELETE') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const id = parsedUrl.searchParams.get('id');
    const category = parsedUrl.searchParams.get('category');
    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing request ID.' }));
      return;
    }
    if (category === 'conference') {
      let bookings = await getBookingsDB();
      const initialLen = bookings.length;
      bookings = bookings.filter(b => b.id !== id);
      if (bookings.length < initialLen) {
        await saveBookingsDB(bookings);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Conference booking deleted successfully.' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Booking not found.' }));
      }
    } else {
      let requests = await getHelpdeskRequests();
      const initialLen = requests.length;
      requests = requests.filter(r => r.id !== id);
      if (requests.length < initialLen) {
        await saveHelpdeskRequests(requests);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Help desk request deleted successfully.' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request not found.' }));
      }
    }
    return;
  }

  // GET /api/admin/stationery-stock  get all stationery items with stock level
  if (pathname === '/api/admin/stationery-stock' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const stock = await getStationeryStock();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stock));
    return;
  }

  // POST /api/admin/stationery-stock  add/update stock level for a specific item
  if (pathname === '/api/admin/stationery-stock' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { item, quantity } = JSON.parse(bodyText);
      if (!item || quantity === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing item or quantity.' }));
        return;
      }
      const stock = await getStationeryStock();
      const prev = stock[item] !== undefined ? stock[item] : 0;
      const target = parseInt(quantity) || 0;
      stock[item] = target;
      await saveStationeryStock(stock);
      if (target !== prev) {
        const type = target > prev ? 'purchase' : 'use';
        const diff = Math.abs(target - prev);
        await logStationeryTransaction(item, type, diff, prev, target);
        
        // Only alert if target is less than prev (meaning stock was reduced)
        if (target < prev) {
          await checkLowStockAlert(item, target);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Stock updated successfully.', stock }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // GET /api/admin/stationery-audit  get monthly auditing records for YYYY-MM
  if (pathname === '/api/admin/stationery-audit' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const month = parsedUrl.searchParams.get('month'); // e.g. "2026-06"
    if (!month) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing month parameter.' }));
      return;
    }

    try {
      const stock = await getStationeryStock();
      const logs = await getStationeryTransactions();
      const overrides = await getAuditOverrides();
      const sortedLogs = [...logs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const audit = calculateAuditForMonth(stock, sortedLogs, month, overrides);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(audit));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Audit calculation failed.' }));
    }
    return;
  }

  // POST /api/admin/stationery-audit/override  save manual overrides for a specific item and month
  if (pathname === '/api/admin/stationery-audit/override' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { month, item, startingStock, purchased, used, endingStock } = JSON.parse(bodyText);
      if (!month || !item) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing month or item.' }));
        return;
      }
      const overrides = await getAuditOverrides();
      if (!overrides[month]) {
        overrides[month] = {};
      }
      overrides[month][item] = {
        startingStock: parseInt(startingStock) || 0,
        purchased: parseInt(purchased) || 0,
        used: parseInt(used) || 0,
        endingStock: parseInt(endingStock) || 0
      };
      await saveAuditOverrides(overrides);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Audit overrides saved successfully.', overrides: overrides[month] }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // GET /api/employee/stationery-items  get active items catalog
  if (pathname === '/api/employee/stationery-items' && req.method === 'GET') {
    const catalog = await getStationeryCatalog();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(catalog));
    return;
  }

  // POST /api/admin/stationery-items  add a new item type
  if (pathname === '/api/admin/stationery-items' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { item, type, initialStock } = JSON.parse(bodyText);
      if (!item || !type) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing item name or type.' }));
        return;
      }
      const catalog = await getStationeryCatalog();
      const itemClean = item.trim();
      if (catalog[itemClean]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Item already exists.' }));
        return;
      }
      
      // Add to catalog
      catalog[itemClean] = type === 'printing' ? 'printing' : 'stationery';
      await saveStationeryCatalog(catalog);
      
      // Add to stock
      const stock = await getStationeryStock();
      const qty = parseInt(initialStock) || 0;
      stock[itemClean] = qty;
      await saveStationeryStock(stock);
      
      // Log transaction for initial stock if > 0
      if (qty > 0) {
        await logStationeryTransaction(itemClean, 'purchase', qty, 0, qty);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Item added successfully.', catalog }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // GET /api/admin/housekeeping-stock  get all housekeeping items with stock level
  if (pathname === '/api/admin/housekeeping-stock' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const stock = await getHousekeepingStock();
    const catalog = await getHousekeepingCatalog();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stock, catalog }));
    return;
  }

  // POST /api/admin/housekeeping-stock  adjust stock level
  if (pathname === '/api/admin/housekeeping-stock' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { item, quantity, actionType } = JSON.parse(bodyText); // "purchase" or "use" or "set"
      if (!item || quantity === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing item or quantity.' }));
        return;
      }
      const stock = await getHousekeepingStock();
      const prev = stock[item] !== undefined ? stock[item] : 0;
      const qty = parseInt(quantity) || 0;
      
      let target = prev;
      
      if (actionType === 'purchase') {
        target = prev + qty;
      } else if (actionType === 'use') {
        target = Math.max(0, prev - qty);
      } else {
        target = qty;
      }
      
      stock[item] = target;
      await saveHousekeepingStock(stock);
      
      if (target !== prev) {
        const diff = Math.abs(target - prev);
        const logType = target > prev ? 'purchase' : 'use';
        await logHousekeepingTransaction(item, logType, diff, prev, target);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Housekeeping stock updated successfully.', stock }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // POST /api/admin/housekeeping-items  add a new housekeeping item type
  if (pathname === '/api/admin/housekeeping-items' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { item, initialStock } = JSON.parse(bodyText);
      if (!item) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing item name.' }));
        return;
      }
      const catalog = await getHousekeepingCatalog();
      const itemClean = item.trim();
      if (catalog.includes(itemClean)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Item already exists.' }));
        return;
      }
      
      // Add to catalog
      catalog.push(itemClean);
      fs.writeFileSync(HOUSEKEEPING_CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf8');
      
      // Add to stock
      const stock = await getHousekeepingStock();
      const qty = parseInt(initialStock) || 0;
      stock[itemClean] = qty;
      await saveHousekeepingStock(stock);
      
      // Log transaction for initial stock if > 0
      if (qty > 0) {
        await logHousekeepingTransaction(itemClean, 'purchase', qty, 0, qty);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Housekeeping item added successfully.', catalog }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // GET /api/admin/housekeeping-audit  get range-based auditing records
  if (pathname === '/api/admin/housekeeping-audit' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const startMonth = parsedUrl.searchParams.get('startMonth');
    const endMonth = parsedUrl.searchParams.get('endMonth');
    if (!startMonth || !endMonth) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing startMonth or endMonth.' }));
      return;
    }

    try {
      const stock = await getHousekeepingStock();
      const logs = await getHousekeepingTransactions();
      const overrides = await getHousekeepingOverrides();
      
      // Find list of months in the range
      const months = [];
      let curr = new Date(startMonth + '-02'); // Add buffer to avoid time zone shifts
      const last = new Date(endMonth + '-02');
      while (curr <= last) {
        months.push(curr.toISOString().slice(0, 7));
        curr.setMonth(curr.getMonth() + 1);
      }

      const auditReport = {}; // month -> item -> metrics
      const sortedLogs = [...logs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Loop through each month and run the ledger calculation
      months.forEach(month => {
        auditReport[month] = calculateAuditForMonth(stock, sortedLogs, month, overrides);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(auditReport));
    } catch (e) {
      console.error(e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Housekeeping audit calculation failed.' }));
    }
    return;
  }

  // POST /api/admin/housekeeping-audit/override  save manual overrides for a specific item and month
  if (pathname === '/api/admin/housekeeping-audit/override' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { month, item, startingStock, purchased, used, endingStock } = JSON.parse(bodyText);
      if (!month || !item) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing month or item.' }));
        return;
      }
      const overrides = await getHousekeepingOverrides();
      if (!overrides[month]) {
        overrides[month] = {};
      }
      overrides[month][item] = {
        startingStock: parseInt(startingStock) || 0,
        purchased: parseInt(purchased) || 0,
        used: parseInt(used) || 0,
        endingStock: parseInt(endingStock) || 0
      };
      await saveHousekeepingOverrides(overrides);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Housekeeping overrides saved successfully.', overrides: overrides[month] }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // GET /api/admin/amc - Get all AMC contracts (secure)
  if (pathname === '/api/admin/amc' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const contracts = await getAMCContracts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(contracts));
    return;
  }


  // POST /api/admin/amc - Add/Update AMC contract (secure)
  if (pathname === '/api/admin/amc' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const amc = JSON.parse(bodyText);
      if (!amc.name || !amc.startDate || !amc.endDate) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AMC name, start date, and end date are required.' }));
        return;
      }
      const contracts = await getAMCContracts();
      amc.category = amc.category || 'AC';
      amc.visitsPerYear = parseInt(amc.visitsPerYear) || 4;

      if (amc.id) {
        const idx = contracts.findIndex(c => c.id === amc.id);
        if (idx !== -1) {
          const prev = contracts[idx];
          const nextDateChanged = prev.nextServiceDate !== amc.nextServiceDate;
          const endDateChanged = prev.endDate !== amc.endDate;
          
          const visits = buildVisitsList(amc, prev);
          contracts[idx] = {
            ...prev,
            ...amc,
            pricing: parseFloat(amc.pricing) || 0,
            visits,
            alertsSent: {
              serviceDue: nextDateChanged ? [] : (prev.alertsSent?.serviceDue || []),
              expiryWeeks: endDateChanged ? [] : (prev.alertsSent?.expiryWeeks || [])
            }
          };
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AMC contract not found.' }));
          return;
        }
      } else {
        amc.id = 'amc-' + crypto.randomUUID();
        amc.pricing = parseFloat(amc.pricing) || 0;
        amc.visits = buildVisitsList(amc, {});
        amc.alertsSent = { serviceDue: [], expiryWeeks: [] };
        contracts.push(amc);
      }
      await saveAMCContracts(contracts);
      
      // Send notification email to Admin about the Full AMC details
      const adminEmail = ADMIN_EMAIL;
      const subject = ` AMC Contract Registered/Updated: ${amc.name}`;
      const visitsHtml = (amc.visits || []).map(v => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding:6px;font-weight:600;color:#374151;">Visit ${v.visitNo}</td>
          <td style="padding:6px;color:#4b5563;">Scheduled: ${v.scheduledDate}</td>
          <td style="padding:6px;color:#10b981;font-weight:600;">${v.actualDate ? 'Completed: ' + v.actualDate : 'Pending'}</td>
        </tr>
      `).join('');

      const emailBody = `
        <div style="font-family:sans-serif;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
          <h2 style="color:#1e3a8a;margin-top:0;"> AMC Contract Details Summary</h2>
          <p>Dear Admin,</p>
          <p>The following AMC Contract has been successfully registered/updated in the helpdesk system:</p>
          
          <table style="width:100%;border-collapse:collapse;margin:15px 0;">
            <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;width:150px;">AMC Name:</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">${amc.name}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Category:</td><td style="padding:8px;border:1px solid #e5e7eb;color:#2563eb;font-weight:600;">${amc.category}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Units / Location:</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">${amc.units || 'N/A'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Period:</td><td style="padding:8px;border:1px solid #e5e7eb;">${amc.startDate} to ${amc.endDate}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Price/Cost:</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:#1e3a8a;">INR ${amc.pricing}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Frequency:</td><td style="padding:8px;border:1px solid #e5e7eb;">${amc.frequency} (${amc.visitsPerYear} visits)</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Vendor Name:</td><td style="padding:8px;border:1px solid #e5e7eb;">${amc.vendorName || 'N/A'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Vendor Contact:</td><td style="padding:8px;border:1px solid #e5e7eb;">${amc.vendorPhone || 'N/A'}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Coverage:</td><td style="padding:8px;border:1px solid #e5e7eb;white-space:pre-wrap;">${amc.coverage || 'N/A'}</td></tr>
          </table>

          <h3 style="color:#1e3a8a;margin-top:20px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;">Scheduled Service Visits</h3>
          <table style="width:100%;border-collapse:collapse;margin:10px 0;">
            ${visitsHtml}
          </table>
          
          <p style="margin-top:24px;font-size:0.85rem;color:#6b7280;text-align:center;">&copy; 2026 Avana Medical Help Desk Portal</p>
        </div>
      `;
      
      sendEmail({ to: adminEmail, subject, htmlBody: emailBody }).then(() => {
        console.log(`[SMTP] Summary email for AMC "${amc.name}" sent to ${adminEmail}`);
      }).catch(err => {
        console.error('[SMTP] Failed to send AMC summary email:', err.message);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'AMC contract saved successfully.', amc }));
      checkAMCAlerts();
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // POST /api/admin/amc/visit - Update actual completion date of a visit slot (secure)
  if (pathname === '/api/admin/amc/visit' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const bodyText = await getRequestBody(req);
      const { amcId, visitNo, actualDate, servicePerson, servicePhone, remarks } = JSON.parse(bodyText);
      const contracts = await getAMCContracts();
      const amc = contracts.find(c => c.id === amcId);
      if (!amc) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AMC contract not found.' }));
        return;
      }
      const visit = amc.visits && amc.visits.find(v => v.visitNo === parseInt(visitNo));
      if (!visit) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Visit slot not found.' }));
        return;
      }
      visit.actualDate = actualDate || '';
      visit.servicePerson = servicePerson || '';
      visit.servicePhone = servicePhone || '';
      visit.remarks = remarks || '';
      visit.status = actualDate ? 'Serviced' : 'Pending';

      const start = new Date(amc.startDate);
      const end = new Date(amc.endDate);
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      const N = parseInt(amc.visitsPerYear) || 4;
      const intervalMonths = Math.max(1, Math.round(diffMonths / N));

      if (actualDate) {
        const actD = new Date(actualDate);
        actD.setMonth(actD.getMonth() + intervalMonths);
        const nextDStr = actD.toISOString().slice(0, 10);
        
        visit.nextServiceDate = nextDStr;
        amc.nextServiceDate = nextDStr;
        
        if (!amc.alertsSent) amc.alertsSent = { serviceDue: [], expiryWeeks: [] };
        amc.alertsSent.serviceDue = amc.alertsSent.serviceDue.filter(d => d !== nextDStr);
        const nextVisit = amc.visits.find(v => v.visitNo === parseInt(visitNo) + 1);
        if (nextVisit && nextVisit.status === 'Pending') {
          nextVisit.scheduledDate = nextDStr;
        }
      } else {
        visit.nextServiceDate = '';
        const nextPending = amc.visits.find(v => v.status === 'Pending');
        amc.nextServiceDate = nextPending ? nextPending.scheduledDate : '';
      }
      await saveAMCContracts(contracts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Visit updated successfully.', amc }));
      checkAMCAlerts();
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // DELETE /api/admin/amc/:id - Delete AMC contract (secure)
  if (pathname.startsWith('/api/admin/amc/') && req.method === 'DELETE') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    const parts = pathname.split('/');
    const amcId = parts[parts.length - 1];
    let contracts = await getAMCContracts();
    const initialLen = contracts.length;
    contracts = contracts.filter(c => c.id !== amcId);
    if (contracts.length < initialLen) {
      await saveAMCContracts(contracts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'AMC contract deleted.' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'AMC contract not found.' }));
    }
    return;
  }

  //  Utility Payments API 

  // GET /api/admin/utility-payments - Get all or filtered by month (secure)
  if (pathname === '/api/admin/utility-payments' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    const month = parsedUrl.searchParams.get('month'); // e.g. "2025-07"
    let entries = getUtilityPayments();
    
    if (month) {
      let monthEntries = entries.filter(e => e.dueDate && e.dueDate.startsWith(month));
      
      // Auto-rollover: if no entries exist for this month, copy from previous month
      if (monthEntries.length === 0) {
        const [yearStr, monthStr] = month.split('-');
        let m = parseInt(monthStr, 10) - 1;
        let y = parseInt(yearStr, 10);
        if (m === 0) { m = 12; y -= 1; }
        const prevMonth = `${y}-${String(m).padStart(2, '0')}`;
        
        const prevEntries = entries.filter(e => e.dueDate && e.dueDate.startsWith(prevMonth));
        if (prevEntries.length > 0) {
          let modified = false;
          for (const old of prevEntries) {
             const oldDay = old.dueDate.split('-')[2] || '01';
             entries.push({
               id: crypto.randomUUID(),
               serviceType: old.serviceType,
               serviceProvider: old.serviceProvider,
               userName: old.userName || '',
               location: old.location || '',
               number: old.number,
               dueDate: `${month}-${oldDay}`,
               amount: 0,
               paid: false,
               paidOn: null,
               reminderSent: false,
               createdAt: new Date().toISOString()
             });
             modified = true;
          }
          if (modified) {
            saveUtilityPayments(entries);
            monthEntries = entries.filter(e => e.dueDate && e.dueDate.startsWith(month));
          }
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(monthEntries));
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entries));
    return;
  }

  // POST /api/admin/utility-payments - Add new entry (secure)
  if (pathname === '/api/admin/utility-payments' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    try {
      const body = JSON.parse(await getRequestBody(req));
      const { serviceType, serviceProvider, userName, location, number, dueDate, amount } = body;
      if (!serviceType || !serviceProvider || !number || !dueDate || amount === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'serviceType, serviceProvider, number, dueDate and amount are required.' }));
        return;
      }
      const entries = getUtilityPayments();
      const newEntry = {
        id: crypto.randomUUID(),
        serviceType,
        serviceProvider,
        userName: userName || '',
        location: location || '',
        number,
        dueDate,
        amount: parseFloat(amount) || 0,
        paid: false,
        paidOn: null,
        reminderSent: false,
        createdAt: new Date().toISOString()
      };
      entries.push(newEntry);
      saveUtilityPayments(entries);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, entry: newEntry }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body.' }));
    }
    return;
  }

  // PATCH /api/admin/utility-payments/:id - Mark paid / update (secure)
  if (pathname.startsWith('/api/admin/utility-payments/') && req.method === 'PATCH') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    const entryId = pathname.replace('/api/admin/utility-payments/', '').split('/')[0];
    try {
      const updates = JSON.parse(await getRequestBody(req));
      const entries = getUtilityPayments();
      const idx = entries.findIndex(e => e.id === entryId);
      if (idx === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Entry not found.' }));
        return;
      }
      entries[idx] = { ...entries[idx], ...updates };
      // If marking paid, reset reminderSent
      if (updates.paid === true) {
        entries[idx].paidOn = updates.paidOn || new Date().toISOString().slice(0, 10);
        entries[idx].reminderSent = false;
      }
      saveUtilityPayments(entries);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, entry: entries[idx] }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body.' }));
    }
    return;
  }

  // DELETE /api/admin/utility-payments/:id - Delete entry (secure)
  if (pathname.startsWith('/api/admin/utility-payments/') && req.method === 'DELETE') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    const entryId = pathname.replace('/api/admin/utility-payments/', '').split('/')[0];
    const entries = getUtilityPayments();
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Entry not found.' }));
      return;
    }
    entries.splice(idx, 1);
    saveUtilityPayments(entries);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // ── Tax Payments API ──────────────────────────────────────────────────

  // GET /api/admin/tax-payments - Get all tax payments or filter by year
  if (pathname === '/api/admin/tax-payments' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    const year = parsedUrl.searchParams.get('year');
    let entries = getTaxPayments();
    
    if (year) {
      entries = entries.filter(e => String(e.year) === String(year));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entries));
    return;
  }

  // POST /api/admin/tax-payments - Add new tax entry
  if (pathname === '/api/admin/tax-payments' && req.method === 'POST') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    try {
      const data = JSON.parse(await getRequestBody(req));
      const { serviceType, location, billNumber, year, term, dueDate, amount } = data;
      
      const newEntry = {
        id: crypto.randomUUID(),
        serviceType, // 'property' or 'water'
        location: location || '',
        billNumber: billNumber || '',
        year: year || '',
        term: term || '', // 'First Half' or 'Second Half'
        dueDate: dueDate || '',
        amount: parseFloat(amount) || 0,
        paid: false,
        paidOn: null,
        reminderSent: false,
        createdAt: new Date().toISOString()
      };

      const entries = getTaxPayments();
      entries.push(newEntry);
      saveTaxPayments(entries);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newEntry));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid payload.' }));
    }
    return;
  }

  // PATCH /api/admin/tax-payments/:id - Update or mark as paid
  if (pathname.startsWith('/api/admin/tax-payments/') && req.method === 'PATCH') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    const entryId = pathname.replace('/api/admin/tax-payments/', '').split('/')[0];
    try {
      const updates = JSON.parse(await getRequestBody(req));
      const entries = getTaxPayments();
      const idx = entries.findIndex(e => e.id === entryId);
      if (idx === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Entry not found.' }));
        return;
      }

      entries[idx] = { ...entries[idx], ...updates };
      
      // If marking paid and paidOn was provided, ensure reminder is unset
      if (updates.paid === true) {
        entries[idx].paidOn = updates.paidOn || new Date().toISOString().slice(0, 10);
        entries[idx].reminderSent = false;
      }

      saveTaxPayments(entries);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request.' }));
    }
    return;
  }

  // DELETE /api/admin/tax-payments/:id - Delete entry
  if (pathname.startsWith('/api/admin/tax-payments/') && req.method === 'DELETE') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorised' }));
      return;
    }
    const entryId = pathname.replace('/api/admin/tax-payments/', '').split('/')[0];
    const entries = getTaxPayments();
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Entry not found.' }));
      return;
    }
    entries.splice(idx, 1);
    saveTaxPayments(entries);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // GET /api/employee/captcha - Generate SVG Captcha
  if (pathname === '/api/employee/captcha' && req.method === 'GET') {

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let text = '';
    for (let i = 0; i < 5; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
    
    const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
    captchaStore.set(ip, { text, expires: Date.now() + 5 * 60 * 1000 });
    
    // Generate simple SVG
    const svg = `
      <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f9fafb" rx="8" />
        <path d="M 10 10 Q 50 50 190 20 M 10 40 Q 100 0 190 50" stroke="rgba(0,0,0,0.1)" stroke-width="2" fill="none" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="28" font-weight="bold" fill="#374151" letter-spacing="8" transform="rotate(${(Math.random()-0.5)*10}, 100, 30)">${text}</text>
      </svg>
    `;
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
    res.end(svg);
    return;
  }

  // POST /api/employee/send-otp  Generate & Send OTP code (Simulated & printed to terminal/log file)
  if (pathname === '/api/employee/send-otp' && req.method === 'POST') {
    try {
      const bodyText = await getRequestBody(req);
      const { email, captcha } = JSON.parse(bodyText);
      if (!email || !captcha) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Email and Captcha are required.' }));
        return;
      }

      const otpIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
      const storedCaptcha = captchaStore.get(otpIp);

      if (!storedCaptcha || Date.now() > storedCaptcha.expires || storedCaptcha.text.toUpperCase() !== captcha.toUpperCase()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid or expired captcha. Please try again.' }));
        return;
      }
      captchaStore.delete(otpIp);

      const emailLower = email.toLowerCase().trim();
      if (!emailLower.endsWith('@avanamedical.com') && !emailLower.endsWith('@avanasurgical.com')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Access Denied: Only @avanamedical.com and @avanasurgical.com email domains are authorized.' }));
        return;
      }

      // BACK-H2: Rate limit OTP generation  max 3 requests per email per 10 minutes
      if (isRateLimited(emailLower, 'otp-send', 3, 10 * 60 * 1000) ||
          isRateLimited(otpIp,     'otp-send', 5, 10 * 60 * 1000)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Too many OTP requests. Please wait 10 minutes before trying again.' }));
        return;
      }

      // BACK-C4: Use cryptographically secure random OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      
      // Store code with 5-minute expiration
      otpStore[emailLower] = {
        otp,
        expires: Date.now() + 5 * 60 * 1000
      };

      // Log to mock_emails.log
      const logMessage = `[${new Date().toISOString()}] To: ${emailLower} - Subject: Avana Help Desk Login OTP - Body: Your verification code is ${otp} (Expires in 5 minutes)\n------------------------------------------------------------\n`;
      fs.appendFileSync(MOCK_EMAIL_FILE, logMessage, 'utf8');

      // BACK-L1: Only print OTP to console in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n============================================`);
        console.log(`[OTP] Sent verification code to: ${emailLower}`);
        console.log(`[OTP] CODE: ${otp}`);
        console.log(`============================================\n`);
      } else {
        console.log(`[OTP] Verification code sent to: ${emailLower}`);
      }

      // Send actual email using the new sendEmail SMTP / Direct MX helper!
      sendEmail({
        to: emailLower,
        subject: 'Avana Help Desk Verification Code',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; border: 1px solid #e5e7eb; border-radius: 16px;">
            <h2 style="color: #2563eb; margin-bottom: 1.5rem;">Avana Help Desk Verification</h2>
            <p style="font-size: 1rem; color: #374151; line-height: 1.5;">Hello,</p>
            <p style="font-size: 1rem; color: #374151; line-height: 1.5;">Use the following verification code to access the Avana Medical Ticketing & Booking Portal:</p>
            <div style="font-size: 2.2rem; font-weight: bold; letter-spacing: 0.2rem; text-align: center; color: #1e1b4b; background: #f3f4f6; padding: 1rem; border-radius: 12px; margin: 2rem 0;">
              ${otp}
            </div>
            <p style="font-size: 0.85rem; color: #9ca3af; line-height: 1.5;">This code will expire in 5 minutes. If you did not request this, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0;">
            <p style="font-size: 0.8rem; color: #9ca3af; text-align: center;">&copy; 2026 Avana Medical Help Desk</p>
          </div>
        `
      }).then(() => {
        console.log(`[SMTP] Live email successfully dispatched to ${emailLower}`);
      }).catch(err => {
        console.error('[SMTP] Live email dispatch failed:', err.message);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'OTP code generated and email dispatch initiated.' }));
    } catch (err) {
      console.error('API send-otp error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error.' }));
    }
    return;
  }

  // POST /api/employee/verify-otp  Validate OTP code & write event to employee_logins.json
  if (pathname === '/api/employee/verify-otp' && req.method === 'POST') {
    try {
      const bodyText = await getRequestBody(req);
      const { email, otp } = JSON.parse(bodyText);
      if (!email || !otp) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Email and OTP are required.' }));
        return;
      }

      const emailLower = email.toLowerCase().trim();
      const record = otpStore[emailLower];
      const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';

      let authSuccess = false;
      let errorMsg = '';

      if (!record) {
        errorMsg = 'No OTP code requested for this email.';
      } else if (Date.now() > record.expires) {
        errorMsg = 'OTP code has expired. Please request a new one.';
        delete otpStore[emailLower];
      } else if (record.otp !== otp.trim()) {
        errorMsg = 'Incorrect OTP code.';
      } else {
        authSuccess = true;
        delete otpStore[emailLower]; // Clear after successful login
      }

      // Record login event in employee_logins.json
      let logins = [];
      try {
        const data = fs.readFileSync(LOGINS_FILE, 'utf8');
        logins = JSON.parse(data);
      } catch (e) { logins = []; }

      logins.push({
        email: emailLower,
        timestamp: new Date().toISOString(),
        ip: clientIp,
        status: authSuccess ? 'Success' : 'Failed'
      });

      fs.writeFileSync(LOGINS_FILE, JSON.stringify(logins, null, 2), 'utf8');

      if (authSuccess) {
        // BACK-H7: Generate secure session token for employee to prevent IDOR
        const token = crypto.randomBytes(32).toString('hex');
        employeeSessions.set(token, { email: emailLower, expires: Date.now() + 2 * 60 * 60 * 1000 });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, email: emailLower, token }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: errorMsg }));
      }
    } catch (err) {
      console.error('API verify-otp error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error.' }));
    }
    return;
  }

  // POST /api/employee/set-password (secure - requires verified employee token)
  if (pathname === '/api/employee/set-password' && req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Missing or invalid token.' }));
        return;
      }
      const token = authHeader.substring(7).trim();
      const session = employeeSessions.get(token);
      if (!session || Date.now() > session.expires) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Invalid or expired session.' }));
        return;
      }

      const bodyText = await getRequestBody(req);
      const { newPassword } = JSON.parse(bodyText);
      if (!newPassword || newPassword.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 6 characters long.' }));
        return;
      }

      const emailLower = session.email.toLowerCase().trim();
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = crypto.pbkdf2Sync(newPassword, salt, 100000, 64, 'sha512').toString('hex');

      const credentials = getEmployeeCredentials();
      credentials[emailLower] = { salt, hash: derivedKey };
      saveEmployeeCredentials(credentials);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Password set successfully.' }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request.' }));
    }
    return;
  }

  // POST /api/employee/login-password (public)
  if (pathname === '/api/employee/login-password' && req.method === 'POST') {
    try {
      const bodyText = await getRequestBody(req);
      const { email, password } = JSON.parse(bodyText);
      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Email and password are required.' }));
        return;
      }

      const emailLower = email.toLowerCase().trim();
      if (!emailLower.endsWith('@avanamedical.com') && !emailLower.endsWith('@avanasurgical.com')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Access Denied: Domain not authorized.' }));
        return;
      }

      const credentials = getEmployeeCredentials();
      const userCred = credentials[emailLower];
      if (!userCred) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No password set for this account. Please login via OTP first to set a password.' }));
        return;
      }

      const derivedKey = crypto.pbkdf2Sync(password, userCred.salt, 100000, 64, 'sha512').toString('hex');
      if (derivedKey !== userCred.hash) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Incorrect password.' }));
        return;
      }

      // Generate session token
      const token = crypto.randomBytes(32).toString('hex');
      employeeSessions.set(token, { email: emailLower, expires: Date.now() + 2 * 60 * 60 * 1000 });

      // Record login in employee_logins.json
      const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
      let logins = [];
      try {
        const data = fs.readFileSync(LOGINS_FILE, 'utf8');
        logins = JSON.parse(data);
      } catch (e) {}
      logins.push({
        email: emailLower,
        timestamp: new Date().toISOString(),
        ip: clientIp,
        status: 'Success'
      });
      fs.writeFileSync(LOGINS_FILE, JSON.stringify(logins, null, 2), 'utf8');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, email: emailLower, token }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error.' }));
    }
    return;
  }

  // GET /api/employee/requests  Fetch consolidated helpdesk and conference bookings for a logged-in employee email
  if (pathname === '/api/employee/requests' && req.method === 'GET') {
    try {
      // BACK-H7: Prevent IDOR by validating the session token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Missing or invalid token.' }));
        return;
      }
      const token = authHeader.substring(7).trim();
      const session = employeeSessions.get(token);
      
      if (!session || Date.now() > session.expires) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Invalid or expired session.' }));
        return;
      }

      const emailLower = session.email;
      const requests = await getHelpdeskRequests();
      const myRequests = requests.filter(r => r.requester_email && r.requester_email.toLowerCase().trim() === emailLower);

      const bookings = await getBookingsDB();
      const myBookings = bookings.filter(b => b.email && b.email.toLowerCase().trim() === emailLower).map(b => ({
        id: b.id,
        submittedAt: b.createdAt || (b.startDate + 'T09:00:00.000Z'),
        category: 'conference',
        categoryTitle: 'Conference Room Booking',
        status: 'confirmed',
        startDate: b.startDate,
        endDate: b.endDate,
        reason: b.reason,
        startTime: b.startTime,
        endTime: b.endTime,
        bookingType: b.bookingType,
        remarks: b.remarks || '',
        requester_name: b.name,
        requester_phone: b.phone
      }));

      const consolidated = [...myRequests, ...myBookings].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(consolidated));
    } catch (err) {
      console.error('API employee requests error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error.' }));
    }
    return;
  }

  // GET /api/admin/logins  Fetch list of employee logins (secure - admin token required)
  if (pathname === '/api/admin/logins' && req.method === 'GET') {
    if (!(await verifyAdminSession(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized.' }));
      return;
    }
    try {
      const data = fs.readFileSync(LOGINS_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read login records.' }));
    }
    return;
  }

  // --- Static Files Routes ---

  let servedPath = '';
  let contentType = 'text/plain';

  if (pathname === '/' || pathname === '/index.html' || pathname === '/index' || pathname === '/helpdesk') {
    servedPath = path.join(__dirname, 'public', 'index.html');
    contentType = 'text/html';
  } else if (pathname === '/booking' || pathname === '/booking.html' || pathname === '/booking/') {
    servedPath = path.join(__dirname, 'public', 'booking.html');
    contentType = 'text/html';
  } else if (pathname === '/admin' || pathname === '/admin.html' || pathname === '/admin/') {
    servedPath = path.join(__dirname, 'public', 'admin.html');
    contentType = 'text/html';
  } else if (pathname === '/status' || pathname === '/status.html' || pathname === '/status/') {
    servedPath = path.join(__dirname, 'public', 'status.html');
    contentType = 'text/html';
  } else if (pathname.startsWith('/helpdesk-admin')) {
    servedPath = path.join(__dirname, 'public', 'helpdesk-admin.html');
    contentType = 'text/html';
  } else if (pathname === '/style.css') {
    servedPath = path.join(__dirname, 'public', 'style.css');
    contentType = 'text/css';
  } else if (pathname === '/app.js') {
    servedPath = path.join(__dirname, 'public', 'app.js');
    contentType = 'application/javascript';
  } else if (pathname === '/admin.js') {
    servedPath = path.join(__dirname, 'public', 'admin.js');
    contentType = 'application/javascript';
  } else if (pathname === '/helpdesk.js') {
    servedPath = path.join(__dirname, 'public', 'helpdesk.js');
    contentType = 'application/javascript';
  } else {
    // Attempt fallback static file resolution
    // BACK-C6: Path traversal guard  ensure resolved path stays inside /public
    const publicRoot = path.resolve(__dirname, 'public');
    const candidate = path.resolve(publicRoot, pathname.substring(1));
    if (!candidate.startsWith(publicRoot + path.sep) && candidate !== publicRoot) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }
    servedPath = candidate;
    const ext = path.extname(servedPath);
    if (ext === '.html') contentType = 'text/html';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  }

  if (servedPath && fs.existsSync(servedPath) && fs.statSync(servedPath).isFile()) {
    serveStaticFile(res, servedPath, contentType);
  } else {
    // Fallback to index.html for any unknown non-API route to prevent 404 Not Found errors
    const fallbackPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(fallbackPath)) {
      serveStaticFile(res, fallbackPath, 'text/html');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

// Start Server (connect to MongoDB first if configured, then start listening)
connectMongo().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.1.84:${PORT}`);
    
    // Initial check for AMC alerts on startup
    checkAMCAlerts();
    checkUtilityReminders();
    rolloverUtilityPayments();
    
    // Check AMC alerts every 12 hours
    setInterval(checkAMCAlerts, 12 * 60 * 60 * 1000);
    // Check utility payment reminders every 12 hours
    setInterval(checkUtilityReminders, 12 * 60 * 60 * 1000);
    checkTaxReminders();
    // Check tax reminders every 12 hours
    setInterval(checkTaxReminders, 12 * 60 * 60 * 1000);
    // Rollover utility payments daily
    setInterval(rolloverUtilityPayments, 24 * 60 * 60 * 1000);
  });
});


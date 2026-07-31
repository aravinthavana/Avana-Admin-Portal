const fs = require('fs');
let html = fs.readFileSync('public/helpdesk-admin.html', 'utf8');

// Replace Add Asset Form Buttons
html = html.replace(
  '<button type="button" onclick="closeAssetModal()" style="padding:0.5rem 1.5rem; background:white; color:var(--text); border:1px solid var(--border); border-radius:8px; cursor:pointer; font-weight:600;">Cancel</button>\n              <button type="submit" id="btn-save-asset" style="padding:0.5rem 1.5rem; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Save & Send Email</button>\n            </div>',
  `<div style="display:flex; align-items:center; gap: 0.5rem; margin-right: auto;">
                <input type="checkbox" id="am-send-email" checked style="width:16px; height:16px; cursor:pointer;">
                <label for="am-send-email" style="font-size:0.85rem; font-weight:600; color:var(--text); cursor:pointer;">Send Email</label>
              </div>
              <button type="button" onclick="closeAssetModal()" style="padding:0.5rem 1.5rem; background:white; color:var(--text); border:1px solid var(--border); border-radius:8px; cursor:pointer; font-weight:600;">Cancel</button>
              <button type="submit" id="btn-save-asset" style="padding:0.5rem 1.5rem; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Save</button>
            </div>`
);

// Replace Append Asset Form Buttons
html = html.replace(
  '<button type="button" onclick="closeAssetAppendModal()" style="padding:0.5rem 1rem; border:1px solid var(--border); background:white; border-radius:8px; cursor:pointer;">Cancel</button>\n              <button type="submit" id="asset-append-submit-btn" style="padding:0.5rem 1.5rem; background:#10b981; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Add Items & Notify</button>\n            </div>',
  `<div style="display:flex; align-items:center; gap: 0.5rem; margin-right: auto;">
                <input type="checkbox" id="append-send-email" checked style="width:16px; height:16px; cursor:pointer;">
                <label for="append-send-email" style="font-size:0.85rem; font-weight:600; color:var(--text); cursor:pointer;">Send Email</label>
              </div>
              <button type="button" onclick="closeAssetAppendModal()" style="padding:0.5rem 1rem; border:1px solid var(--border); background:white; border-radius:8px; cursor:pointer;">Cancel</button>
              <button type="submit" id="asset-append-submit-btn" style="padding:0.5rem 1.5rem; background:#10b981; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Save Items</button>
            </div>`
);

// Replace JS Add Form Payload
html = html.replace(
  'handoverBy: document.getElementById(\'am-handoverby\').value,\n      assets\n    };',
  'handoverBy: document.getElementById(\'am-handoverby\').value,\n      sendEmail: document.getElementById(\'am-send-email\').checked,\n      assets\n    };'
);

// Replace JS Append Form Payload
html = html.replace(
  'body: JSON.stringify({ id, assets })',
  'body: JSON.stringify({ id, assets, sendEmail: document.getElementById(\'append-send-email\').checked })'
);

fs.writeFileSync('public/helpdesk-admin.html', html, 'utf8');

// Also update server.js to respect sendEmail
let server = fs.readFileSync('server.js', 'utf8');

server = server.replace(
  '// Send Email to Employee\n        const baseUrl = process.env.BASE_URL',
  `// Send Email to Employee
        if (data.sendEmail !== false) {
          const baseUrl = process.env.BASE_URL`
);
// Now we need to close the bracket for the first one... Wait, this requires a more precise replacement in server.js.

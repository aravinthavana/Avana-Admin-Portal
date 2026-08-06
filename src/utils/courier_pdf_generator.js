'use strict';
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// ── Number to Words ──────────────────────────────────────────────
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n) {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numToWords(-n);
  let words = '';
  if (Math.floor(n / 10000000) > 0) {
    words += numToWords(Math.floor(n / 10000000)) + ' Crore ';
    n %= 10000000;
  }
  if (Math.floor(n / 100000) > 0) {
    words += numToWords(Math.floor(n / 100000)) + ' Lakh ';
    n %= 100000;
  }
  if (Math.floor(n / 1000) > 0) {
    words += numToWords(Math.floor(n / 1000)) + ' Thousand ';
    n %= 1000;
  }
  if (Math.floor(n / 100) > 0) {
    words += numToWords(Math.floor(n / 100)) + ' Hundred ';
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      words += ones[n] + ' ';
    } else {
      words += tens[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) words += ones[n % 10] + ' ';
    }
  }
  return words.trim();
}

function amountInWords(amount) {
  const num = Math.round(amount);
  const paise = Math.round((amount - num) * 100);
  let result = numToWords(num) + ' Rupees';
  if (paise > 0) result += ' and ' + numToWords(paise) + ' Paise';
  result += ' Only.';
  return result;
}

// ── Text wrapper ─────────────────────────────────────────────────
function wrapText(text, maxChars) {
  if (!text) return [];
  const lines = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.length <= maxChars) { lines.push(rawLine); continue; }
    let cur = '';
    for (const word of rawLine.split(' ')) {
      if ((cur + ' ' + word).trim().length <= maxChars) {
        cur = (cur + ' ' + word).trim();
      } else {
        if (cur) lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

// ── Draw bordered cell helper ────────────────────────────────────
function drawCell(page, x, y, w, h, opts = {}) {
  const { fillColor, borderColor = rgb(0, 0, 0), borderWidth = 0.5 } = opts;
  if (fillColor) {
    page.drawRectangle({ x, y, width: w, height: h, color: fillColor });
  }
  page.drawRectangle({ x, y, width: w, height: h, borderWidth, borderColor });
}

function drawText(page, text, x, y, opts = {}) {
  const { font, size = 9, color = rgb(0, 0, 0), maxWidth, align = 'left' } = opts;
  let drawX = x;
  if (align === 'center' && maxWidth) {
    const tw = font.widthOfTextAtSize(String(text), size);
    drawX = x + (maxWidth - tw) / 2;
  } else if (align === 'right' && maxWidth) {
    const tw = font.widthOfTextAtSize(String(text), size);
    drawX = x + maxWidth - tw;
  }
  page.drawText(String(text), { x: drawX, y, size, font, color });
}

// ── DC Copy PDF ──────────────────────────────────────────────────
async function generateDCCopyPDF(record) {
  const pdfDoc = await PDFDocument.create();
  const PAGE_W = 595;
  const PAGE_H = 842;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const yellow = rgb(1, 0.96, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);

  const M = 30; // margin
  const fullW = PAGE_W - M * 2;
  let curY = PAGE_H - M;

  // ── TITLE ────────────────────────────────────────────────────
  const titleH = 20;
  drawCell(page, M, curY - titleH, fullW, titleH, { borderWidth: 1.5 });
  drawText(page, 'DELIVERY CHALLAN', M, curY - 14, { font: fontB, size: 12, color: black, align: 'center', maxWidth: fullW });
  curY -= titleH;

  // ── TOP SECTION: Logo left | Info table right ────────────────
  const topH = 120;
  const logoW = 180;
  const infoW = fullW - logoW;
  const infoX = M + logoW;

  // Logo cell border
  drawCell(page, M, curY - topH, logoW, topH, { borderWidth: 1 });

  // Embed logo
  try {
    const primaryLogo = path.join(__dirname, '../assets/logo.png');
    const fallbackLogo = path.join(__dirname, '../../frontend/public/Logo new.png');
    const logoPath = fs.existsSync(primaryLogo) ? primaryLogo : (fs.existsSync(fallbackLogo) ? fallbackLogo : null);
    if (logoPath) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImg = await pdfDoc.embedPng(logoBytes);
      
      const maxW = 160;
      const maxH = 100;
      let width = logoImg.width;
      let height = logoImg.height;
      const ratio = Math.min(maxW / width, maxH / height);
      width = width * ratio;
      height = height * ratio;

      page.drawImage(logoImg, {
        x: M + (logoW - width) / 2,
        y: curY - topH + (topH - height) / 2,
        width: width,
        height: height,
      });
    }
  } catch (e) {
    // Logo embed failed silently
  }

  // Info rows on the right
  const isOthersRemarks = (record.remarksType || '').toLowerCase() === 'others';
  const remarksDisplay = (isOthersRemarks && record.remarksOther) ? record.remarksOther : (record.remarksType || '—');

  const rows = [
    ['Delivery Challan No:', record.dcNo],
    ['Delivery Challan Date:', record.dcDate],
    ['Remarks:', remarksDisplay],
    ['Transporter name:', record.transporterName || '—'],
    ['No. of boxes:', String(record.noOfBoxes || 1)],
    ['Courier Billing to:', record.courierBilling || '—'],
  ];
  const rowH = topH / rows.length;
  const labelW = infoW * 0.48;
  const valW = infoW - labelW;

  rows.forEach((row, i) => {
    const ry = curY - (i + 1) * rowH;
    drawCell(page, infoX, ry, labelW, rowH, { borderWidth: 0.5 });
    drawCell(page, infoX + labelW, ry, valW, rowH, { borderWidth: 0.5 });
    drawText(page, row[0], infoX + 3, ry + rowH / 2 - 4, { font: fontB, size: 8 });
    drawText(page, row[1], infoX + labelW + 3, ry + rowH / 2 - 4, { font, size: 8 });
  });

  curY -= topH;

  // ── TO / FROM SECTION ────────────────────────────────────────
  const addrH = 115;
  const halfW = fullW / 2;

  // TO cell
  drawCell(page, M, curY - addrH, halfW, addrH, { borderWidth: 1 });
  let toY = curY - 14;
  drawText(page, 'To,', M + 5, toY, { font: fontB, size: 9 });
  toY -= 13;

  // Receiver: name
  const receiverName = record.receiverName || '';
  const receiverPhone = record.receiverPhone || '';
  const toAddrLines = wrapText(record.toAddress || '', 38);

  if (receiverName) {
    drawText(page, receiverName, M + 5, toY, { font: fontB, size: 9 });
    toY -= 12;
  }
  toAddrLines.forEach(line => {
    if (toY > curY - addrH + 14) {
      drawText(page, line, M + 5, toY, { font, size: 8 });
      toY -= 10;
    }
  });

  // Phone placed at the bottom of the To address
  if (receiverPhone) {
    drawText(page, 'Phone: ' + receiverPhone, M + 5, curY - addrH + 4, { font: fontB, size: 8 });
  }

  // FROM cell
  const fromX = M + halfW;
  drawCell(page, fromX, curY - addrH, halfW, addrH, { borderWidth: 1 });
  let fromY = curY - 14;
  drawText(page, 'From,', fromX + 5, fromY, { font: fontB, size: 9 });
  fromY -= 12;

  // Sender name
  const senderName = record.senderName || '';
  const senderPhone = record.senderPhone || '';
  if (senderName) {
    drawText(page, senderName, fromX + 5, fromY, { font: fontB, size: 8 });
    fromY -= 11;
  }

  // Sender address lines
  const fromAddrText = record.fromAddressText || '';
  const fromAddrLines = wrapText(fromAddrText, 45);
  fromAddrLines.forEach(line => {
    if (fromY > curY - addrH + 24) {
      drawText(page, line, fromX + 5, fromY, { font, size: 8 });
      fromY -= 10;
    }
  });

  // Determine GST Number based on From address / company
  let gstNo = '';
  const fromAddrLower = fromAddrText.toLowerCase();
  const fromIdStr = String(record.fromAddressId || '');
  if (fromAddrLower.includes('technology') || fromIdStr === '3') {
    gstNo = '33ABACA8707A1Z9';
  } else if (fromAddrLower.includes('surgical') || fromIdStr === '2') {
    gstNo = '33AAQCA5951K1ZA';
  } else if (fromAddrLower.includes('medical') || fromIdStr === '1') {
    gstNo = '33AAHCA6669B1ZT';
  }

  // GST & Phone placed at bottom of From address
  let bY = curY - addrH + 4;
  if (senderPhone) {
    drawText(page, 'Phone: +91 ' + senderPhone, fromX + 5, bY, { font: fontB, size: 8 });
    bY += 10;
  }
  if (gstNo) {
    drawText(page, 'GST no: ' + gstNo, fromX + 5, bY, { font: fontB, size: 8 });
  }

  curY -= (addrH + 12);

  // ── ITEMS TABLE ──────────────────────────────────────────────
  const cols = [
    { label: 'S. No', w: 30, align: 'center' },
    { label: 'Item Code', w: 65, align: 'left' },
    { label: 'Item Description', w: 165, align: 'left' },
    { label: 'Serial No', w: 75, align: 'center' },
    { label: 'Qty', w: 35, align: 'center' },
    { label: 'Rate', w: 75, align: 'right' },
    { label: 'Value', w: 90, align: 'right' },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const tableX = M + (fullW - tableW) / 2;
  const headerH = 18;

  // Header row
  drawCell(page, tableX, curY - headerH, tableW, headerH, { fillColor: lightGray, borderWidth: 1 });
  let cx = tableX;
  cols.forEach(col => {
    drawCell(page, cx, curY - headerH, col.w, headerH, { borderWidth: 0.5 });
    drawText(page, col.label, cx + 3, curY - 13, { font: fontB, size: 8, align: col.align, maxWidth: col.w - 6 });
    cx += col.w;
  });
  curY -= headerH;

  // Item rows (fixed 10 rows to match sample)
  const itemRowH = 16;
  const items = record.items || [];
  const totalRows = Math.max(items.length, 10);

  for (let i = 0; i < totalRows; i++) {
    const item = items[i];
    let rx = tableX;
    const ry = curY - (i + 1) * itemRowH;

    const rowData = item
      ? [String(i + 1), item.itemCode || '', item.description || '', item.serialNo || '', String(item.qty), Number(item.rate).toFixed(0), Number(item.value).toLocaleString('en-IN')]
      : ['', '', '', '', '', '', ''];

    cols.forEach((col, ci) => {
      drawCell(page, rx, ry, col.w, itemRowH, { borderWidth: 0.5 });
      if (rowData[ci]) {
        drawText(page, rowData[ci], rx + 3, ry + 5, { font, size: 8, align: col.align, maxWidth: col.w - 6 });
      }
      rx += col.w;
    });
  }
  curY -= totalRows * itemRowH;

  // ── TOTAL VALUE ROW ──────────────────────────────────────────
  const totalRowH = 18;
  const totalLabelW = tableW - 90;
  drawCell(page, tableX, curY - totalRowH, totalLabelW, totalRowH, { borderWidth: 0.5 });
  drawText(page, 'Total Value', tableX + 3, curY - 13, { font: fontB, size: 9, align: 'right', maxWidth: totalLabelW - 6 });
  drawCell(page, tableX + totalLabelW, curY - totalRowH, 90, totalRowH, { fillColor: yellow, borderWidth: 1 });
  const totalFormatted = Number(record.totalAmount || 0).toLocaleString('en-IN');
  drawText(page, totalFormatted, tableX + totalLabelW + 3, curY - 13, { font: fontB, size: 9, align: 'right', maxWidth: 84 });
  curY -= totalRowH;

  // ── VALUE IN WORDS ───────────────────────────────────────────
  const wordsH = 18;
  const wordsText = amountInWords(Number(record.totalAmount || 0));
  drawCell(page, tableX, curY - wordsH, tableW * 0.18, wordsH, { fillColor: lightGray, borderWidth: 0.5 });
  drawText(page, 'Value in words:', tableX + 3, curY - 13, { font: fontB, size: 8 });
  drawCell(page, tableX + tableW * 0.18, curY - wordsH, tableW * 0.82, wordsH, { borderWidth: 0.5 });
  drawText(page, wordsText, tableX + tableW * 0.18 + 5, curY - 13, { font, size: 8 });
  curY -= wordsH;

  // ── DECLARATION ROW ───────────────────────────────────────────
  if (record.declaration === true) {
    const declH = 22;
    const declText = 'Declaration: This is to confirm that goods containing in the parcel are surgical goods used for Demo purpose Not for Sale. Value declared is for only transport purpose.';
    drawCell(page, tableX, curY - declH, tableW, declH, { borderWidth: 0.5, fillColor: rgb(0.98, 0.98, 0.98) });
    const declLines = wrapText(declText, 110);
    let declY = curY - 10;
    declLines.forEach(line => {
      drawText(page, line, tableX + 5, declY, { font: fontB, size: 7, color: black });
      declY -= 9;
    });
    curY -= declH;
  }

  // ── BOTTOM SECTION: Boxes/Dimensions/Weight | Signature ──────
  curY -= 10;

  // Prepare list of box details (row by row)
  let boxList = [];
  if (Array.isArray(record.boxes) && record.boxes.length > 0) {
    boxList = record.boxes.map((b, idx) => ({
      boxNo: b.boxNo || `Box ${idx + 1}`,
      dimensions: b.dimensions || '',
      weight: b.weight || ''
    }));
  } else {
    // Fallback: parse from dimensions and weight strings if boxes array not present
    const dimParts = (record.dimensions || '').split(',').map(s => s.trim()).filter(Boolean);
    const weightParts = (record.weight || '').split(',').map(s => s.trim()).filter(Boolean);
    const totalB = Math.max(record.noOfBoxes || 1, dimParts.length, weightParts.length);
    for (let r = 0; r < totalB; r++) {
      let bLabel = `Box ${r + 1}`;
      let bDim = dimParts[r] || '';
      let bWgt = weightParts[r] || '';
      if (bDim.includes(':')) {
        const p = bDim.split(':');
        bLabel = p[0].trim();
        bDim = p.slice(1).join(':').trim();
      }
      if (bWgt.includes(':')) {
        bWgt = bWgt.split(':').slice(1).join(':').trim();
      }
      boxList.push({ boxNo: bLabel, dimensions: bDim, weight: bWgt });
    }
  }

  const numRows = Math.max(boxList.length, 3);
  const rowH_bot = 15;
  const botH = 16 + numRows * rowH_bot;
  const botTableW = halfW;
  const botCols = [
    { label: 'No. of boxes', w: botTableW / 3 },
    { label: 'Dimensions', w: botTableW / 3 },
    { label: 'Weight', w: botTableW / 3 },
  ];

  // Bot table header
  let bx = M;
  botCols.forEach(col => {
    drawCell(page, bx, curY - 16, col.w, 16, { fillColor: lightGray, borderWidth: 0.5 });
    drawText(page, col.label, bx + 3, curY - 12, { font: fontB, size: 8, align: 'center', maxWidth: col.w - 6 });
    bx += col.w;
  });

  // Bot table values (row by row)
  for (let r = 0; r < numRows; r++) {
    let bx2 = M;
    const rowY = curY - 16 - (r + 1) * rowH_bot;
    const item = boxList[r] || { boxNo: '', dimensions: '', weight: '' };
    const vals = [item.boxNo || '', item.dimensions || '', item.weight || ''];
    botCols.forEach((col, ci) => {
      drawCell(page, bx2, rowY, col.w, rowH_bot, { borderWidth: 0.5 });
      if (vals[ci]) drawText(page, vals[ci], bx2 + 3, rowY + 4, { font, size: 8, align: 'center', maxWidth: col.w - 6 });
      bx2 += col.w;
    });
  }

  // Signature area (right half)
  let sigCoName = 'Avana Medical Devices Pvt Ltd';
  if (record.signatoryCompany && record.signatoryCompany !== 'None') {
    sigCoName = record.signatoryCompany;
  } else if (!record.signatoryCompany) {
    if (record.fromAddressText) {
      const firstLine = record.fromAddressText.split('\n')[0].trim();
      if (firstLine) sigCoName = firstLine.replace(/,$/, '').trim();
    } else if (record.courierBilling) {
      sigCoName = record.courierBilling;
    }
  }

  const sigX = M + halfW;
  const sigW = halfW;
  drawCell(page, sigX, curY - botH, sigW, botH, { borderWidth: 1 });
  
  if (record.signatoryCompany !== 'None') {
    drawText(page, 'For', sigX + 5, curY - 14, { font: fontB, size: 8.5, align: 'center', maxWidth: sigW - 10 });
    drawText(page, sigCoName, sigX + 5, curY - 26, { font: fontB, size: 8.5, align: 'center', maxWidth: sigW - 10 });
  }
  
  drawText(page, 'Authority Signature', sigX + 5, curY - botH + 10, { font: fontB, size: 8.5, align: 'center', maxWidth: sigW - 10 });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ── Address Label PDF (A5 Size) ──────────────────────────────────
async function generateAddressLabelPDF(record) {
  const fromObj = {
    name: record.senderName || record.courierBilling || 'Avana Medical Devices Pvt Ltd',
    phone: record.senderPhone || '',
    address: record.fromAddressText || ''
  };
  const toObj = {
    name: record.receiverName || '',
    phone: record.receiverPhone || '',
    address: record.toAddress || ''
  };
  return generateShippingLabelPDF({ from: fromObj, to: toObj, isFragile: !!record.isFragile });
}

/**
 * Generate a clean A5 shipping label PDF with optional Fragile warning block.
 * from: { name, phone, address }
 * to:   { name, phone, address }
 * isFragile: boolean
 * Returns Buffer of PDF bytes.
 */
async function generateShippingLabelPDF({ from, to, isFragile }) {
  const pdfDoc = await PDFDocument.create();
  const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A5 dimensions: 420 pt Width, 595 pt Height
  const pageWidth  = 420;
  const pageHeight = 595;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const AMBER = rgb(0.773, 0.569, 0.000); // #C59100
  const BLACK = rgb(0, 0, 0);
  const GRAY  = rgb(0.35, 0.35, 0.35);
  const RED   = rgb(0.85, 0.1, 0.1);
  const WHITE = rgb(1, 1, 1);
  const LGRAY = rgb(0.95, 0.95, 0.95);

  function wrapAddr(text, maxChars) {
    if (!text) return [];
    return text.split('\n').flatMap(line => {
      const words = line.split(' ');
      const lines = [];
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxChars) {
          if (cur) lines.push(cur.trim());
          cur = w;
        } else {
          cur = (cur + ' ' + w).trim();
        }
      }
      if (cur) lines.push(cur.trim());
      return lines;
    });
  }

  // Determine height of the shipping label section
  // If isFragile, label takes top half (~275pt), Fragile takes bottom half (~270pt)
  const labelTopY = pageHeight - 15;
  const labelHeight = isFragile ? 275 : 565;
  const labelBottomY = labelTopY - labelHeight;

  // ── Outer border for Shipping Label ──
  page.drawRectangle({
    x: 15,
    y: labelBottomY,
    width: pageWidth - 30,
    height: labelHeight,
    borderColor: AMBER,
    borderWidth: 2,
    color: WHITE,
  });

  // ── Top Title Bar ──
  page.drawRectangle({
    x: 15,
    y: labelTopY - 32,
    width: pageWidth - 30,
    height: 32,
    color: AMBER,
  });
  page.drawText('AVANA GROUP • PARCEL SHIPPING LABEL', {
    x: 25,
    y: labelTopY - 22,
    size: 11,
    font: fontB,
    color: WHITE,
  });

  const contentTop = labelTopY - 35;
  const halfContentH = (labelHeight - 35) / 2;

  // ── TO SECTION (Top block inside label) ──
  page.drawRectangle({
    x: 16,
    y: contentTop - 20,
    width: pageWidth - 32,
    height: 20,
    color: LGRAY,
  });
  page.drawText('TO (RECEIVER)', { x: 25, y: contentTop - 14, size: 9, font: fontB, color: BLACK });

  const toName = (to?.name || 'Receiver').toUpperCase();
  const toPhone = to?.phone ? `Phone: +91 ${to.phone}` : '';
  const toAddrLines = wrapAddr(to?.address || '', 38);

  let toY = contentTop - 35;
  page.drawText(toName, { x: 25, y: toY, size: 11, font: fontB, color: BLACK });
  toY -= 14;

  if (toPhone) {
    page.drawText(toPhone, { x: 25, y: toY, size: 9, font: fontB, color: GRAY });
    toY -= 13;
  }

  for (const line of toAddrLines) {
    if (toY > contentTop - halfContentH + 5) {
      page.drawText(line, { x: 25, y: toY, size: 9, font, color: BLACK });
      toY -= 12;
    }
  }

  // ── Divider between TO and FROM ──
  const fromTop = contentTop - halfContentH;
  page.drawLine({
    start: { x: 15, y: fromTop },
    end: { x: pageWidth - 15, y: fromTop },
    thickness: 1.5,
    color: AMBER,
  });

  // ── FROM SECTION (Bottom block inside label) ──
  page.drawRectangle({
    x: 16,
    y: fromTop - 20,
    width: pageWidth - 32,
    height: 20,
    color: LGRAY,
  });
  page.drawText('FROM (SENDER)', { x: 25, y: fromTop - 14, size: 9, font: fontB, color: BLACK });

  const fromName = (from?.name || 'Sender').toUpperCase();
  const fromPhone = from?.phone ? `Phone: +91 ${from.phone}` : '';
  const fromAddrLines = wrapAddr(from?.address || '', 38);

  let fromY = fromTop - 35;
  page.drawText(fromName, { x: 25, y: fromY, size: 10, font: fontB, color: BLACK });
  fromY -= 13;

  if (fromPhone) {
    page.drawText(fromPhone, { x: 25, y: fromY, size: 8.5, font, color: GRAY });
    fromY -= 12;
  }

  for (const line of fromAddrLines) {
    if (fromY > labelBottomY + 12) {
      page.drawText(line, { x: 25, y: fromY, size: 8.5, font, color: BLACK });
      fromY -= 11;
    }
  }

  // ── FRAGILE SECTION (Bottom Half of page if isFragile is true) ──
  if (isFragile) {
    const fragileBoxY = 15;
    const fragileBoxH = 260;

    // Draw Fragile Outer Box with Red Border
    page.drawRectangle({
      x: 15,
      y: fragileBoxY,
      width: pageWidth - 30,
      height: fragileBoxH,
      borderColor: RED,
      borderWidth: 2.5,
      color: WHITE,
    });

    // Header Red Banner
    page.drawRectangle({
      x: 15,
      y: fragileBoxY + fragileBoxH - 30,
      width: pageWidth - 30,
      height: 30,
      color: RED,
    });
    const headerMsg = 'FRAGILE - HANDLE WITH CARE';
    const msgW = fontB.widthOfTextAtSize(headerMsg, 12);
    page.drawText(headerMsg, {
      x: (pageWidth - msgW) / 2,
      y: fragileBoxY + fragileBoxH - 20,
      size: 12,
      font: fontB,
      color: WHITE,
    });

    // Embed fragile image if available
    const primaryFragile = path.join(__dirname, '../assets/fragile.png');
    const legacyFragile = path.join(__dirname, '../../frontend/public/fragile.png');
    const fragilePngPath = fs.existsSync(primaryFragile) ? primaryFragile : legacyFragile;

    let imageEmbedded = false;
    if (fs.existsSync(fragilePngPath)) {
      try {
        const imgBytes = fs.readFileSync(fragilePngPath);
        const img = await pdfDoc.embedPng(imgBytes);
        const imgDims = img.scaleToFit(160, 150);
        page.drawImage(img, {
          x: (pageWidth - imgDims.width) / 2,
          y: fragileBoxY + 50,
          width: imgDims.width,
          height: imgDims.height,
        });
        imageEmbedded = true;
      } catch (err) {
        console.error('Error embedding fragile.png:', err);
      }
    }

    if (!imageEmbedded) {
      const symbol = 'HANDLE WITH CARE';
      const symW = fontB.widthOfTextAtSize(symbol, 20);
      page.drawText(symbol, {
        x: (pageWidth - symW) / 2,
        y: fragileBoxY + 130,
        size: 20,
        font: fontB,
        color: RED,
      });
    }

    // Bottom warning subtitle
    const warn1 = 'DELICATE SURGICAL EQUIPMENT & GLASSWARE';
    const w1W = fontB.widthOfTextAtSize(warn1, 9.5);
    page.drawText(warn1, {
      x: (pageWidth - w1W) / 2,
      y: fragileBoxY + 30,
      size: 9.5,
      font: fontB,
      color: RED,
    });

    const warn2 = 'DO NOT DROP • DO NOT STACK HEAVY WEIGHT';
    const w2W = font.widthOfTextAtSize(warn2, 8.5);
    page.drawText(warn2, {
      x: (pageWidth - w2W) / 2,
      y: fragileBoxY + 16,
      size: 8.5,
      font,
      color: BLACK,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateDCCopyPDF, generateAddressLabelPDF, generateShippingLabelPDF };




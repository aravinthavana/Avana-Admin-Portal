/* ─── Helpers ─────────────────────────────────────────────── */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleString('en-IN'); } catch { return dateStr; }
}

export function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'paid' || s === 'approved' || s === 'confirmed') return 'approved';
  if (s === 'pending' || s === 'unpaid') return 'pending';
  if (s === 'in-progress') return 'in-progress';
  if (s === 'rejected' || s === 'overdue') return 'rejected';
  return 'pending';
}

export function openLegacyPrintReport({ title, subtitle, summary = [], headers = [], rows = [] }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the PDF report.');
    return;
  }

  const logoUrl = `${window.location.origin}/Logo%20new.png`;

  const summaryHtml = summary.length > 0 ? `
    <div style="display: flex; gap: 1rem; margin-bottom: 1.2rem;">
      ${summary.map(s => `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.6rem 1rem; flex: 1; text-align: center;">
          <div style="font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em;">${s.label}</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: ${s.color || '#0f172a'}; margin-top: 0.15rem;">${s.value}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const tableHeaderHtml = `
    <thead>
      <tr style="background: #C59100; color: white; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.04em;">
        ${headers.map(h => `<th style="padding: 0.6rem 0.6rem; text-align: ${h.align || 'left'}; font-weight: 700;">${h.title}</th>`).join('')}
      </tr>
    </thead>
  `;

  const tableBodyHtml = `
    <tbody>
      ${rows.map((row, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 0.82rem;">
          ${row.map((cell, cIdx) => `<td style="padding: 0.55rem 0.6rem; text-align: ${headers[cIdx]?.align || 'left'};">${cell ?? ''}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #0f172a; background: white; }
        .page { padding: 2rem 2.5rem; min-height: 100vh; display: flex; flex-direction: column; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.2rem; border-bottom: 2px solid #C59100; padding-bottom: 0.8rem; }
        .header-left h1 { font-size: 1.4rem; font-weight: 800; color: #C59100; }
        .header-left p { font-size: 0.8rem; color: #64748b; margin-top: 0.2rem; }
        .logo img { height: 50px; max-width: 180px; object-fit: contain; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .footer { margin-top: auto; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; text-align: center; font-size: 0.72rem; color: #94a3b8; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-left">
            <h1>${title}</h1>
            <p>${subtitle || ''} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <div class="logo">
            <img src="${logoUrl}" alt="Avana Logo">
          </div>
        </div>
        ${summaryHtml}
        <table>
          ${tableHeaderHtml}
          ${tableBodyHtml}
        </table>
        <div class="footer">
          Avana Office Admin Portal • Computer Generated Report
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export const CATEGORY_LABELS = {
  conference:    'Conference Room',
  stationery:    'Stationery',
  hk_material:   'HK Material',
  admin_support: 'Admin Support',
  maintenance:   'Maintenance',
  housekeeping:  'Housekeeping',
  office_asset:  'Office Asset',
  print_scan:    'Print & Scan',
};


export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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

export function openLegacyPrintReport({ title, subtitle, docNo, summary = [], details = [], headers = [], rows = [], sections = null }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the PDF report.');
    return;
  }

  const logoUrl = `${window.location.origin}/Logo%20new.png`;

  const sectionsData = sections || [{ sectionTitle: '', subtitle: '', summary, details, headers, rows }];

  const contentHtml = sectionsData.map((sec, sIdx) => {
    const secTitleHtml = sec.sectionTitle ? `<h2 style="font-size: 1.1rem; color: var(--color-primary-dark); margin-bottom: 0.5rem; margin-top: ${sIdx > 0 ? '2rem' : '0'}; border-bottom: 1px solid #e4e4e7; padding-bottom: 0.3rem;">${sec.sectionTitle}</h2>` : '';
    const secSubtitleHtml = sec.subtitle ? `<p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 1rem;">${sec.subtitle}</p>` : '';
    
    const summaryHtml = (sec.summary && sec.summary.length > 0) ? `
      <div style="display: flex; gap: 1rem; margin-bottom: 1.2rem; flex-wrap: wrap;">
        ${sec.summary.map(s => `
          <div style="background: #f9f9fb; border: 1px solid #e4e4e7; border-radius: 6px; padding: 0.6rem 1rem; flex: 1; min-width: 120px; text-align: center;">
            <div style="font-size: 0.7rem; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.04em;">${s.label}</div>
            <div style="font-size: 1.0rem; font-weight: 800; color: ${s.color || '#172025'}; margin-top: 0.15rem;">${s.value}</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    const detailsHtml = (sec.details && sec.details.length > 0) ? `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1.5rem; background: #f9f9fb; padding: 1rem; border: 1px solid #e4e4e7; border-radius: 6px;">
        ${sec.details.map(d => `
          <div style="font-size: 0.85rem;">
            <span style="color: #6b7280; font-weight: 600; display: inline-block; width: 130px;">${d.label}:</span>
            <span style="color: #172025;">${d.value}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const tableHeaderHtml = (sec.headers && sec.headers.length > 0) ? `
      <thead>
        <tr style="background: #b27f0d; color: white; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.04em;">
          ${sec.headers.map(h => `<th style="padding: 0.6rem 0.6rem; text-align: ${h.align || 'left'}; font-weight: 700;">${h.title}</th>`).join('')}
        </tr>
      </thead>
    ` : '';

    const tableBodyHtml = (sec.rows && sec.rows.length > 0) ? `
      <tbody>
        ${sec.rows.map((row, idx) => `
          <tr style="border-bottom: 1px solid #e4e4e7; background: ${idx % 2 === 0 ? '#ffffff' : '#f9f9fb'}; font-size: 0.82rem;">
            ${row.map((cell, cIdx) => `<td style="padding: 0.55rem 0.6rem; text-align: ${sec.headers[cIdx]?.align || 'left'};">${cell ?? ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    ` : '';

    const tableHtml = (sec.headers && sec.headers.length > 0) ? `
      <table>
        ${tableHeaderHtml}
        ${tableBodyHtml}
      </table>
    ` : '';

    return `
      <div style="margin-bottom: 3rem; page-break-after: ${sectionsData.length > 1 && sIdx < sectionsData.length - 1 ? 'always' : 'auto'};">
        ${secTitleHtml}
        ${secSubtitleHtml}
        ${summaryHtml}
        ${sec.customHtml || ''}
        ${detailsHtml}
        ${tableHtml}
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arimo', sans-serif; font-size: 12px; color: #172025; background: white; }
        .page { padding: 2rem 2.5rem; min-height: 100vh; display: flex; flex-direction: column; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.2rem; border-bottom: 2px solid #b27f0d; padding-bottom: 0.8rem; }
        .header-left h1 { font-size: 1.4rem; font-weight: 800; color: #b27f0d; }
        .header-left p { font-size: 0.8rem; color: #6b7280; margin-top: 0.2rem; }
        .logo img { height: 50px; max-width: 180px; object-fit: contain; }
        table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .footer { margin-top: auto; padding-top: 1.5rem; border-top: 1px solid #e4e4e7; text-align: center; font-size: 0.72rem; color: #aab2b2; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-left">
            <h1>${title}</h1>
            <p>${subtitle || ''} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            ${docNo ? `<p style="font-weight: bold; color: #6b7280; margin-top: 0.3rem;">Doc No: ${docNo}</p>` : ''}
          </div>
          <div class="logo" style="text-align: right;">
            <img src="${logoUrl}" alt="Avana Logo">
          </div>
        </div>
        ${contentHtml}
        <div class="footer">
          Avana Office Admin Portal • Computer Generated Report
        </div>
      </div>
      <script>
        function triggerPrint() {
          window.focus();
          window.print();
        }
        if (document.readyState === 'complete') {
          setTimeout(triggerPrint, 200);
        } else {
          window.addEventListener('load', function() { setTimeout(triggerPrint, 200); });
          setTimeout(triggerPrint, 600);
        }
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
  app_feedback:  'App Feedback',
};


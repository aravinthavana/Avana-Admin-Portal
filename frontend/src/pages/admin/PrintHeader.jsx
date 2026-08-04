import React from 'react';

export function PrintHeader({ title, subtitle }) {
  return (
    <div className="print-only" style={{ display: 'none', marginBottom: '20px', textAlign: 'center' }}>
      <img src={`${window.location.origin}/Logo%20new.png`} alt="Avana Logo" style={{ height: 60, marginBottom: 10 }} />
      <h2 style={{ margin: '0 0 5px 0', fontSize: '18pt' }}>{title}</h2>
      {subtitle && <p style={{ margin: 0, color: '#555', fontSize: '12pt' }}>{subtitle}</p>}
      <div style={{ marginTop: 10, borderBottom: '2px solid #000' }}></div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { assetTrackerApi } from '../lib/api';
import { Spinner, Alert } from '../components/ui';

export default function AssetAcknowledgementPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const [handover, setHandover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Asset Handover Acknowledgement | Avana';
    if (!id) {
      setError('Missing handover request ID in URL.');
      setLoading(false);
      return;
    }

    assetTrackerApi.getAckDetails(id)
      .then(data => {
        setHandover(data);
        if (data.signature) setSignature(data.signature);
        if (data.status === 'Acknowledged') setSubmitted(true);
      })
      .catch(err => setError(err.message || 'Failed to load asset handover details.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) {
      alert('Please check the confirmation box to agree to the handover terms.');
      return;
    }
    if (!signature.trim()) {
      alert('Please enter your full name as digital signature.');
      return;
    }

    setSubmitting(true);
    try {
      await assetTrackerApi.submitAck(id, signature.trim(), remarks.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9fb', padding: 'var(--space-6) var(--space-4)' }}>
      <div style={{ maxWidth: 750, margin: '0 auto' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: 'var(--space-1)' }}>
            🏢 Avana Group Admin Portal
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Corporate Office Asset Handover Acknowledgement Form
          </p>
        </div>

        {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

        {submitted ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-3)' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: 'var(--space-2)' }}>Acknowledgement Confirmed</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Thank you, <strong>{handover?.name}</strong>! Your digital acknowledgement for the issued office assets has been recorded successfully.
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: 'var(--space-4)', fontSize: '0.88rem', color: '#16a34a', display: 'inline-block', textAlign: 'left' }}>
              <div>• <strong>Signed By:</strong> {signature || handover?.signature || handover?.name}</div>
              <div>• <strong>Acknowledged Date:</strong> {new Date(handover?.acknowledgedAt || Date.now()).toLocaleString()}</div>
              <div>• <strong>Handover Ref ID:</strong> #{handover?.id}</div>
            </div>
          </div>
        ) : handover ? (
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            
            {/* Employee info card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', background: '#f9f9fb', padding: 'var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>EMPLOYEE NAME</span>
                <strong style={{ fontSize: '1.05rem' }}>{handover.name}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>EMAIL ADDRESS</span>
                <strong>{handover.email}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>DEPARTMENT</span>
                <strong>{handover.department || 'General'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>HANDOVER DATE</span>
                <strong>{handover.handoverDate}</strong>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
              📦 Assigned Company Assets
            </h3>

            {/* Assets Table */}
            <div className="table-wrapper" style={{ marginBottom: 'var(--space-6)' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Asset Name</th>
                    <th scope="col">Serial No / Specs</th>
                    <th scope="col">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {(handover.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{it.itemName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{it.serialNo || 'N/A'}</td>
                      <td>
                        <span className="badge badge--success">{it.condition || 'Good'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Acknowledgement Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: 'var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: '0.92rem', color: '#d97706', lineHeight: 1.5 }}>
                    <strong>Declaration:</strong> I hereby confirm receipt of the company asset(s) listed above in good working condition. I agree to keep them secure and use them in accordance with company policy.
                  </span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                <div>
                  <label htmlFor="signature-input" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 'var(--space-2)' }}>
                    Digital Signature (Full Name) *
                  </label>
                  <input
                    id="signature-input"
                    type="text"
                    className="form-input"
                    placeholder="Enter your full name..."
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ack-remarks-input" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: 'var(--space-2)' }}>
                    Remarks (Optional)
                  </label>
                  <input
                    id="ack-remarks-input"
                    type="text"
                    className="form-input"
                    placeholder="Any notes or condition remarks..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--lg"
                disabled={submitting || !agreed}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}
              >
                {submitting ? <Spinner size="sm" /> : '✍️ Sign & Confirm Asset Handover'}
              </button>
            </form>

          </div>
        ) : null}
      </div>
    </div>
  );
}

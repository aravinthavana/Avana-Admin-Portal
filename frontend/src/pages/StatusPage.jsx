import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AvanaLogo, Badge, Spinner, EmptyState, Alert } from '../components/ui';

/* ─── Helpers ─────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* Sort: ascending date, then ascending start_time */
function sortBookings(bookings) {
  return [...bookings].sort((a, b) => {
    const dateA = a.startDate || a.date || '';
    const dateB = b.startDate || b.date || '';
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    const tA = a.startTime || '';
    const tB = b.startTime || '';
    return tA < tB ? -1 : tA > tB ? 1 : 0;
  });
}

/* ─── Component ───────────────────────────────────────────── */
export default function StatusPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const today = todayStr();
      // Keep only today + future bookings
      const upcoming = (data || []).filter(b => (b.startDate || b.date || '') >= today);
      setBookings(sortBookings(upcoming));
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    document.title = 'Conference Room Status | Avana';
  }, [fetchBookings]);

  /* Render timing badge */
  function TimingBadge({ booking }) {
    if (booking.bookingType === 'full') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.04em',
          background: 'var(--color-error-bg)', color: 'var(--color-error)',
          border: '1px solid var(--color-error-border)',
        }}>
          🔴 Full Day
        </span>
      );
    }
    const display = `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: 'var(--color-warning-bg)', color: 'var(--color-warning)',
        border: '1px solid var(--color-warning-border)',
      }}>
        🕐 {display}
      </span>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fdf5e6 0%, #f5f5f7 60%, #eff6ff 100%)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* ── Header ── */}
      <header style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky', top: 0, zIndex: 'var(--z-sticky)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <AvanaLogo size="md" />
            <div style={{ height: 28, width: 1, background: 'var(--color-border)' }} />
            <div>
              <h1 style={{
                fontSize: '1rem', fontWeight: 700, margin: 0,
                fontFamily: 'var(--font-heading)', color: 'var(--brand-charcoal)',
              }}>
                Conference Room Bookings
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Live availability status
              </p>
            </div>
          </div>
          <Link
            to="/booking"
            className="btn btn--primary"
            style={{ textDecoration: 'none' }}
            aria-label="Go to conference room booking page"
          >
            📅 Book Conference Room
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main id="main-content" tabIndex={-1} style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
        {/* Page hero */}
        <div style={{
          marginBottom: 'var(--space-8)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 'var(--space-4)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-2)' }}>
              Upcoming Bookings
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Showing today's and future conference room reservations, sorted by date and time.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={fetchBookings}
            aria-label="Refresh bookings"
            style={{ flexShrink: 0 }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Badge legend */}
        <div style={{
          display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap',
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'var(--color-warning)', display: 'inline-block',
            }} />
            Time Slot booking
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'var(--color-error)', display: 'inline-block',
            }} />
            Full Day booking
          </div>
        </div>

        {/* Content area */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 'var(--space-16)',
              flexDirection: 'column', gap: 'var(--space-4)',
            }}>
              <Spinner size="lg" label="Loading bookings…" />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Loading bookings…</p>
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: 'var(--space-6)' }}>
              <Alert type="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </div>
          )}

          {!loading && !error && bookings.length === 0 && (
            <EmptyState
              icon="📭"
              title="No upcoming bookings"
              description="The conference room is currently available. Be the first to book it!"
            />
          )}

          {!loading && !error && bookings.length > 0 && (
            <div className="table-wrapper">
              <table
                className="table"
                role="table"
                aria-label="Conference room upcoming bookings"
                style={{ minWidth: 600 }}
              >
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 40 }}>#</th>
                    <th scope="col">Date</th>
                    <th scope="col">Timing</th>
                    <th scope="col">Booked By</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, idx) => (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {formatDate(b.startDate || b.date)}
                        </div>
                        {b.endDate && b.endDate !== (b.startDate || b.date) && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            to {formatDate(b.endDate)}
                          </div>
                        )}
                      </td>
                      <td>
                        <TimingBadge booking={b} />
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{b.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {b.email}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', maxWidth: 280 }}>
                        <span style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {b.reason || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: 'var(--space-12)',
          color: 'var(--color-text-muted)', fontSize: '0.8rem',
        }}>
          <p>
            Avana Group · Conference Room Portal ·{' '}
            <Link to="/booking" style={{ color: 'var(--brand-amber)' }}>
              Make a Booking
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

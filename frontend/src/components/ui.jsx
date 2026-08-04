import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Uses the actual logo image from public assets served by the Express backend.
 */
export function AvanaLogo({ size = 'md', className = '' }) {
  const heights = { sm: 28, md: 36, lg: 48 };
  return (
    <img
      src="/Logo new.png"
      alt="Avana"
      height={heights[size]}
      style={{ objectFit: 'contain', display: 'block' }}
      className={className}
    />
  );
}

/**
 * Reusable Badge component
 * status: 'pending' | 'approved' | 'rejected' | 'resolved' | 'active' |
 *         'expiring' | 'expired' | 'in-progress' | 'paid' | 'unpaid'
 */
export function Badge({ status, label }) {
  const display = label || status;
  const cls = status?.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge--${cls}`}>{display}</span>;
}

/**
 * Spinner — accessibility-friendly loading indicator
 */
export function Spinner({ size = 'md', label = 'Loading…' }) {
  return (
    <span
      className={`spinner spinner--${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''}`}
      role="status"
      aria-label={label}
    />
  );
}

/**
 * Empty state placeholder
 */
export function EmptyState({ icon = '📭', title = 'Nothing here yet', description }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon" aria-hidden="true">{icon}</span>
      <p className="empty-state__title">{title}</p>
      {description && <p style={{ fontSize: '0.85rem' }}>{description}</p>}
    </div>
  );
}

/**
 * Alert box
 */
export function Alert({ type = 'info', children, onClose }) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  return (
    <div className={`alert alert--${type}`} role="alert">
      <span aria-hidden="true">{icons[type]}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Modal wrapper
 */
export function Modal({ isOpen, onClose, title, children, footer, size = '' }) {
  if (!isOpen) return null;

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal ${size ? `modal--${size}` : ''}`}>
        <div className="modal__header">
          <h3 id="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Confirmation dialog
 */
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', dangerous = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`btn ${dangerous ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

/**
 * Form field wrapper with label, error, and hint
 */
export function FormField({ label, required, error, hint, children, htmlFor }) {
  return (
    <div className="form-group">
      {label && (
        <label
          className={`form-label${required ? ' form-label--required' : ''}`}
          htmlFor={htmlFor}
        >
          {label}
        </label>
      )}
      {children}
      {error && <span className="form-error" role="alert">⚠ {error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
}

/**
 * Page-level section header
 */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)'
    }}>
      <div>
        <h2 style={{ marginBottom: '2px' }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Stat card for dashboards
 */
export function StatCard({ label, value, icon, color = 'var(--brand-amber)', trend }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-md)',
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-heading)' }}>
          {value}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
        {trend && <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 2 }}>{trend}</div>}
      </div>
    </div>
  );
}

/**
 * Breadcrumbs navigation trail
 * items: [{ label: 'Home', link: '/' }, { label: 'Category' }]
 */
export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
             <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {item.link && !isLast ? (
                <Link to={item.link} style={{ color: 'var(--brand-amber)', textDecoration: 'none', fontWeight: 500 }}>
                  {item.label}
                </Link>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)' }} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <span style={{ color: 'var(--color-border)' }}>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Badge, Spinner, EmptyState, Alert, PageHeader } from '../../components/ui';
import { formatDateTime } from './utils';

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getAuditLogs()
      .then(data => setLogs(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="📜 Admin Operations Audit" subtitle="Track administrative changes and operations across the portal" />
      {error && <Alert type="error">{error}</Alert>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size="lg" /></div>
          : logs.length === 0 ? <EmptyState icon="📜" title="No audit logs found" />
          : (
            <div className="table-wrapper">
              <table className="table" aria-label="Admin audit logs">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Admin</th>
                    <th scope="col">Action</th>
                    <th scope="col">Entity</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatDateTime(l.timestamp)}
                      </td>
                      <td style={{ fontWeight: 500 }}>{l.admin}</td>
                      <td>
                        <Badge status="info" label={l.action} />
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{l.entity} {l.entityId ? `(#${l.entityId.substring(0,8)})` : ''}</td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}

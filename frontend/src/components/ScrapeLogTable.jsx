import './ScrapeLogTable.css';

export default function ScrapeLogTable({ logs }) {
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN');
  }

  function getStatusBadge(status) {
    const classes = {
      SUCCESS: 'badge-success',
      RETRIED: 'badge-retried',
      FAILED: 'badge-failed',
    };
    return <span className={`status-badge ${classes[status] || ''}`}>{status}</span>;
  }

  return (
    <div className="log-table-wrap">
      <table className="data-table log-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Duration</th>
            <th>Error / Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className={`log-row log-${log.status.toLowerCase()}`}>
              <td>{formatDate(log.created_at)}</td>
              <td>{getStatusBadge(log.status)}</td>
              <td>{log.attempt_number}/{log.max_attempts}</td>
              <td>{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
              <td className="log-error">
                {log.error_message || (
                  log.details?.price ? `₹${log.details.price} · Stock: ${log.details.stock}` : '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

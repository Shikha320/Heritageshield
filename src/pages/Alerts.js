import React, { useState, useEffect, useCallback } from 'react';
import {
  getAlerts,
  getAlertSummary,
  createAlert,
  resolveAlert,
  deleteAlert,
} from '../api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, resolved: 0 });
  const [filter, setFilter] = useState('all'); // all | active | resolved
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'motion', message: '', camera: '', severity: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [alertsData, summaryData] = await Promise.all([getAlerts(), getAlertSummary()]);
      setAlerts(alertsData);
      setSummary(summaryData);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id);
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, resolved: true } : a)));
      setSummary((prev) => ({ ...prev, active: prev.active - 1, resolved: prev.resolved + 1 }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    try {
      await deleteAlert(id);
      const deletedAlert = alerts.find((a) => a._id === id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      setSummary((prev) => ({
        ...prev,
        total: prev.total - 1,
        active: deletedAlert?.resolved ? prev.active : prev.active - 1,
        resolved: deletedAlert?.resolved ? prev.resolved - 1 : prev.resolved,
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSubmitting(true);
    try {
      const newAlert = await createAlert({
        type: form.type,
        message: form.message.trim(),
        camera: form.camera.trim() || null,
        severity: form.severity,
      });
      setAlerts((prev) => [newAlert, ...prev]);
      setSummary((prev) => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }));
      setForm({ type: 'motion', message: '', camera: '', severity: 'medium' });
      setShowForm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'active') return !a.resolved;
    if (filter === 'resolved') return a.resolved;
    return true;
  });

  const severityColor = { critical: '#9c27b0', high: '#d32f2f', medium: '#ff6f00', low: '#2e7d32' };
  const timeSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Alerts</h1>
        <button style={styles.newAlertBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div style={styles.summaryGrid}>
        <div style={{ ...styles.summaryCard, borderLeft: '4px solid #1565c0' }}>
          <span style={styles.summaryLabel}>Total</span>
          <span style={styles.summaryValue}>{summary.total}</span>
        </div>
        <div style={{ ...styles.summaryCard, borderLeft: '4px solid #d32f2f' }}>
          <span style={styles.summaryLabel}>Active</span>
          <span style={{ ...styles.summaryValue, color: '#ef5350' }}>{summary.active}</span>
        </div>
        <div style={{ ...styles.summaryCard, borderLeft: '4px solid #2e7d32' }}>
          <span style={styles.summaryLabel}>Resolved</span>
          <span style={{ ...styles.summaryValue, color: '#66bb6a' }}>{summary.resolved}</span>
        </div>
      </div>

      {/* ── New Alert Form ── */}
      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <h3 style={{ margin: '0 0 1rem', color: '#fff' }}>Create New Alert</h3>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={styles.input}
              >
                <option value="motion">Motion</option>
                <option value="intrusion">Intrusion</option>
                <option value="vandalism">Vandalism</option>
                <option value="fire">Fire</option>
                <option value="crowd">Crowd</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                style={styles.input}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Camera (optional)</label>
              <input
                type="text"
                value={form.camera}
                onChange={(e) => setForm({ ...form, camera: e.target.value })}
                placeholder="e.g. Front Gate Cam"
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Message</label>
              <input
                type="text"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe the alert..."
                required
                style={styles.input}
              />
            </div>
          </div>
          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      )}

      {/* ── Filter Tabs ── */}
      <div style={styles.filterBar}>
        {['all', 'active', 'resolved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterBtn,
              backgroundColor: filter === f ? '#d32f2f' : '#2a2a2a',
              color: filter === f ? '#fff' : '#aaa',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && ` (${alerts.length})`}
            {f === 'active' && ` (${alerts.filter((a) => !a.resolved).length})`}
            {f === 'resolved' && ` (${alerts.filter((a) => a.resolved).length})`}
          </button>
        ))}
      </div>

      {/* ── Alert List ── */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '3rem 0' }}>Loading alerts...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '3rem', margin: 0 }}>🔔</p>
          <p style={{ color: '#888' }}>No {filter !== 'all' ? filter : ''} alerts found</p>
        </div>
      ) : (
        <div style={styles.alertList}>
          {filtered.map((a) => (
            <div key={a._id} style={styles.alertCard}>
              <div style={styles.alertTop}>
                <div style={styles.alertMeta}>
                  <span
                    style={{
                      ...styles.severityBadge,
                      backgroundColor: severityColor[a.severity] || '#666',
                    }}
                  >
                    {a.severity?.toUpperCase()}
                  </span>
                  <span style={styles.typeBadge}>{a.type?.toUpperCase()}</span>
                  {a.resolved ? (
                    <span style={styles.resolvedBadge}>✓ RESOLVED</span>
                  ) : (
                    <span style={styles.activeBadge}>● ACTIVE</span>
                  )}
                </div>
                <span style={styles.timestamp}>{timeSince(a.createdAt)}</span>
              </div>

              <p style={styles.alertMessage}>{a.message}</p>

              {a.image && (
                <div style={styles.alertImageWrapper}>
                  <img src={a.image} alt="Snapshot" style={styles.alertImage} />
                </div>
              )}

              <div style={styles.alertBottom}>
                {a.camera && <span style={styles.cameraTag}>📷 {a.camera}</span>}
                {a.gate && <span style={styles.gateTag}>🚪 {a.gate}</span>}
                {a.location && <span style={styles.locationTag}>📍 {a.location}</span>}
                <span style={styles.dateText}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
                <div style={styles.actionBtns}>
                  {!a.resolved && (
                    <button style={styles.resolveBtn} onClick={() => handleResolve(a._id)}>
                      Resolve
                    </button>
                  )}
                  <button style={styles.deleteBtn} onClick={() => handleDelete(a._id)}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Styles ─── */
const styles = {
  container: {
    backgroundColor: '#121212',
    color: '#fff',
    minHeight: '100vh',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  pageTitle: {
    fontSize: '2.5rem',
    margin: 0,
    borderBottom: '2px solid #d32f2f',
    paddingBottom: '0.5rem',
  },
  newAlertBtn: {
    padding: '0.7rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#d32f2f',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  /* Summary cards */
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    padding: '1.2rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: '1rem', color: '#aaa' },
  summaryValue: { fontSize: '2rem', fontWeight: 'bold', color: '#fff' },

  /* Form */
  form: {
    backgroundColor: '#1e1e1e',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333',
    marginBottom: '2rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  field: {},
  label: {
    display: 'block',
    marginBottom: '0.3rem',
    fontSize: '0.85rem',
    color: '#aaa',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  },
  submitBtn: {
    padding: '0.7rem 2rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  /* Filter */
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  filterBtn: {
    padding: '0.5rem 1.2rem',
    borderRadius: '20px',
    border: 'none',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },

  /* Alert list */
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  alertCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    padding: '1.2rem 1.5rem',
    border: '1px solid #333',
  },
  alertTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.6rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  alertMeta: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  severityBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  typeBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#90caf9',
    backgroundColor: '#1a237e',
  },
  activeBadge: {
    fontSize: '0.8rem',
    color: '#ef5350',
    fontWeight: 'bold',
  },
  resolvedBadge: {
    fontSize: '0.8rem',
    color: '#66bb6a',
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: '0.85rem',
    color: '#888',
  },
  alertMessage: {
    margin: '0 0 0.8rem',
    fontSize: '1rem',
    lineHeight: '1.5',
    color: '#ddd',
  },
  alertBottom: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  cameraTag: {
    fontSize: '0.85rem',
    color: '#90caf9',
    backgroundColor: '#1a237e',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
  },
  locationTag: {
    fontSize: '0.85rem',
    color: '#81c784',
    backgroundColor: '#1b5e20',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
  },
  gateTag: {
    fontSize: '0.85rem',
    color: '#ffcc80',
    backgroundColor: '#e65100',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
  },
  alertImageWrapper: {
    marginTop: '0.8rem',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #444',
  },
  alertImage: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'cover',
    display: 'block',
  },
  dateText: {
    fontSize: '0.8rem',
    color: '#666',
    flex: 1,
  },
  resolveBtn: {
    padding: '0.4rem 1.2rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '0.4rem 1rem',
    borderRadius: '4px',
    border: '1px solid #b71c1c',
    backgroundColor: 'transparent',
    color: '#ef5350',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionBtns: {
    display: 'flex',
    gap: '0.5rem',
  },

  /* Empty */
  empty: {
    textAlign: 'center',
    padding: '4rem 0',
  },
};

export default Alerts;

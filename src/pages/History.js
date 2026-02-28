import React, { useState, useEffect } from 'react';
import { getIncidents, updateIncidentStatus } from '../api';

const History = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIncidents()
      .then(setIncidents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updated = await updateIncidentStatus(id, newStatus);
      setIncidents((prev) => prev.map((inc) => (inc._id === id ? updated : inc)));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Incident History</h1>
      {loading ? (
        <p style={{ color: '#aaa' }}>Loading…</p>
      ) : (
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Incident ID</th>
              <th style={styles.th}>Camera ID</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident._id} style={styles.tr}>
                <td style={styles.td}>{incident.incidentId}</td>
                <td style={styles.td}>{incident.camera}</td>
                <td style={styles.td}>{incident.description}</td>
                <td style={styles.td}>{new Date(incident.createdAt).toLocaleString()}</td>
                <td style={styles.td}>
                  <select
                    value={incident.status}
                    onChange={(e) => handleStatusChange(incident._id, e.target.value)}
                    style={{
                      ...styles.statusSelect,
                      backgroundColor:
                        incident.status === 'Resolved' ? '#2e7d32'
                        : incident.status === 'Pending' ? '#ff6f00'
                        : '#b71c1c',
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Unresolved">Unresolved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#121212',
    color: '#fff',
    minHeight: '100vh',
    padding: '2rem',
  },
  pageTitle: {
    fontSize: '2.5rem',
    marginBottom: '2rem',
    borderBottom: '2px solid #d32f2f',
    paddingBottom: '0.5rem',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  th: {
    backgroundColor: '#2a2a2a',
    padding: '1rem',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #444',
  },
  tr: {
    borderBottom: '1px solid #333',
  },
  td: {
    padding: '1rem',
    color: '#ddd',
  },
  statusBadge: {
    padding: '0.3rem 1rem',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '0.9rem',
    display: 'inline-block',
  },
  statusSelect: {
    padding: '0.3rem 0.8rem',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

export default History;
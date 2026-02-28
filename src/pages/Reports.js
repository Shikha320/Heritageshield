import React, { useState, useEffect } from 'react';
import { getReportSummary, getDailyStats } from '../api';

const Reports = () => {
  const [stats, setStats] = useState({ totalAlerts: 0, resolvedIncidents: 0, pendingIncidents: 0, unresolvedIncidents: 0 });
  const [dailySummary, setDailySummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReportSummary(), getDailyStats()])
      .then(([summary, daily]) => {
        setStats(summary);
        setDailySummary(daily);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Reports</h1>

      {loading ? (
        <p style={{ color: '#aaa' }}>Loading…</p>
      ) : (
      <>
      {/* Statistics Cards */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Summary</h2>
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, backgroundColor: '#1e1e1e' }}>
            <h3>Total Alerts</h3>
            <p style={styles.statNumber}>{stats.totalAlerts}</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#1e1e1e' }}>
            <h3>Resolved Incidents</h3>
            <p style={styles.statNumber}>{stats.resolvedIncidents}</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#1e1e1e' }}>
            <h3>Pending</h3>
            <p style={styles.statNumber}>{stats.pendingIncidents}</p>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: '#1e1e1e' }}>
            <h3>Unresolved</h3>
            <p style={styles.statNumber}>{stats.unresolvedIncidents}</p>
          </div>
        </div>
      </section>

      {/* Daily Incidents Summary */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Daily Incidents Summary</h2>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Total Alerts</th>
                <th style={styles.th}>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {dailySummary.map((day, index) => (
                <tr key={index} style={styles.tr}>
                  <td style={styles.td}>{day.date}</td>
                  <td style={styles.td}>{day.totalAlerts}</td>
                  <td style={styles.td}>{day.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </>
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
  section: {
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontSize: '1.8rem',
    marginBottom: '1.5rem',
    color: '#fff',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
  },
  statCard: {
    padding: '1.5rem',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #333',
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: '0.5rem 0 0',
    color: '#d32f2f',
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
};

export default Reports;
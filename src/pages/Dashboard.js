import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAlertSummary, getActiveAlerts, resolveAlert as resolveAlertApi } from '../api';

const Dashboard = () => {
  const [alertSummary, setAlertSummary] = useState({ total: 0, active: 0, resolved: 0 });
  const [activeAlerts, setActiveAlerts] = useState([]);

  /* ─── Camera state ─── */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [camError, setCamError] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');

  // Fetch alerts from backend
  useEffect(() => {
    getAlertSummary().then(setAlertSummary).catch(() => {});
    getActiveAlerts().then(setActiveAlerts).catch(() => {});
  }, []);

  // Enumerate video devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((all) => {
      const vids = all.filter((d) => d.kind === 'videoinput');
      setDevices(vids);
      if (vids.length > 0 && !selectedDevice) setSelectedDevice(vids[0].deviceId);
    });
  }, [selectedDevice]);

  // Clean up on unmount
  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCamError('');
    try {
      const constraints = {
        video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
        audio: false,
      };
      const ms = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(ms);
      setCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch (err) {
      setCamError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow permissions.'
          : `Could not access camera: ${err.message}`
      );
    }
  }, [selectedDevice]);

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
    setCameraActive(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stream]);

  const takeSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    setSnapshots((prev) => [
      { id: Date.now(), src: c.toDataURL('image/png'), timestamp: new Date().toLocaleString() },
      ...prev,
    ]);
  }, []);

  const handleDeviceChange = (e) => {
    setSelectedDevice(e.target.value);
    if (cameraActive) stopCamera();
  };

  const handleResolve = async (alertId) => {
    try {
      await resolveAlertApi(alertId);
      setActiveAlerts((prev) => prev.filter((a) => a._id !== alertId));
      setAlertSummary((prev) => ({ ...prev, active: prev.active - 1, resolved: prev.resolved + 1 }));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Dashboard</h1>

      {/* ── Live Camera Monitoring ── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Live Camera Monitoring</h2>

        <div style={styles.controls}>
          {devices.length > 1 && (
            <select value={selectedDevice} onChange={handleDeviceChange} style={styles.select}>
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          {!cameraActive ? (
            <button onClick={startCamera} style={styles.btnStart}>▶ Start Camera</button>
          ) : (
            <>
              <button onClick={stopCamera} style={styles.btnStop}>■ Stop Camera</button>
              <button onClick={takeSnapshot} style={styles.btnSnapshot}>📸 Snapshot</button>
            </>
          )}
        </div>

        {camError && <div style={styles.error}>{camError}</div>}

        <div style={styles.feedCard}>
          <div style={styles.feedHeader}>
            <span>Live Feed</span>
            <span style={{ ...styles.statusBadge, backgroundColor: cameraActive ? '#2e7d32' : '#b71c1c' }}>
              {cameraActive ? '● LIVE' : '○ OFF'}
            </span>
          </div>
          <div style={styles.feedBody}>
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
            ) : (
              <div style={styles.placeholder}>Click "Start Camera" to begin live monitoring</div>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {snapshots.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={styles.sectionTitle}>Snapshots</h3>
            <div style={styles.snapshotGrid}>
              {snapshots.map((s) => (
                <div key={s.id} style={styles.snapshotCard}>
                  <img src={s.src} alt="snapshot" style={styles.snapshotImg} />
                  <div style={styles.snapshotTime}>{s.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Alert Status Cards ── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Alert Status</h2>
        <div style={styles.alertGrid}>
          <div style={{ ...styles.alertCard, backgroundColor: '#2e7d32' }}>
            <h3>Total Alerts</h3>
            <p style={styles.alertNumber}>{alertSummary.total}</p>
          </div>
          <div style={{ ...styles.alertCard, backgroundColor: '#b71c1c' }}>
            <h3>Active Alerts</h3>
            <p style={styles.alertNumber}>{alertSummary.active}</p>
          </div>
          <div style={{ ...styles.alertCard, backgroundColor: '#ff6f00' }}>
            <h3>Resolved</h3>
            <p style={styles.alertNumber}>{alertSummary.resolved}</p>
          </div>
        </div>
      </section>

      {/* ── Active Alerts ── */}
      {activeAlerts.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Active Alerts</h2>
          {activeAlerts.map((alert) => (
            <div key={alert._id} style={{ ...styles.activeAlert, marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>⚠️ {alert.type.toUpperCase()}</h3>
                <p>{alert.message}</p>
              </div>
              <button style={styles.resolveBtn} onClick={() => handleResolve(alert._id)}>
                Resolve
              </button>
            </div>
          ))}
        </section>
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
  section: { marginBottom: '3rem' },
  sectionTitle: {
    fontSize: '1.8rem',
    marginBottom: '1.5rem',
    color: '#fff',
  },
  /* Alert cards */
  alertGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
  },
  alertCard: {
    padding: '1.5rem',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#fff',
  },
  alertNumber: { fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0' },
  activeAlert: {
    backgroundColor: '#b71c1c',
    padding: '1.5rem',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  resolveBtn: {
    backgroundColor: '#fff',
    color: '#b71c1c',
    border: 'none',
    padding: '0.8rem 2rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  /* Camera controls */
  controls: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  select: {
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    border: '1px solid #555',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  btnStart: {
    padding: '0.6rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnStop: {
    padding: '0.6rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#b71c1c',
    color: '#fff',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnSnapshot: {
    padding: '0.6rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#1565c0',
    color: '#fff',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  error: {
    backgroundColor: '#b71c1c',
    color: '#fff',
    padding: '1rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
  },
  /* Feed */
  feedCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #333',
    maxWidth: '720px',
  },
  feedHeader: {
    backgroundColor: '#2a2a2a',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #444',
    fontWeight: 'bold',
  },
  statusBadge: {
    padding: '0.3rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: '#fff',
  },
  feedBody: {
    backgroundColor: '#000',
    minHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: { width: '100%', display: 'block' },
  placeholder: { color: '#888', fontFamily: 'monospace', fontSize: '1rem' },
  /* Snapshots */
  snapshotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  snapshotCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #333',
  },
  snapshotImg: { width: '100%', display: 'block' },
  snapshotTime: {
    padding: '0.5rem',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#aaa',
  },
};

export default Dashboard;
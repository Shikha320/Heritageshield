import React, { useRef, useState, useEffect, useCallback } from 'react';

const Cameras = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');

  // Enumerate available video devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    });
  }, [selectedDevice]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const constraints = {
        video: selectedDevice
          ? { deviceId: { exact: selectedDevice } }
          : true,
        audio: false,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera permissions in your browser.'
          : `Could not access camera: ${err.message}`
      );
    }
  }, [selectedDevice]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const takeSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    setSnapshots((prev) => [
      { id: Date.now(), src: dataUrl, timestamp: new Date().toLocaleString() },
      ...prev,
    ]);
  }, []);

  const handleDeviceChange = (e) => {
    setSelectedDevice(e.target.value);
    if (cameraActive) {
      stopCamera();
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Camera Monitoring</h1>

      {/* Controls */}
      <div style={styles.controls}>
        {devices.length > 1 && (
          <select
            value={selectedDevice}
            onChange={handleDeviceChange}
            style={styles.select}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
        {!cameraActive ? (
          <button onClick={startCamera} style={styles.btnStart}>
            ▶ Start Camera
          </button>
        ) : (
          <>
            <button onClick={stopCamera} style={styles.btnStop}>
              ■ Stop Camera
            </button>
            <button onClick={takeSnapshot} style={styles.btnSnapshot}>
              📸 Take Snapshot
            </button>
          </>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Live Feed */}
      <div style={styles.feedWrapper}>
        <div style={styles.feedCard}>
          <div style={styles.feedHeader}>
            <span>Live Feed</span>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: cameraActive ? '#2e7d32' : '#b71c1c',
              }}
            >
              {cameraActive ? '● LIVE' : '○ OFF'}
            </span>
          </div>
          <div style={styles.feedBody}>
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={styles.video}
              />
            ) : (
              <div style={styles.placeholder}>
                Click "Start Camera" to begin live monitoring
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas for snapshots */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Snapshots */}
      {snapshots.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Snapshots</h2>
          <div style={styles.snapshotGrid}>
            {snapshots.map((snap) => (
              <div key={snap.id} style={styles.snapshotCard}>
                <img src={snap.src} alt="snapshot" style={styles.snapshotImg} />
                <div style={styles.snapshotTime}>{snap.timestamp}</div>
              </div>
            ))}
          </div>
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
    marginBottom: '1.5rem',
    borderBottom: '2px solid #d32f2f',
    paddingBottom: '0.5rem',
  },
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
  feedWrapper: {
    marginBottom: '2rem',
  },
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
  video: {
    width: '100%',
    display: 'block',
  },
  placeholder: {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: '1rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    borderBottom: '1px solid #333',
    paddingBottom: '0.5rem',
  },
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
  snapshotImg: {
    width: '100%',
    display: 'block',
  },
  snapshotTime: {
    padding: '0.5rem',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#aaa',
  },
};

export default Cameras;
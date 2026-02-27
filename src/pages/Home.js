import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo, analyzeVideo } from '../api';

const Home = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const liveCameraRef = useRef(null);
  const liveStreamRef = useRef(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [liveCameraError, setLiveCameraError] = useState('');

  const stopLiveStream = () => {
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((track) => track.stop());
      liveStreamRef.current = null;
    }
    if (liveCameraRef.current) {
      liveCameraRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const startLiveCamera = async () => {
      if (!uploadedVideo) {
        setLiveCameraError('');
        stopLiveStream();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setLiveCameraError('Camera is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        liveStreamRef.current = stream;
        if (liveCameraRef.current) {
          liveCameraRef.current.srcObject = stream;
        }
        setLiveCameraError('');
      } catch (_err) {
        setLiveCameraError('Unable to access live camera feed.');
      }
    };

    startLiveCamera();

    return () => {
      mounted = false;
      stopLiveStream();
    };
  }, [uploadedVideo]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file.');
      return;
    }
    setVideoName(file.name);
    const url = URL.createObjectURL(file);
    setUploadedVideo(url);
    setAnalysisResult(null);
    setAnalysisError('');

    // Upload to backend
    setUploading(true);
    try {
      const saved = await uploadVideo(file);
      setUploading(false);

      // Automatically trigger analysis
      setAnalyzing(true);
      try {
        const result = await analyzeVideo(saved._id);
        setAnalysisResult(result);
      } catch (err) {
        setAnalysisError(err.message || 'Analysis failed');
      } finally {
        setAnalyzing(false);
      }
    } catch (err) {
      console.error('Upload failed:', err.message);
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeVideo = () => {
    if (uploadedVideo) URL.revokeObjectURL(uploadedVideo);
    stopLiveStream();
    setUploadedVideo(null);
    setVideoName('');
    setAnalysisResult(null);
    setAnalysisError('');
    setLiveCameraError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <h1 style={styles.title}>Protect Our Heritage</h1>
        <p style={styles.subtitle}>
          Real‑time surveillance and alert system for historical monuments.
        </p>
        <div style={styles.buttonGroup}>
          <button style={styles.primaryBtn} onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
          <button style={styles.secondaryBtn} onClick={() => navigate('/cameras')}>
            View Cameras
          </button>
        </div>
      </section>

      {/* Overview */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>System Overview</h2>
        <p style={styles.text}>
          The Monument Protection Surveillance System uses AI‑powered cameras and
          motion sensors to detect potential vandalism or damage. Security teams
          receive instant alerts and can respond immediately.
        </p>
      </section>

      {/* Benefits */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Key Benefits</h2>
        <div style={styles.benefitsGrid}>
          <div style={styles.benefitCard}>
            <h3>24/7 Monitoring</h3>
            <p>Round‑the‑clock camera surveillance with night vision.</p>
          </div>
          <div style={styles.benefitCard}>
            <h3>Instant Alerts</h3>
            <p>Immediate notifications for suspicious activity.</p>
          </div>
          <div style={styles.benefitCard}>
            <h3>Incident Reports</h3>
            <p>Detailed history and analytics for every event.</p>
          </div>
        </div>
      </section>
      {/* Video Upload */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Upload Video for Analysis</h2>
        <p style={{ ...styles.text, marginBottom: '1.5rem' }}>
          Upload surveillance footage to analyse for potential threats or incidents at monument sites.
        </p>

        {!uploadedVideo ? (
          <div
            style={{
              ...styles.dropZone,
              borderColor: dragOver ? '#d32f2f' : '#555',
              backgroundColor: dragOver ? 'rgba(211,47,47,0.08)' : '#1e1e1e',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <div style={styles.uploadIcon}>🎬</div>
            <p style={styles.dropText}>
              Drag &amp; drop a video here, or <span style={styles.browseLink}>browse</span>
            </p>
            <p style={styles.dropHint}>Supports MP4, WebM, OGG — Max 500 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div style={styles.previewWrapper}>
            <div style={styles.previewHeader}>
              <span style={styles.videoFileName}>
                📁 {videoName}
                {uploading && <span style={{ color: '#ff6f00' }}> — Uploading…</span>}
                {analyzing && <span style={{ color: '#42a5f5' }}> — Analyzing with YOLOv8…</span>}
              </span>
              <button style={styles.removeBtn} onClick={removeVideo}>✕ Remove</button>
            </div>
            <div style={styles.splitLayout}>
              <div style={styles.splitPane}>
                <h4 style={styles.splitPaneTitle}>Uploaded Video</h4>
                <div style={styles.squareBox}>
                  <video
                    src={uploadedVideo}
                    controls
                    style={styles.squareVideo}
                  />
                </div>
              </div>

              <div style={styles.splitPane}>
                <h4 style={styles.splitPaneTitle}>Live Camera Feed</h4>
                <div style={styles.squareBox}>
                  {liveCameraError ? (
                    <div style={styles.cameraError}>{liveCameraError}</div>
                  ) : (
                    <video
                      ref={liveCameraRef}
                      autoPlay
                      muted
                      playsInline
                      style={styles.squareVideo}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Analysis Progress */}
            {analyzing && (
              <div style={styles.analysisStatus}>
                <div style={styles.spinner} />
                <span>Running YOLOv8 object detection on video frames… This may take a minute.</span>
              </div>
            )}

            {/* Analysis Error */}
            {analysisError && (
              <div style={styles.analysisErrorBox}>
                <strong>⚠️ Analysis Error:</strong> {analysisError}
              </div>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <div style={styles.resultsContainer}>
                <h3 style={styles.resultsTitle}>🔍 Analysis Results</h3>

                {/* Stats Row */}
                <div style={styles.statsRow}>
                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Frames Analyzed</span>
                    <span style={styles.statValue}>{analysisResult.analyzedFrames}/{analysisResult.totalFrames}</span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Objects Found</span>
                    <span style={styles.statValue}>
                      {analysisResult.detections ? analysisResult.detections.length : 0}
                    </span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={styles.statLabel}>Alerts Generated</span>
                    <span style={{ ...styles.statValue, color: analysisResult.alerts?.length > 0 ? '#ef5350' : '#66bb6a' }}>
                      {analysisResult.alerts ? analysisResult.alerts.length : 0}
                    </span>
                  </div>
                </div>

                {/* Detection Summary */}
                {analysisResult.summary && Object.keys(analysisResult.summary).length > 0 && (
                  <div style={styles.summarySection}>
                    <h4 style={styles.subTitle}>Detected Objects</h4>
                    <div style={styles.tagGrid}>
                      {Object.entries(analysisResult.summary).map(([cls, count]) => (
                        <span key={cls} style={styles.tag}>
                          {cls}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {analysisResult.alerts && analysisResult.alerts.length > 0 ? (
                  <div style={styles.alertsSection}>
                    <h4 style={styles.subTitle}>⚠️ Alerts</h4>
                    {analysisResult.alerts.map((alert, i) => (
                      <div key={alert._id || i} style={{
                        ...styles.alertItem,
                        borderLeft: `4px solid ${
                          alert.severity === 'high' ? '#d32f2f' :
                          alert.severity === 'medium' ? '#ff6f00' : '#2e7d32'
                        }`,
                      }}>
                        <div style={styles.alertTop}>
                          <span style={{
                            ...styles.severityBadge,
                            backgroundColor: alert.severity === 'high' ? '#d32f2f' :
                              alert.severity === 'medium' ? '#ff6f00' : '#2e7d32',
                          }}>
                            {(alert.severity || 'medium').toUpperCase()}
                          </span>
                          <span style={styles.alertType}>{(alert.type || 'motion').toUpperCase()}</span>
                        </div>
                        <p style={styles.alertMsg}>{alert.message}</p>
                      </div>
                    ))}
                    <button
                      style={styles.viewAllAlertsBtn}
                      onClick={() => navigate('/alerts')}
                    >
                      View All Alerts →
                    </button>
                  </div>
                ) : analysisResult.analyzedFrames > 0 ? (
                  <div style={styles.noAlerts}>
                    <p style={{ fontSize: '2rem', margin: 0 }}>✅</p>
                    <p style={{ color: '#66bb6a', fontWeight: 'bold' }}>No threats detected — area appears safe</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </section>
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
  hero: {
    textAlign: 'center',
    padding: '4rem 1rem',
    background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
    borderRadius: '8px',
    marginBottom: '3rem',
  },
  title: {
    fontSize: '3rem',
    marginBottom: '1rem',
    color: '#fff',
  },
  subtitle: {
    fontSize: '1.3rem',
    color: '#ccc',
    marginBottom: '2rem',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
  },
  primaryBtn: {
    backgroundColor: '#d32f2f',
    color: '#fff',
    border: 'none',
    padding: '0.8rem 2rem',
    fontSize: '1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid #d32f2f',
    padding: '0.8rem 2rem',
    fontSize: '1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  section: {
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontSize: '2rem',
    borderBottom: '2px solid #d32f2f',
    paddingBottom: '0.5rem',
    marginBottom: '1.5rem',
  },
  text: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    color: '#ddd',
  },
  benefitsGrid: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  benefitCard: {
    flex: '1 1 250px',
    backgroundColor: '#1e1e1e',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  dropZone: {
    border: '2px dashed #555',
    borderRadius: '10px',
    padding: '3rem 2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  uploadIcon: {
    fontSize: '3rem',
    marginBottom: '0.8rem',
  },
  dropText: {
    fontSize: '1.1rem',
    color: '#ccc',
    marginBottom: '0.5rem',
  },
  browseLink: {
    color: '#d32f2f',
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  dropHint: {
    fontSize: '0.85rem',
    color: '#777',
  },
  previewWrapper: {
    backgroundColor: '#1e1e1e',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #333',
    width: '100%',
    maxWidth: '1200px',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem 1rem',
    backgroundColor: '#2a2a2a',
    borderBottom: '1px solid #444',
  },
  videoFileName: {
    color: '#ccc',
    fontSize: '0.95rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '80%',
  },
  removeBtn: {
    background: 'none',
    border: '1px solid #b71c1c',
    color: '#ef5350',
    padding: '0.3rem 0.8rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    padding: '1rem',
    borderBottom: '1px solid #333',
  },
  splitPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  splitPaneTitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#bdbdbd',
  },
  squareBox: {
    width: '100%',
    aspectRatio: '1 / 1',
    backgroundColor: '#111',
    border: '1px solid #444',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  cameraError: {
    color: '#ef9a9a',
    fontSize: '0.95rem',
    textAlign: 'center',
    padding: '1rem',
  },
  /* ── Analysis styles ── */
  analysisStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.2rem 1.5rem',
    backgroundColor: '#1a237e',
    color: '#90caf9',
    fontSize: '0.95rem',
    borderTop: '1px solid #333',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid #555',
    borderTop: '3px solid #42a5f5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    flexShrink: 0,
  },
  analysisErrorBox: {
    padding: '1rem 1.5rem',
    backgroundColor: '#4a1111',
    color: '#ef9a9a',
    borderTop: '1px solid #333',
    fontSize: '0.95rem',
  },
  resultsContainer: {
    padding: '1.5rem',
    borderTop: '1px solid #333',
  },
  resultsTitle: {
    margin: '0 0 1.2rem',
    fontSize: '1.3rem',
    color: '#fff',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#888',
    marginBottom: '0.3rem',
  },
  statValue: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  summarySection: {
    marginBottom: '1.5rem',
  },
  subTitle: {
    margin: '0 0 0.8rem',
    fontSize: '1.05rem',
    color: '#ccc',
  },
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  tag: {
    backgroundColor: '#2a2a2a',
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    color: '#ddd',
    border: '1px solid #444',
  },
  alertsSection: {
    marginBottom: '1rem',
  },
  alertItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: '6px',
    padding: '1rem 1.2rem',
    marginBottom: '0.8rem',
  },
  alertTop: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  severityBadge: {
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  alertType: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#90caf9',
    backgroundColor: '#1a237e',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
  },
  alertMsg: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#ddd',
    lineHeight: 1.5,
  },
  viewAllAlertsBtn: {
    marginTop: '0.5rem',
    padding: '0.6rem 1.5rem',
    borderRadius: '6px',
    border: '1px solid #d32f2f',
    backgroundColor: 'transparent',
    color: '#ef5350',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  noAlerts: {
    textAlign: 'center',
    padding: '2rem 0',
  },
};

export default Home;
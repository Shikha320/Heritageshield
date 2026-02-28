import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo, analyzeVideo, createSnapshotAlert, createAlert } from '../api';

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
  const [cameraOn, setCameraOn] = useState(true);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [uploadType, setUploadType] = useState('video'); // 'video' or 'image'
  const [uploadCameraId, setUploadCameraId] = useState('Camera 1');
  const [uploadGateNo, setUploadGateNo] = useState('Gate 1');
  const [uploadLocation, setUploadLocation] = useState('Main Entrance');
  const [uploadSeverity, setUploadSeverity] = useState('medium');
  const [savingImage, setSavingImage] = useState(false);
  // Live camera settings (dynamic)
  const [liveCameraId, setLiveCameraId] = useState('Camera 1');
  const [liveGateNo, setLiveGateNo] = useState('Gate 1');
  const [liveLocation, setLiveLocation] = useState('Main Entrance');
  const [liveResolution, setLiveResolution] = useState('1280x720');
  const [liveCameraType, setLiveCameraType] = useState('Webcam');

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
      if (!cameraOn) {
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
  }, [cameraOn]);

  const toggleCamera = () => {
    setCameraOn(!cameraOn);
  };

  const takeSnapshot = async () => {
    if (!liveCameraRef.current || !cameraOn || savingSnapshot) return;
    const video = liveCameraRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    
    // Save directly to alerts with dynamic camera info
    setSavingSnapshot(true);
    try {
      await createAlert({
        type: 'snapshot',
        message: `Snapshot captured from ${liveCameraId} at ${liveLocation}`,
        camera: liveCameraId,
        gate: liveGateNo,
        location: liveLocation,
        image: dataUrl,
        severity: 'low'
      });
      // Navigate to alerts page
      navigate('/alerts');
    } catch (err) {
      console.error('Failed to save snapshot:', err);
      alert('Failed to save snapshot to alerts');
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    
    // Check if it's an image or video
    if (file.type.startsWith('image/')) {
      setUploadType('image');
      setImageName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
      setUploadedVideo(null);
      setVideoName('');
      setAnalysisResult(null);
      setAnalysisError('');
      return;
    }
    
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video or image file.');
      return;
    }
    
    setUploadType('video');
    setUploadedImage(null);
    setImageName('');
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

  const saveImageToAlerts = async () => {
    if (!uploadedImage || savingImage) return;
    
    setSavingImage(true);
    try {
      await createAlert({
        type: 'uploaded_image',
        message: `Uploaded image: ${imageName}`,
        camera: uploadCameraId,
        location: uploadLocation,
        gate: uploadGateNo,
        image: uploadedImage,
        severity: uploadSeverity
      });
      // Clear and navigate
      setUploadedImage(null);
      setImageName('');
      navigate('/alerts');
    } catch (err) {
      console.error('Failed to save image:', err);
      alert('Failed to save image to alerts');
    } finally {
      setSavingImage(false);
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
    setUploadedImage(null);
    setVideoName('');
    setImageName('');
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
          <button style={styles.primaryBtn} onClick={() => navigate('/alerts')}>
            View Alerts
          </button>
        </div>
      </section>

      {/* Overview */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>System Overview</h2>
        <p style={styles.text}>
          The HeritageShield Surveillance System uses AI‑powered cameras and
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
      {/* Video Upload & Live Camera */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Surveillance Monitor</h2>
        <p style={{ ...styles.text, marginBottom: '1.5rem' }}>
          Upload surveillance footage to analyse for potential threats or monitor live camera feed.
        </p>

        <div style={styles.mainSplitLayout}>
          {/* Left Side - Upload Section */}
          <div style={styles.mainSplitPane}>
            <h4 style={styles.splitPaneTitle}>Upload Image/Video for Analysis</h4>
            {!uploadedVideo && !uploadedImage ? (
              <div
                style={{
                  ...styles.dropZoneHalf,
                  borderColor: dragOver ? '#d32f2f' : '#555',
                  backgroundColor: dragOver ? 'rgba(211,47,47,0.08)' : '#1e1e1e',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <div style={styles.uploadIconSmall}>🎬 🖼️</div>
                <p style={styles.dropTextSmall}>
                  Drag &amp; drop a video or image, or <span style={styles.browseLink}>browse</span>
                </p>
                <p style={styles.dropHintSmall}>MP4, WebM, OGG, JPG, PNG — Max 500 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            ) : uploadedImage ? (
              <div style={styles.uploadedVideoPane}>
                <div style={styles.uploadedHeader}>
                  <span style={styles.videoFileNameSmall}>
                    🖼️ {imageName}
                  </span>
                  <button style={styles.removeBtn} onClick={removeVideo}>✕</button>
                </div>
                <div style={styles.imageUploadContainer}>
                  <img src={uploadedImage} alt="Uploaded" style={styles.uploadedImagePreview} />
                  <div style={styles.imageInfoForm}>
                    <h5 style={styles.formTitle}>📋 Image Information</h5>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Camera ID</label>
                      <select 
                        value={uploadCameraId} 
                        onChange={(e) => setUploadCameraId(e.target.value)}
                        style={styles.formInput}
                      >
                        <option value="Camera 1">Camera 1</option>
                        <option value="Camera 2">Camera 2</option>
                        <option value="Camera 3">Camera 3</option>
                        <option value="Camera 4">Camera 4</option>
                        <option value="Camera 5">Camera 5</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Gate No.</label>
                      <select 
                        value={uploadGateNo} 
                        onChange={(e) => setUploadGateNo(e.target.value)}
                        style={styles.formInput}
                      >
                        <option value="Gate 1">Gate 1</option>
                        <option value="Gate 2">Gate 2</option>
                        <option value="Gate 3">Gate 3</option>
                        <option value="Gate 4">Gate 4</option>
                        <option value="Main Gate">Main Gate</option>
                        <option value="Back Gate">Back Gate</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Location</label>
                      <select 
                        value={uploadLocation} 
                        onChange={(e) => setUploadLocation(e.target.value)}
                        style={styles.formInput}
                      >
                        <option value="Main Entrance">Main Entrance</option>
                        <option value="North Wing">North Wing</option>
                        <option value="South Wing">South Wing</option>
                        <option value="East Courtyard">East Courtyard</option>
                        <option value="West Courtyard">West Courtyard</option>
                        <option value="Monument Center">Monument Center</option>
                        <option value="Parking Area">Parking Area</option>
                        <option value="Garden Area">Garden Area</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Severity</label>
                      <select 
                        value={uploadSeverity} 
                        onChange={(e) => setUploadSeverity(e.target.value)}
                        style={styles.formInput}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <button 
                      style={{
                        ...styles.saveImageBtn,
                        opacity: savingImage ? 0.6 : 1,
                        cursor: savingImage ? 'not-allowed' : 'pointer'
                      }}
                      onClick={saveImageToAlerts}
                      disabled={savingImage}
                    >
                      {savingImage ? '⏳ Saving...' : '💾 Save to Alerts'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.uploadedVideoPane}>
                <div style={styles.uploadedHeader}>
                  <span style={styles.videoFileNameSmall}>
                    📁 {videoName}
                    {uploading && <span style={{ color: '#ff6f00' }}> — Uploading…</span>}
                    {analyzing && <span style={{ color: '#42a5f5' }}> — Analyzing…</span>}
                  </span>
                  <button style={styles.removeBtn} onClick={removeVideo}>✕</button>
                </div>
                <div style={styles.videoBox}>
                  <video
                    src={uploadedVideo}
                    controls
                    style={styles.squareVideo}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Live Camera with Info Panel */}
          <div style={styles.mainSplitPane}>
            <div style={styles.cameraHeader}>
              <h4 style={styles.splitPaneTitle}>Live Camera Feed</h4>
              <div style={styles.cameraControls}>
                <button
                  style={{
                    ...styles.cameraBtn,
                    backgroundColor: cameraOn ? '#2e7d32' : '#d32f2f',
                  }}
                  onClick={toggleCamera}
                >
                  {cameraOn ? '⏸ Off' : '▶ On'}
                </button>
                <button
                  style={{
                    ...styles.cameraBtn,
                    backgroundColor: savingSnapshot ? '#ff6f00' : '#1565c0',
                    opacity: cameraOn && !liveCameraError && !savingSnapshot ? 1 : 0.5,
                    cursor: cameraOn && !liveCameraError && !savingSnapshot ? 'pointer' : 'not-allowed',
                  }}
                  onClick={takeSnapshot}
                  disabled={!cameraOn || !!liveCameraError || savingSnapshot}
                >
                  {savingSnapshot ? '⏳ Saving...' : '📷 Snap'}
                </button>
              </div>
            </div>
            <div style={styles.cameraWithInfo}>
              {/* Left Info Panel */}
              <div style={styles.cameraInfoPanel}>
                <h5 style={styles.infoPanelTitle}>📋 Camera Info</h5>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Camera ID</span>
                  <select 
                    value={liveCameraId} 
                    onChange={(e) => setLiveCameraId(e.target.value)}
                    style={styles.infoSelect}
                  >
                    <option value="Camera 1">Camera 1</option>
                    <option value="Camera 2">Camera 2</option>
                    <option value="Camera 3">Camera 3</option>
                    <option value="Camera 4">Camera 4</option>
                    <option value="Camera 5">Camera 5</option>
                  </select>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Gate No.</span>
                  <select 
                    value={liveGateNo} 
                    onChange={(e) => setLiveGateNo(e.target.value)}
                    style={styles.infoSelect}
                  >
                    <option value="Gate 1">Gate 1</option>
                    <option value="Gate 2">Gate 2</option>
                    <option value="Gate 3">Gate 3</option>
                    <option value="Gate 4">Gate 4</option>
                    <option value="Main Gate">Main Gate</option>
                    <option value="Back Gate">Back Gate</option>
                  </select>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Location</span>
                  <select 
                    value={liveLocation} 
                    onChange={(e) => setLiveLocation(e.target.value)}
                    style={styles.infoSelect}
                  >
                    <option value="Main Entrance">Main Entrance</option>
                    <option value="North Wing">North Wing</option>
                    <option value="South Wing">South Wing</option>
                    <option value="East Courtyard">East Courtyard</option>
                    <option value="West Courtyard">West Courtyard</option>
                    <option value="Monument Center">Monument Center</option>
                    <option value="Parking Area">Parking Area</option>
                    <option value="Garden Area">Garden Area</option>
                  </select>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Status</span>
                  <span style={{ ...styles.infoValue, color: cameraOn ? '#66bb6a' : '#ef5350' }}>
                    {cameraOn ? '● Online' : '○ Offline'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Resolution</span>
                  <select 
                    value={liveResolution} 
                    onChange={(e) => setLiveResolution(e.target.value)}
                    style={styles.infoSelect}
                  >
                    <option value="1920x1080">1920x1080</option>
                    <option value="1280x720">1280x720</option>
                    <option value="640x480">640x480</option>
                    <option value="320x240">320x240</option>
                  </select>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Type</span>
                  <select 
                    value={liveCameraType} 
                    onChange={(e) => setLiveCameraType(e.target.value)}
                    style={styles.infoSelect}
                  >
                    <option value="Webcam">Webcam</option>
                    <option value="IP Camera">IP Camera</option>
                    <option value="CCTV">CCTV</option>
                    <option value="PTZ Camera">PTZ Camera</option>
                    <option value="Dome Camera">Dome Camera</option>
                  </select>
                </div>
              </div>
              {/* Camera Feed */}
              <div style={styles.videoBoxWithInfo}>
                {!cameraOn ? (
                  <div style={styles.cameraOff}>Camera is off</div>
                ) : liveCameraError ? (
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
        </div>

        {/* Analysis Results Section */}
        {uploadedVideo && (
          <div style={styles.resultsWrapper}>
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
  dropZoneHalf: {
    border: '2px dashed #555',
    borderRadius: '10px',
    padding: '1.5rem 1rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    aspectRatio: '4 / 3',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSplitLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  mainSplitPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  cameraHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraControls: {
    display: 'flex',
    gap: '0.5rem',
  },
  cameraBtn: {
    padding: '0.3rem 0.6rem',
    borderRadius: '4px',
    border: 'none',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  videoBox: {
    width: '100%',
    aspectRatio: '4 / 3',
    backgroundColor: '#111',
    border: '1px solid #444',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWithInfo: {
    display: 'flex',
    gap: '0.8rem',
  },
  cameraInfoPanel: {
    width: '140px',
    flexShrink: 0,
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '0.8rem',
  },
  infoPanelTitle: {
    margin: '0 0 0.8rem 0',
    fontSize: '0.85rem',
    color: '#fff',
    borderBottom: '1px solid #444',
    paddingBottom: '0.5rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0.6rem',
  },
  infoLabel: {
    fontSize: '0.7rem',
    color: '#888',
    marginBottom: '0.15rem',
  },
  infoValue: {
    fontSize: '0.85rem',
    color: '#ddd',
    fontWeight: '500',
  },
  infoSelect: {
    width: '100%',
    padding: '0.3rem 0.4rem',
    borderRadius: '4px',
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: '0.75rem',
    outline: 'none',
    cursor: 'pointer',
  },
  videoBoxWithInfo: {
    flex: 1,
    aspectRatio: '4 / 3',
    backgroundColor: '#111',
    border: '1px solid #444',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOff: {
    color: '#888',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  snapshotPreview: {
    marginTop: '0.5rem',
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  snapshotHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.4rem 0.6rem',
    backgroundColor: '#2a2a2a',
    borderBottom: '1px solid #444',
  },
  snapActionBtn: {
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: 'transparent',
    color: '#ccc',
    fontSize: '0.7rem',
    cursor: 'pointer',
  },
  snapshotImg: {
    width: '100%',
    display: 'block',
  },
  snapshotDetails: {
    padding: '0.6rem',
    backgroundColor: '#252525',
    borderTop: '1px solid #444',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.25rem 0',
    fontSize: '0.8rem',
  },
  detailLabel: {
    color: '#888',
  },
  detailValue: {
    color: '#ccc',
    fontWeight: '500',
  },
  snapshotActions: {
    padding: '0.6rem',
    backgroundColor: '#1e1e1e',
    borderTop: '1px solid #444',
    display: 'flex',
    justifyContent: 'center',
  },
  saveAlertBtn: {
    padding: '0.5rem 1.2rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#d32f2f',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  savedBadge: {
    padding: '0.5rem 1.2rem',
    borderRadius: '6px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  uploadIconSmall: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  dropTextSmall: {
    fontSize: '0.95rem',
    color: '#ccc',
    marginBottom: '0.3rem',
  },
  dropHintSmall: {
    fontSize: '0.75rem',
    color: '#777',
  },
  videoFileNameSmall: {
    color: '#ccc',
    fontSize: '0.85rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '70%',
  },
  uploadedVideoPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  uploadedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
  },
  resultsWrapper: {
    backgroundColor: '#1e1e1e',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #333',
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
  imageUploadContainer: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  uploadedImagePreview: {
    width: '50%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#111',
  },
  imageInfoForm: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    backgroundColor: '#1a1a1a',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  formTitle: {
    margin: '0 0 0.5rem 0',
    color: '#fff',
    fontSize: '0.9rem',
    borderBottom: '1px solid #444',
    paddingBottom: '0.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  formLabel: {
    fontSize: '0.75rem',
    color: '#aaa',
    fontWeight: 'bold',
  },
  formInput: {
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: '0.85rem',
    outline: 'none',
  },
  saveImageBtn: {
    marginTop: '0.5rem',
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2e7d32',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default Home;
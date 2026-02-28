const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Incidents ──
export const getIncidents = () => request('/incidents');
export const createIncident = (data) =>
  request('/incidents', { method: 'POST', body: JSON.stringify(data) });
export const updateIncidentStatus = (id, status) =>
  request(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteIncident = (id) =>
  request(`/incidents/${id}`, { method: 'DELETE' });

// ── Alerts ──
export const getAlerts = () => request('/alerts');
export const getActiveAlerts = () => request('/alerts/active');
export const getAlertSummary = () => request('/alerts/summary');
export const createAlert = (data) =>
  request('/alerts', { method: 'POST', body: JSON.stringify(data) });
export const createSnapshotAlert = async (imageData, camera, location) => {
  const data = {
    type: 'snapshot',
    message: `Snapshot captured from ${camera || 'Camera'}${location ? ' at ' + location : ''}`,
    camera: camera || 'Camera 1',
    location: location || 'Main Entrance',
    image: imageData,
    severity: 'low'
  };
  return request('/alerts', { method: 'POST', body: JSON.stringify(data) });
};
export const resolveAlert = (id) =>
  request(`/alerts/${id}/resolve`, { method: 'PATCH' });
export const deleteAlert = (id) =>
  request(`/alerts/${id}`, { method: 'DELETE' });

// ── Reports ──
export const getReportSummary = () => request('/reports/summary');
export const getDailyStats = () => request('/reports/daily');

// ── Videos ──
export const getVideos = () => request('/videos');
export const uploadVideo = async (file) => {
  const formData = new FormData();
  formData.append('video', file);
  const res = await fetch(`${API_BASE}/videos`, { method: 'POST', body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Upload failed');
  }
  return res.json();
};
export const deleteVideo = (id) =>
  request(`/videos/${id}`, { method: 'DELETE' });

// ── Video Analysis ──
export const analyzeVideo = (id) =>
  request(`/videos/analyze/${id}`, { method: 'POST' });

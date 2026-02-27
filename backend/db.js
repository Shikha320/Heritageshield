const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

// Default data
const defaults = {
  incidents: [
    { id: 'INC001', camera: 'CAM-01', description: 'Suspicious movement near main gate', status: 'Resolved', created_at: '2025-02-26 14:23:00', updated_at: '2025-02-26 14:23:00' },
    { id: 'INC002', camera: 'CAM-03', description: 'Unidentified person at east wing',   status: 'Pending',  created_at: '2025-02-26 09:47:00', updated_at: '2025-02-26 09:47:00' },
    { id: 'INC003', camera: 'CAM-02', description: 'Motion detected at west wall',       status: 'Resolved', created_at: '2025-02-25 22:15:00', updated_at: '2025-02-25 22:15:00' },
    { id: 'INC004', camera: 'CAM-05', description: 'Object left near tower entrance',    status: 'Resolved', created_at: '2025-02-25 18:30:00', updated_at: '2025-02-25 18:30:00' },
    { id: 'INC005', camera: 'CAM-04', description: 'Vandalism attempt on south garden',  status: 'Unresolved', created_at: '2025-02-24 11:02:00', updated_at: '2025-02-24 11:02:00' },
    { id: 'INC006', camera: 'CAM-06', description: 'Fence breach near north entrance',   status: 'Resolved', created_at: '2025-02-24 06:50:00', updated_at: '2025-02-24 06:50:00' },
    { id: 'INC007', camera: 'CAM-02', description: 'Repeated motion alert overnight',    status: 'Pending',  created_at: '2025-02-23 20:10:00', updated_at: '2025-02-23 20:10:00' },
  ],
  alerts: [
    { id: 1, type: 'motion',    message: 'Motion detected near Camera 02 – Main Entrance', camera: 'CAM-02', severity: 'high',   resolved: 0, created_at: '2025-02-26 14:20:00' },
    { id: 2, type: 'intrusion', message: 'Perimeter breach at east wing',                  camera: 'CAM-03', severity: 'high',   resolved: 0, created_at: '2025-02-26 09:45:00' },
    { id: 3, type: 'motion',    message: 'Movement after hours at courtyard',              camera: 'CAM-04', severity: 'medium', resolved: 1, created_at: '2025-02-25 23:10:00' },
    { id: 4, type: 'motion',    message: 'Camera offline – Tower',                         camera: 'CAM-05', severity: 'low',    resolved: 1, created_at: '2025-02-25 17:00:00' },
  ],
  videos: [],
  daily_stats: [
    { date: '2025-02-26', total_alerts: 5, resolved: 3 },
    { date: '2025-02-25', total_alerts: 7, resolved: 6 },
    { date: '2025-02-24', total_alerts: 4, resolved: 4 },
    { date: '2025-02-23', total_alerts: 8, resolved: 5 },
  ],
  _nextAlertId: 5,
};

// Load or create DB
function load() {
  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
  save(defaults);
  return { ...defaults };
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const db = {
  _data: load(),

  get data() { return this._data; },

  persist() { save(this._data); },

  // ── Incidents ──
  getIncidents() { return [...this._data.incidents].reverse(); },
  getIncident(id) { return this._data.incidents.find((i) => i.id === id); },
  createIncident(inc) { this._data.incidents.push(inc); this.persist(); return inc; },
  updateIncident(id, updates) {
    const idx = this._data.incidents.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    Object.assign(this._data.incidents[idx], updates, { updated_at: new Date().toISOString() });
    this.persist();
    return this._data.incidents[idx];
  },
  deleteIncident(id) {
    const idx = this._data.incidents.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this._data.incidents.splice(idx, 1);
    this.persist();
    return true;
  },

  // ── Alerts ──
  getAlerts() { return [...this._data.alerts].reverse(); },
  getActiveAlerts() { return this._data.alerts.filter((a) => !a.resolved).reverse(); },
  getAlertSummary() {
    const total = this._data.alerts.length;
    const active = this._data.alerts.filter((a) => !a.resolved).length;
    return { total, active, resolved: total - active };
  },
  createAlert(alert) {
    alert.id = this._data._nextAlertId++;
    this._data.alerts.push(alert);
    this.persist();
    return alert;
  },
  resolveAlert(id) {
    const a = this._data.alerts.find((a) => a.id === Number(id));
    if (!a) return null;
    a.resolved = 1;
    this.persist();
    return a;
  },
  deleteAlert(id) {
    const idx = this._data.alerts.findIndex((a) => a.id === Number(id));
    if (idx === -1) return false;
    this._data.alerts.splice(idx, 1);
    this.persist();
    return true;
  },

  // ── Videos ──
  getVideos() { return [...this._data.videos].reverse(); },
  createVideo(vid) { this._data.videos.push(vid); this.persist(); return vid; },
  getVideo(id) { return this._data.videos.find((v) => v.id === id); },
  deleteVideo(id) {
    const idx = this._data.videos.findIndex((v) => v.id === id);
    if (idx === -1) return false;
    this._data.videos.splice(idx, 1);
    this.persist();
    return true;
  },

  // ── Daily Stats ──
  getDailyStats() { return [...this._data.daily_stats].sort((a, b) => b.date.localeCompare(a.date)); },
  upsertDailyStat(stat) {
    const idx = this._data.daily_stats.findIndex((s) => s.date === stat.date);
    if (idx !== -1) Object.assign(this._data.daily_stats[idx], stat);
    else this._data.daily_stats.push(stat);
    this.persist();
    return this._data.daily_stats.find((s) => s.date === stat.date);
  },

  // ── Report Summary ──
  getReportSummary() {
    const totalAlerts = this._data.alerts.length;
    const resolvedIncidents = this._data.incidents.filter((i) => i.status === 'Resolved').length;
    const pendingIncidents = this._data.incidents.filter((i) => i.status === 'Pending').length;
    const unresolvedIncidents = this._data.incidents.filter((i) => i.status === 'Unresolved').length;
    return { totalAlerts, resolvedIncidents, pendingIncidents, unresolvedIncidents };
  },
};

module.exports = db;

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Incident = require('./models/Incident');
const Alert = require('./models/Alert');
const DailyStat = require('./models/DailyStat');

async function seed() {
  await connectDB();

  // Only seed if collections are empty
  const incCount = await Incident.countDocuments();
  if (incCount === 0) {
    await Incident.insertMany([
      { incidentId: 'INC001', camera: 'CAM-01', description: 'Suspicious movement near main gate', status: 'Resolved', createdAt: new Date('2025-02-26T14:23:00Z') },
      { incidentId: 'INC002', camera: 'CAM-03', description: 'Unidentified person at east wing',   status: 'Pending',  createdAt: new Date('2025-02-26T09:47:00Z') },
      { incidentId: 'INC003', camera: 'CAM-02', description: 'Motion detected at west wall',       status: 'Resolved', createdAt: new Date('2025-02-25T22:15:00Z') },
      { incidentId: 'INC004', camera: 'CAM-05', description: 'Object left near tower entrance',    status: 'Resolved', createdAt: new Date('2025-02-25T18:30:00Z') },
      { incidentId: 'INC005', camera: 'CAM-04', description: 'Vandalism attempt on south garden',  status: 'Unresolved', createdAt: new Date('2025-02-24T11:02:00Z') },
      { incidentId: 'INC006', camera: 'CAM-06', description: 'Fence breach near north entrance',   status: 'Resolved', createdAt: new Date('2025-02-24T06:50:00Z') },
      { incidentId: 'INC007', camera: 'CAM-02', description: 'Repeated motion alert overnight',    status: 'Pending',  createdAt: new Date('2025-02-23T20:10:00Z') },
    ]);
    console.log('✅ Seeded incidents');
  }

  const alertCount = await Alert.countDocuments();
  if (alertCount === 0) {
    await Alert.insertMany([
      { type: 'motion',    message: 'Motion detected near Camera 02 – Main Entrance', camera: 'CAM-02', severity: 'high',   resolved: false, createdAt: new Date('2025-02-26T14:20:00Z') },
      { type: 'intrusion', message: 'Perimeter breach at east wing',                  camera: 'CAM-03', severity: 'high',   resolved: false, createdAt: new Date('2025-02-26T09:45:00Z') },
      { type: 'motion',    message: 'Movement after hours at courtyard',              camera: 'CAM-04', severity: 'medium', resolved: true,  createdAt: new Date('2025-02-25T23:10:00Z') },
      { type: 'motion',    message: 'Camera offline – Tower',                         camera: 'CAM-05', severity: 'low',    resolved: true,  createdAt: new Date('2025-02-25T17:00:00Z') },
    ]);
    console.log('✅ Seeded alerts');
  }

  const statCount = await DailyStat.countDocuments();
  if (statCount === 0) {
    await DailyStat.insertMany([
      { date: '2025-02-26', totalAlerts: 5, resolved: 3 },
      { date: '2025-02-25', totalAlerts: 7, resolved: 6 },
      { date: '2025-02-24', totalAlerts: 4, resolved: 4 },
      { date: '2025-02-23', totalAlerts: 8, resolved: 5 },
    ]);
    console.log('✅ Seeded daily stats');
  }

  console.log('✅ Seed complete');
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });

const mongoose = require('mongoose');
const dns = require('dns');

// Use Google DNS for SRV resolution (local DNS may not support SRV queries)
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://deepu033:Deepak7631@cluster1.mavgbmr.mongodb.net/monument-protection?retryWrites=true&w=majority';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;

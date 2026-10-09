const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Ensure DNS servers for resolving MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if not allowed
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Connect-app:Connect123@cluster0.fzj1k5l.mongodb.net/?appName=Cluster0";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[MongoDB] Connected to Database: ${conn.connection.name} @ ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn('[MongoDB] Remote connection warning (continuing with offline fallback):', error.message);
    return null;
  }
};

module.exports = connectDB;

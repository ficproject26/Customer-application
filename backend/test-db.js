const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI || "mongodb+srv://Connect-app:Connect123@cluster0.fzj1k5l.mongodb.net/?appName=Cluster0";

async function testConn() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("SUCCESS: Connected to MongoDB Atlas (connect_db)!");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections in connect_db:", collections.map(c => c.name));
    await mongoose.disconnect();
    console.log("Disconnected successfully.");
  } catch (err) {
    console.error("Connection Error:", err);
  }
}

testConn();

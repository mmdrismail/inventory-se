const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stockline_db', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`\x1b[32m✔ MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}\x1b[0m`);
    global.isMongoConnected = true;
    return conn;
  } catch (error) {
    global.isMongoConnected = false;
    console.warn(`\x1b[33m⚠ Warning: MongoDB connection failed: ${error.message}\x1b[0m`);
    if (error.message.includes('SSL alert number 80')) {
      console.warn(`\x1b[36m👉 Atlas IP blocked: Go to MongoDB Atlas -> Security -> Network Access -> Add IP Address -> 'Allow Access from Anywhere (0.0.0.0/0)'\x1b[0m`);
    } else {
      console.warn(`\x1b[36mℹ Note: To run MongoDB locally, make sure your mongod service is started, or check your MongoDB Atlas URI in server/.env\x1b[0m`);
    }
  }
};

module.exports = connectDB;

const mongoose = require("mongoose");
const GuestUsage = require("../models/GuestUsage");
const RateLimitCounter = require("../models/RateLimitCounter");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
    const conn = await mongoose.connect(process.env.MONGO_URI);
    await Promise.all([GuestUsage.createIndexes(), RateLimitCounter.createIndexes()]);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
};

module.exports = connectDB;

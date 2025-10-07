// backend/config/db.js
const mongoose = require("mongoose");

async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { autoIndex: true });
  console.log("✅ MongoDB connected");
}

module.exports = { connectDB };

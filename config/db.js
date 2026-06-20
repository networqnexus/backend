require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const dns = require("dns");

const connectDB = async () => {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);

    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error(".env file nahi mila ya MONGO_URI set nahi hai — path check karo: backend/.env");
    }

    await mongoose.connect(uri, { family: 4 });
    console.log("✅ MongoDB Connected");

  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

// One-off cleanup: earlier versions of the Message schema had `callInfo.duration` with a
// default, which made Mongoose auto-vivify `callInfo` on every message (even plain text ones)
// as `{ duration: 0 }`. That made those messages permanently render as call bubbles on the
// frontend. Real call-log messages always have `callInfo.status` set (answered/missed/declined);
// bogus ones never do — so we can tell them apart and strip the bogus field.
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
const Message = require("../models/Message");

(async () => {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set. Please check your backend/.env file.");

  await mongoose.connect(uri, { family: 4 });
  console.log("Connected to MongoDB");

  const filter = { "callInfo.status": { $exists: false }, callInfo: { $exists: true } };
  const affected = await Message.countDocuments(filter);
  console.log(`Found ${affected} message(s) with bogus callInfo`);

  if (affected > 0) {
    const result = await Message.updateMany(filter, { $unset: { callInfo: "" } });
    console.log(`Fixed ${result.modifiedCount} message(s)`);
  }

  await mongoose.disconnect();
  console.log("Done");
})().catch(err => { console.error(err); process.exit(1); });

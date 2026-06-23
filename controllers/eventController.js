const Event = require("../models/Event");
const pop = (q) => q.populate("host","name username headline avatarUrl").populate("attendees","name username avatarUrl");

exports.getEvents = async (req, res) => {
  try {
    const events = await pop(Event.find({ isPublic:true, date:{ $gte: new Date() } }).sort({ date:1 }));
    res.json({ success:true, events });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.getPastEvents = async (req, res) => {
  try {
    const events = await pop(Event.find({ isPublic:true, date:{ $lt: new Date() } }).sort({ date:-1 }).limit(20));
    res.json({ success:true, events });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.getMyEvents = async (req, res) => {
  try {
    const events = await pop(Event.find({ $or:[{ host:req.user.id },{ attendees:req.user.id }] }).sort({ date:1 }));
    res.json({ success:true, events });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, category, date, endDate, isOnline, location, link, maxAttendees, isPublic } = req.body;
    if (!title?.trim()) return res.status(400).json({ success:false, message:"Title required" });
    if (!date) return res.status(400).json({ success:false, message:"Date required" });
    const event = await Event.create({
      host: req.user.id, title, description, category, date, endDate,
      isOnline: isOnline !== false, location: location || "Online",
      link: link || "", maxAttendees, isPublic: isPublic !== false,
    });
    const populated = await pop(Event.findById(event._id));
    res.status(201).json({ success:true, event: populated });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.toggleAttend = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success:false, message:"Event not found" });
    if (event.host.toString() === req.user.id) return res.status(400).json({ success:false, message:"You are the host" });
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees && !event.attendees.includes(req.user.id)) {
      return res.status(400).json({ success:false, message:"Event is full" });
    }
    const idx = event.attendees.findIndex(id => id.toString() === req.user.id);
    if (idx === -1) event.attendees.push(req.user.id);
    else event.attendees.splice(idx, 1);
    await event.save();
    res.json({ success:true, attending: idx === -1, count: event.attendees.length });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success:false, message:"Event not found" });
    if (event.host.toString() !== req.user.id) return res.status(403).json({ success:false, message:"Not authorized" });
    await event.deleteOne();
    res.json({ success:true, message:"Event deleted" });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

const { sendContactEmail } = require("../config/emailService");

exports.submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim())
      return res.status(400).json({ success: false, message: "All fields are required" });

    await sendContactEmail({ name, email, message });
    res.json({ success: true, message: "Message sent successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

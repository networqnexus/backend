const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No Token Provided" });
    }
    const token = authHeader.split(" ")[1];
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({ success: false, message: "Invalid Token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, _id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token expired or invalid. Please login again." });
  }
};

module.exports = authMiddleware;
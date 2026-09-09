const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Simple credential check against .env values — good enough for a college
// PBL demo. In a real product you'd have a User collection with hashed
// passwords (bcrypt), sign-up flow, etc.
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });
    return res.json({ token, user: { email, role: "admin" } });
  }

  return res.status(401).json({ message: "Invalid email or password" });
});

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { saveOTP, verifyOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/mailer');

const router = express.Router();

// Generate a unique ChatHouse ID like "CH-8F2A91"
function generateChatHouseId() {
  const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  return `CH-${hex}`;
}

// Avatar color palette — pick randomly on registration
const AVATAR_COLORS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
  '#EA580C', '#CA8A04', '#16A34A', '#0891B2'
];

// POST /auth/send-otp
// Send a 6-digit OTP to the given email
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const otp = saveOTP(email.toLowerCase());
    await sendOTPEmail(email.toLowerCase(), otp);
    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('send-otp error:', err);

    res.status(500).json({
      error: 'Failed to send OTP. Please try again.'
    });
  }
});

// POST /auth/verify-otp
// Verify OTP, create user if first time, return JWT
router.post('/verify-otp', async (req, res) => {
  const { email, otp, username } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const result = verifyOTP(email.toLowerCase(), otp);
  if (!result.valid) {
    return res.status(400).json({ error: result.reason });
  }

  try {
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // First login — username required
      if (!username) {
        return res.status(200).json({ newUser: true, message: 'OTP verified. Please choose a username.' });
      }

      // Validate username
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Username must be 3–20 characters: letters, numbers, underscores only.' });
      }

      const exists = await User.findOne({ username: username.toLowerCase() });
      if (exists) {
        return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      }

      // Ensure unique ChatHouse ID
      let chatHouseId;
      do {
        chatHouseId = generateChatHouseId();
      } while (await User.findOne({ chatHouseId }));

      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        chatHouseId,
        avatarSeed: username.toLowerCase(),
        avatarColor
      });
    }

    // Update lastSeen on login
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /auth/create-user
// Called after OTP verified for first-time users — creates account and returns JWT
router.post('/create-user', async (req, res) => {
  const { email, username } = req.body;

  if (!email || !username) {
    return res.status(400).json({ error: 'Email and username are required.' });
  }

  // Validate username
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–20 characters: letters, numbers, underscores only.' });
  }

  try {
    // Make sure user doesn't already exist
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      // Already registered, just return their token
      const token = jwt.sign({ userId: emailExists._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: emailExists });
    }

    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
    }

    // Generate unique ChatHouse ID
    let chatHouseId;
    do {
      chatHouseId = generateChatHouseId();
    } while (await User.findOne({ chatHouseId }));

    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      chatHouseId,
      avatarSeed: username.toLowerCase(),
      avatarColor
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    console.error('create-user error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;

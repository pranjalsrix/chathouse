const express = require('express');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /users/search?q=
// Search users by username, email, or chatHouseId
router.get('/search', verifyToken, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
  }

  const query = q.trim();

  try {
    const users = await User.find({
      _id: { $ne: req.user._id }, // exclude self
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { chatHouseId: { $regex: query, $options: 'i' } }
      ]
    }).select('username email chatHouseId avatarSeed avatarColor').limit(10);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /users/me — get current user profile
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;

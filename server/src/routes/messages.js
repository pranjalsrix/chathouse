const express = require('express');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /messages/:userId — get conversation between current user and another user
router.get('/:userId', verifyToken, async (req, res) => {
  const me = req.user._id;
  const other = req.params.userId;

  try {
    const messages = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me }
      ]
    }).sort({ createdAt: 1 }).limit(200);

    // Mark messages from other user as seen
    await Message.updateMany(
      { sender: other, receiver: me, seen: false },
      { seen: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

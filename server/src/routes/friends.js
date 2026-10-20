const express = require('express');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /friends — get friends list and pending requests
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user._id;

  try {
    // All accepted friend relationships involving this user
    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ sender: userId }, { receiver: userId }]
    }).populate('sender receiver', 'username email chatHouseId avatarSeed avatarColor lastSeen');

    // Map to friend objects (the other person)
    const friends = accepted.map(req => {
      const friend = req.sender._id.toString() === userId.toString()
        ? req.receiver
        : req.sender;
      return friend;
    });

    // Incoming pending requests
    const incoming = await FriendRequest.find({ receiver: userId, status: 'pending' })
      .populate('sender', 'username email chatHouseId avatarSeed avatarColor');

    // Outgoing pending requests
    const outgoing = await FriendRequest.find({ sender: userId, status: 'pending' })
      .populate('receiver', 'username email chatHouseId avatarSeed avatarColor');

    res.json({ friends, incoming, outgoing });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /friends/request — send friend request
router.post('/request', verifyToken, async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user._id;

  if (!receiverId) return res.status(400).json({ error: 'receiverId is required.' });
  if (receiverId === senderId.toString()) return res.status(400).json({ error: 'Cannot send request to yourself.' });

  try {
    // Check if already friends or request exists
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends.' });
      if (existing.status === 'pending') return res.status(400).json({ error: 'Request already sent.' });
      // If rejected, allow re-sending by updating status
      existing.status = 'pending';
      existing.sender = senderId;
      existing.receiver = receiverId;
      await existing.save();
      return res.json({ message: 'Friend request sent.' });
    }

    await FriendRequest.create({ sender: senderId, receiver: receiverId });
    res.json({ message: 'Friend request sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /friends/accept
router.post('/accept', verifyToken, async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findOne({ _id: requestId, receiver: req.user._id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    request.status = 'accepted';
    await request.save();
    res.json({ message: 'Friend request accepted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /friends/reject
router.post('/reject', verifyToken, async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findOne({ _id: requestId, receiver: req.user._id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Friend request rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /friends/remove — remove a friend (delete the accepted request)
router.post('/remove', verifyToken, async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user._id;
  try {
    await FriendRequest.deleteOne({
      status: 'accepted',
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    });
    res.json({ message: 'Friend removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /friends/cancel — cancel outgoing pending request
router.post('/cancel', verifyToken, async (req, res) => {
  const { receiverId } = req.body;
  const userId = req.user._id;
  try {
    await FriendRequest.deleteOne({ sender: userId, receiver: receiverId, status: 'pending' });
    res.json({ message: 'Request cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const messageRoutes = require('./routes/messages');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/friends', friendRoutes);
app.use('/messages', messageRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: 'ChatHouse API is running ✓' }));

// ─── Socket.io ────────────────────────────────────────────────────────────────
// Map of userId → socketId for tracking online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // User comes online
  socket.on('connect-user', (userId) => {
    onlineUsers.set(userId, socket.id);
    // Broadcast updated online list to all clients
    io.emit('online-users', Array.from(onlineUsers.keys()));
  });

  // Send a message
  socket.on('send-message', async ({ senderId, receiverId, text }) => {
    try {
      const message = await Message.create({ sender: senderId, receiver: receiverId, text });

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-message', message);
      }

      // Confirm to sender
      socket.emit('message-sent', message);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message.' });
    }
  });

  // Typing indicator
  socket.on('typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { senderId });
    }
  });

  socket.on('stop-typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('stop-typing', { senderId });
    }
  });

  // Mark messages as seen
  socket.on('message-seen', async ({ senderId, receiverId }) => {
    try {
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, seen: false },
        { seen: true }
      );
      // Notify sender that messages were seen
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages-seen', { by: receiverId });
      }
    } catch (err) {
      console.error('message-seen error:', err);
    }
  });

  // Add reaction to a message
  socket.on('add-reaction', async ({ messageId, reaction, senderId, receiverId }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { reaction },
        { new: true }
      );
      // Notify both parties
      const receiverSocketId = onlineUsers.get(receiverId);
      const senderSocketId = onlineUsers.get(senderId);
      if (receiverSocketId) io.to(receiverSocketId).emit('reaction-updated', message);
      if (senderSocketId) io.to(senderSocketId).emit('reaction-updated', message);
    } catch (err) {
      console.error('add-reaction error:', err);
    }
  });

  // Notify friends about new friend request
  socket.on('friend-request-sent', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('friend-request-update');
    }
  });

  // User disconnects
  socket.on('disconnect', async () => {
    // Find and remove user from online map
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        // Update lastSeen in DB
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        break;
      }
    }
    io.emit('online-users', Array.from(onlineUsers.keys()));
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✓ MongoDB connected');
    server.listen(PORT, () => console.log(`✓ Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });

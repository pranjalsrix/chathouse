/**
 * ChatHouse Database Seed Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates realistic demo data: 5 users, friend connections, and chat history.
 *
 * Usage:
 *   node server/src/seed.js
 *
 * WARNING: This will clear existing demo users, friend requests, and messages
 * associated with the demo accounts first.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const FriendRequest = require('./models/FriendRequest');
const Message = require('./models/Message');

// ── Seed Data ─────────────────────────────────────────────────────────────────

const USERS = [
  {
    username: 'alice',
    email: 'alice@example.com',
    avatarSeed: 'alice',
    avatarColor: '#4F46E5'
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    avatarSeed: 'bob',
    avatarColor: '#7C3AED'
  },
  {
    username: 'charlie',
    email: 'charlie@example.com',
    avatarSeed: 'charlie',
    avatarColor: '#DB2777'
  },
  {
    username: 'diana',
    email: 'diana@example.com',
    avatarSeed: 'diana',
    avatarColor: '#16A34A'
  },
  {
    username: 'evan',
    email: 'evan@example.com',
    avatarSeed: 'evan',
    avatarColor: '#0891B2'
  }
];

const MESSAGE_TEMPLATES = [
  ['Hey! How are you doing?', 'Pretty good, thanks! You?'],
  ["I'm great! Just finished setting up ChatHouse.", 'Nice! It looks really clean.'],
  ['Right? The emoji picker is super smooth 😄', 'Agreed! ❤️ Love the design.'],
  ['Want to test the real-time chat?', 'Sure, go ahead and send something!'],
  ['This is a real-time message 🔥', 'Got it instantly! Socket.IO is awesome 👍'],
  ['Have you tried the friend system?', 'Yeah, search by @username works great.'],
  ['The ChatHouse ID is a cool touch.', 'That unique ID makes finding people easy!'],
  ['No passwords needed, OTP only 🎉', 'So much simpler than passwords.'],
  ['Check out the reaction feature.', 'Double-click on a message? Nice! 😂']
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  const hex = Math.floor(Math.random() * 0xFFFFFF)
    .toString(16)
    .toUpperCase()
    .padStart(6, '0');

  return `CH-${hex}`;
}

function pastDate(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}

// ── Main Seed Function ────────────────────────────────────────────────────────

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected\n');

  // ── Clear existing demo data ──
  console.log('Clearing existing demo data...');

  const demoEmails = USERS.map(user => user.email);
  const oldUsers = await User.find({ email: { $in: demoEmails } });
  const oldIds = oldUsers.map(user => user._id);

  await FriendRequest.deleteMany({
    $or: [
      { sender: { $in: oldIds } },
      { receiver: { $in: oldIds } }
    ]
  });

  await Message.deleteMany({
    $or: [
      { sender: { $in: oldIds } },
      { receiver: { $in: oldIds } }
    ]
  });

  await User.deleteMany({ email: { $in: demoEmails } });

  console.log('Existing demo data cleared\n');

  // ── Create Users ──
  console.log('Creating users...');
  const createdUsers = [];

  for (const userData of USERS) {
    let id;

    do {
      id = generateId();
    } while (await User.findOne({ chatHouseId: id }));

    const user = await User.create({
      ...userData,
      chatHouseId: id,
      lastSeen: pastDate(Math.floor(Math.random() * 24))
    });

    createdUsers.push(user);
    console.log(`  @${user.username} — ${user.chatHouseId} — ${user.email}`);
  }

  console.log();

  // ── Create Friend Connections ──
  console.log('Creating friend connections...');

  const [alice, bob, charlie, diana, evan] = createdUsers;

  const friendPairs = [
    { sender: alice, receiver: bob, status: 'accepted' },
    { sender: alice, receiver: charlie, status: 'accepted' },
    { sender: bob, receiver: diana, status: 'accepted' },
    { sender: evan, receiver: charlie, status: 'accepted' },
    { sender: diana, receiver: evan, status: 'pending' }
  ];

  for (const pair of friendPairs) {
    await FriendRequest.create({
      sender: pair.sender._id,
      receiver: pair.receiver._id,
      status: pair.status
    });

    const relationship =
      pair.status === 'accepted' ? '↔' : '→ (pending)';

    console.log(
      `  @${pair.sender.username} ${relationship} @${pair.receiver.username}`
    );
  }

  console.log();

  // ── Create Messages ──
  console.log('Creating chat messages...');

  async function createConversation(userA, userB, templateIndex, hoursAgo) {
    const messages = [
      {
        sender: userA._id,
        receiver: userB._id,
        text: MESSAGE_TEMPLATES[templateIndex][0],
        seen: true,
        createdAt: pastDate(hoursAgo + 3)
      },
      {
        sender: userB._id,
        receiver: userA._id,
        text: MESSAGE_TEMPLATES[templateIndex][1],
        seen: true,
        createdAt: pastDate(hoursAgo + 2.5)
      },
      {
        sender: userA._id,
        receiver: userB._id,
        text: MESSAGE_TEMPLATES[templateIndex + 1]?.[0] || '😊',
        seen: true,
        createdAt: pastDate(hoursAgo + 2)
      },
      {
        sender: userB._id,
        receiver: userA._id,
        text: MESSAGE_TEMPLATES[templateIndex + 1]?.[1] || '👍',
        seen: true,
        createdAt: pastDate(hoursAgo + 1.5),
        reaction: '❤️'
      },
      {
        sender: userA._id,
        receiver: userB._id,
        text: MESSAGE_TEMPLATES[templateIndex + 2]?.[0] || 'Nice!',
        seen: false,
        createdAt: pastDate(hoursAgo + 0.5)
      }
    ];

    await Message.insertMany(messages);

    console.log(
      `  @${userA.username} ↔ @${userB.username} — ${messages.length} messages`
    );
  }

  await createConversation(alice, bob, 0, 5);
  await createConversation(alice, charlie, 2, 10);
  await createConversation(bob, diana, 4, 2);
  await createConversation(evan, charlie, 6, 1);

  console.log();

  // ── Summary ──
  const userCount = await User.countDocuments();
  const friendCount = await FriendRequest.countDocuments();
  const messageCount = await Message.countDocuments();

  console.log('-'.repeat(50));
  console.log('Seed complete!\n');
  console.log(`   Users:        ${createdUsers.length} created`);
  console.log(`   Friend links: ${friendPairs.length} created`);
  console.log(`   Messages:     20 created`);
  console.log(
    `   Total in DB:  ${userCount} users | ${friendCount} requests | ${messageCount} messages`
  );

  console.log('\nDemo Accounts (login via OTP with these emails):');
  console.log('-'.repeat(50));

  for (const user of createdUsers) {
    console.log(`   @${user.username.padEnd(10)} ${user.email}`);
  }

  console.log('\nThese accounts have no passwords.');
  console.log('Request an OTP to log in; OTP delivery requires a real email address.\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  process.exit(0);
}

seed().catch(async error => {
  console.error('\nSeed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});

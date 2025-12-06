// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// --- MongoDB Setup ---
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/contactdb';
mongoose.set('strictQuery', false);
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log(`Connected to MongoDB: ${mongoUri}`);
    seedAdmin();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Seed Admin Function ---
const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@zunasoft.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new User({
        username: 'Admin',
        email: adminEmail,
        password: 'password',
        role: 'admin',
        isApproved: true
      });
      await admin.save();
      console.log('Default Admin Account Created: admin@zunasoft.com / password');
    } else {
      console.log('Admin account already exists.');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
};

// --- Socket.IO Authentication Middleware ---
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// --- Socket.IO Event Handlers ---
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Join general room
  socket.join('general');
  
  // Load recent messages for general room
  const recentMessages = await Message.find({ room: 'general', isPrivate: false })
    .populate('sender', 'username')
    .sort({ timestamp: -1 })
    .limit(50);
  socket.emit('load_messages', recentMessages.reverse());
  
  // Handle sending messages to group
  socket.on('send_message', async (data) => {
    try {
      const message = new Message({
        sender: socket.userId,
        content: data.content,
        room: data.room || 'general',
        isPrivate: false
      });
      await message.save();
      
      const populated = await Message.findById(message._id).populate('sender', 'username');
      io.to(data.room || 'general').emit('receive_message', populated);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });
  
  // Handle private messages
  socket.on('send_private_message', async (data) => {
    try {
      const message = new Message({
        sender: socket.userId,
        content: data.content,
        isPrivate: true,
        recipient: data.recipientId
      });
      await message.save();
      
      const populated = await Message.findById(message._id)
        .populate('sender', 'username')
        .populate('recipient', 'username');
      
      // Send to both sender and recipient
      socket.emit('receive_private_message', populated);
      io.to(`user_${data.recipientId}`).emit('receive_private_message', populated);
    } catch (err) {
      console.error('Error sending private message:', err);
    }
  });
  
  // Load private messages with a specific user
  socket.on('load_private_messages', async (data) => {
    try {
      const messages = await Message.find({
        isPrivate: true,
        $or: [
          { sender: socket.userId, recipient: data.userId },
          { sender: data.userId, recipient: socket.userId }
        ]
      })
        .populate('sender', 'username')
        .populate('recipient', 'username')
        .sort({ timestamp: -1 })
        .limit(50);
      
      socket.emit('private_messages_loaded', messages.reverse());
    } catch (err) {
      console.error('Error loading private messages:', err);
    }
  });
  
  // Join user-specific room for private messages
  socket.join(`user_${socket.userId}`);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// --- Routes ---
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const budgetRoutes = require('./routes/budget');

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/budget', budgetRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config(); // Load env variables

const app = express();
app.use(cors());
app.use(express.json());

// --- MongoDB / Mongoose setup ---
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/contactdb';

mongoose.set('strictQuery', false);
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log(`Connected to MongoDB: ${mongoUri}`))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    // If DB connection fails, we still allow the server to run, but saving will fail.
  });

// Define a Contact schema and model
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Contact = mongoose.model('Contact', contactSchema);

// --- Nodemailer transporter setup ---
const transporter = nodemailer.createTransport({
  service: 'Gmail', // or your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// verify transporter (optional but useful for debugging)
transporter.verify((error, success) => {
  if (error) {
    console.warn('Warning: Email transporter verify failed:', error.message || error);
  } else {
    console.log('Email transporter is ready');
  }
});

// --- POST /send route ---
app.post('/send', async (req, res) => {
  const { name, email, message } = req.body;

  // basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'name, email and message are required' });
  }

  // Create document to save
  const contactDoc = new Contact({ name, email, message });

  let savedDoc = null;
  try {
    // Save to MongoDB
    savedDoc = await contactDoc.save();
  } catch (dbErr) {
    console.error('Failed to save contact to DB:', dbErr);
    // proceed to try sending email even if DB save failed; respond will indicate partial failure
  }

  // Prepare email
  const mailOptions = {
    from: email || process.env.EMAIL_USER,
    to: 'info@zunasoft.com',
    subject: `Message from ${name}`,
    text: message,
    // you can also use html: '<p>...</p>' if you'd like
  };

  try {
    await transporter.sendMail(mailOptions);
    // both save and mail might have succeeded or mail succeeded but save failed
    if (savedDoc) {
      return res.status(200).json({ success: true, saved: true, emailed: true });
    } else {
      return res.status(200).json({ success: true, saved: false, emailed: true, warning: 'Failed to save to DB' });
    }
  } catch (mailErr) {
    console.error('Failed to send email:', mailErr);
    // Email failed; but maybe DB saved
    if (savedDoc) {
      return res.status(500).json({ success: false, saved: true, emailed: false, error: 'Email failed to send' });
    } else {
      return res.status(500).json({ success: false, saved: false, emailed: false, error: 'DB save and email both failed' });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

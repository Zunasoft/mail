const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config(); // Load env variables

const app = express();
app.use(cors());
app.use(express.json());

app.post('/send', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: email || process.env.EMAIL_USER,
      to: "info@zunasoft.com",
      subject: `Message from ${name}`,
      text: message,
    });

    res.status(200).send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

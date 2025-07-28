require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

// Load environment variables
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoURI || !jwtSecret) {
  console.error("❌ Missing required environment variables (MONGO_URI or JWT_SECRET)");
  process.exit(1);
}

// Models
const HealthEntry = require('./models/HealthEntry');
const User = require('./models/User');

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Routes
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, email: user.email }, jwtSecret, {
      expiresIn: '1h'
    });

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/submit', authenticateToken, async (req, res) => {
  try {
    const entry = new HealthEntry(req.body);
    await entry.save();
    console.log('Saved data:', entry);
    res.status(200).send('Data received and saved');
  } catch (err) {
    console.error('Error saving entry:', err);
    res.status(500).send('Server error');
  }
});

app.get('/entries', authenticateToken, async (req, res) => {
  try {
    const entries = await HealthEntry.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).send('Server error');
  }
});


// ✅ TEST ROUTES TO CONFIRM SERVER IS LIVE
app.get('/', (req, res) => {
  res.send('Health Tracker Backend is Live!');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is working' });
});

// A simple health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Health check passed' });
});


// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

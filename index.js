require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');

// Initialize the app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((error) => console.error('❌ MongoDB connection error:', error));

// Models
const HealthEntry = require('./models/HealthEntry');  // Health data schema
const User = require('./models/User');  // User model for authentication

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Routes

// Root route (for health check)
app.get('/', (req, res) => {
  res.send('🚀 Health Tracker API is up and running');
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User registration route
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const existingUser = await User.findOne({ email });
  
  if (existingUser) return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  await newUser.save();
  res.status(201).json({ message: 'User created successfully' });
});

// User login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Submit health data route
app.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { sleepHours, waterIntake, mood } = req.body;
    
    if (!sleepHours || !waterIntake || !mood) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newHealthEntry = new HealthEntry({
      sleepHours,
      waterIntake,
      mood,
    });

    await newHealthEntry.save();
    res.status(200).json({ message: 'Health entry submitted successfully' });
  } catch (err) {
    console.error('Error in /submit route:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch all health entries
app.get('/entries', authenticateToken, async (req, res) => {
  try {
    const entries = await HealthEntry.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

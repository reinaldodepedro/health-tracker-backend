require('dotenv').config();

console.log('Mongo URI:', process.env.MONGO_URI);

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

// Get MongoDB URI and JWT secret from environment variables
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

// Connect to MongoDB Atlas
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Listen for connection open event
mongoose.connection.once('open', () => {
  console.log('📡 MongoDB connection is open!');
});

// Middleware to parse JSON bodies
app.use(express.json());

// Import models
const HealthEntry = require('./models/HealthEntry');
const User = require('./models/User');

// Debugging User model import
console.log('User:', User);
console.log('User type:', typeof User);
console.log('User.findOne:', User ? User.findOne : 'undefined');
console.log('User model loaded:', !!User && typeof User.findOne === 'function');

// If you see User as {} or findOne undefined, there’s a problem with your model import

// Authentication middleware to protect routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Authorization header format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // user info from token payload
    next();
  });
}

// POST endpoint to receive and save health data (protected)
app.post('/submit', authenticateToken, async (req, res) => {
  try {
    const entry = new HealthEntry(req.body);
    await entry.save();
    console.log('Saved data:', entry);
    res.send('Data received and saved');
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).send('Server error');
  }
});

// GET endpoint to fetch all health entries, newest first (protected)
app.get('/entries', authenticateToken, async (req, res) => {
  try {
    const entries = await HealthEntry.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Server error');
  }
});

// Signup endpoint
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
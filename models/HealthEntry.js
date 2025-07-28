const mongoose = require('mongoose');

// Define schema for a health entry
const healthEntrySchema = new mongoose.Schema({
  sleepHours: {
    type: Number,
    required: true,
  },
  waterIntake: {
    type: Number,
    required: true,
  },
  mood: {
    type: String,
    required: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
});

// Export the model
module.exports = mongoose.model('HealthEntry', healthEntrySchema);

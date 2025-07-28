const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define schema for a user
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,  // Ensure username is unique
  },
  email: {
    type: String,
    required: true,
    unique: true,  // Ensure email is unique
    lowercase: true,  // Normalize email to lowercase for consistency
  },
  password: {
    type: String,
    required: true,
  },
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Hash the user's password before saving it
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (err) {
    next(err);
  }
});

// Compare the provided password with the stored hashed password
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Export the model
module.exports = mongoose.model('User', userSchema);

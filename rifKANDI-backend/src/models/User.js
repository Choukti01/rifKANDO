const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  // ===============================
  // Google Authentication
  // ===============================

  googleId: {
    type: String,
    default: null
  },

  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },

  password: {
    type: String,
    required: function () {
      return this.provider === 'local';
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },

  phone: {
    type: String,
    required: function () {
      return this.provider === 'local';
    },
    default: ''
  },

  profilePicture: {
    type: String,
    default: ''
  },

  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },

  city: {
    type: String,
    default: ''
  },

  roles: {
    type: [String],
    enum: ['buyer', 'seller', 'admin'],
    default: ['buyer']
  },

  sellerType: {
    type: String,
    enum: ['product', 'course', 'service', 'digital', 'booking', null],
    default: null
  },

  // Email verification system

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationCode: {
    type: String,
    select: false
  },

  verificationCodeExpires: {
    type: Date,
    select: false
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});



// Hash password before saving
userSchema.pre('save', async function(next) {

  // Google accounts don't have passwords
  if (this.provider === 'google') {
    return next();
  }

  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);

  next();

});



// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {

  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);

};



module.exports = mongoose.model('User', userSchema);
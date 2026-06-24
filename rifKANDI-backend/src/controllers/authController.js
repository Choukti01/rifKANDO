const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};


// =========================
// 🔥 SKAFE SECURITY REPORTER
// =========================
const sendSecurityEvent = async (event) => {
  try {
    await axios.post(
      "http://localhost:8000/event",
      event
    );
  } catch (error) {
    // Do not break authentication if SKAFE is offline
    console.error("SKAFE reporting failed:", error.message);
  }
};



const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        sellerType: user.sellerType
      }
    }
  });
};


// Register
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return next(new AppError('User already exists with this email', 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    roles: ['buyer']
  });

  createSendToken(user, 201, res);
});


// Login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }


  const user = await User.findOne({ email }).select('+password');


  // =========================
  // 🚨 SKAFE LOGIN FAILURE DETECTION
  // =========================
  if (!user || !(await user.comparePassword(password))) {


    await sendSecurityEvent({
      event_type: "login_failed",
      user_id: email,
      ip: req.ip,
      module: "auth"
    });


    return next(new AppError('Incorrect email or password', 401));
  }



  createSendToken(user, 200, res);
});


// Get current user
exports.getMe = catchAsync(async (req, res, next) => {

  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { user }
  });

});


// Update seller type
exports.updateSellerType = catchAsync(async (req, res, next) => {

  const { sellerType } = req.body;


  const user = await User.findByIdAndUpdate(
    req.user.id,
    { 
      sellerType,
      $addToSet: { roles: 'seller' }
    },
    { 
      new: true, 
      runValidators: true 
    }
  );


  res.status(200).json({
    status: 'success',
    data: { user }
  });

});
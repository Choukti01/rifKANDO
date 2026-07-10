const jwt = require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendVerificationEmail } = require('../utils/sendEmail');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// ======================================
// JWT HELPERS
// ======================================

const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
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

        sellerType: user.sellerType,

        profilePicture: user.profilePicture,

        provider: user.provider

      }

    }

  });

};

// ======================================
// REGISTER
// ======================================

exports.register = catchAsync(async (req, res, next) => {

  const {
    name,
    email,
    password,
    phone
  } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {

    return next(
      new AppError(
        'User already exists with this email',
        400
      )
    );

  }

  const code = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const user = await User.create({

    name,

    email,

    password,

    phone,

    provider: 'local',

    roles: ['buyer'],

    verificationCode: code,

    verificationCodeExpires:
      Date.now() + 10 * 60 * 1000,

    isVerified: false

  });

  await sendVerificationEmail(
    email,
    code
  );

  res.status(201).json({

    status: 'success',

    message:
      'Verification code sent to your email'

  });

});

// ======================================
// VERIFY EMAIL
// ======================================

exports.verifyEmail = catchAsync(async (req, res, next) => {

  const {
    email,
    code
  } = req.body;

  const user = await User.findOne({ email });

  if (!user) {

    return next(
      new AppError(
        'User not found',
        404
      )
    );

  }

  if (
    user.verificationCode !== code ||
    user.verificationCodeExpires < Date.now()
  ) {

    return next(
      new AppError(
        'Invalid or expired verification code',
        400
      )
    );

  }

  user.isVerified = true;

  user.verificationCode = undefined;

  user.verificationCodeExpires = undefined;

  await user.save();

  createSendToken(
    user,
    200,
    res
  );

});

// ======================================
// LOGIN
// ======================================

exports.login = catchAsync(async (req, res, next) => {

  const {
    email,
    password
  } = req.body;

  if (!email || !password) {

    return next(
      new AppError(
        'Please provide email and password',
        400
      )
    );

  }

  const user = await User.findOne({ email })
    .select('+password');

  if (
    !user ||
    !(await user.comparePassword(password))
  ) {

    return next(
      new AppError(
        'Incorrect email or password',
        401
      )
    );

  }

  if (!user.isVerified) {

    return next(
      new AppError(
        'Please verify your email first',
        401
      )
    );

  }

  createSendToken(
    user,
    200,
    res
  );

});

// ======================================
// GOOGLE AUTH
// ======================================
exports.googleAuth = catchAsync(async (req, res, next) => {

  const { credential } = req.body;

  if (!credential) {
    return next(
      new AppError(
        'Google credential is required',
        400
      )
    );
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  const {
    sub,
    email,
    name,
    picture,
    email_verified
  } = payload;

  if (!email_verified) {
    return next(
      new AppError(
        'Google account is not verified',
        401
      )
    );
  }

  let user = await User.findOne({ email });

  // =====================================
  // Existing user
  // =====================================

  if (user) {

    let changed = false;

    if (!user.googleId) {
      user.googleId = sub;
      changed = true;
    }

    if (user.provider !== 'google') {
      user.provider = 'google';
      changed = true;
    }

    if (!user.profilePicture && picture) {
      user.profilePicture = picture;
      changed = true;
    }

    if (!user.isVerified) {
      user.isVerified = true;
      changed = true;
    }

    if (changed) {
      await user.save();
    }

  }

  // =====================================
  // New user
  // =====================================

  else {

    user = await User.create({

      name,

      email,

      phone: '',

      provider: 'google',

      googleId: sub,

      profilePicture: picture || '',

      roles: ['buyer'],

      isVerified: true

    });

  }

  createSendToken(
    user,
    200,
    res
  );

});



// ===============================
// GET CURRENT USER
// ===============================

exports.getMe = catchAsync(async (req, res, next) => {

  const user = await User.findById(req.user.id);

  res.status(200).json({

    status: 'success',

    data: {
      user
    }

  });

});



// ===============================
// UPDATE SELLER TYPE
// ===============================

exports.updateSellerType = catchAsync(async (req, res, next) => {

  const {
    sellerType
  } = req.body;

  const user = await User.findByIdAndUpdate(

    req.user.id,

    {
      sellerType,

      $addToSet: {
        roles: 'seller'
      }
    },

    {
      new: true,
      runValidators: true
    }

  );

  res.status(200).json({

    status: 'success',

    data: {
      user
    }

  });

});
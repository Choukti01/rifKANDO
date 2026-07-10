const express = require('express');

const {
  register,
  verifyEmail,
  login,
  googleAuth,
  getMe,
  updateSellerType
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

const router = express.Router();


// ====================================
// PUBLIC ROUTES
// ====================================

// Register with email
router.post('/register', register);

// Verify email code
router.post('/verify-email', verifyEmail);

// Login with email/password
router.post('/login', login);

// Login/Register with Google
router.post('/google', googleAuth);


// ====================================
// PROTECTED ROUTES
// ====================================

router.get('/me', protect, getMe);

router.patch(
  '/update-seller-type',
  protect,
  updateSellerType
);

module.exports = router;
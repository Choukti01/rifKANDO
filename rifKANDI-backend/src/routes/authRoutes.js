const express = require('express');

const {
  googleAuth,
  getMe,
  updateSellerType
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

const router = express.Router();

const legacyAuthenticationDisabled = (req, res) => res.status(410).json({
  success: false,
  error: 'Email and password authentication has been disabled. Sign in with Google instead.'
});

// ====================================
// PUBLIC ROUTES
// ====================================

router.post('/register', legacyAuthenticationDisabled);
router.post('/verify-email', legacyAuthenticationDisabled);
router.post('/login', legacyAuthenticationDisabled);

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

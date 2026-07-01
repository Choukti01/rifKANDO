const express = require('express');

const { 
  register,
  verifyEmail,
  login,
  getMe,
  updateSellerType
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');


const router = express.Router();



// Register
router.post('/register', register);


// Verify email code
router.post('/verify-email', verifyEmail);


// Login
router.post('/login', login);


// Protected routes
router.get('/me', protect, getMe);

router.patch(
  '/update-seller-type',
  protect,
  updateSellerType
);



module.exports = router;
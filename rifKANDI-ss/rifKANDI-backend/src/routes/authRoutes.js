const express = require('express');
const { register, login, getMe, updateSellerType } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/update-seller-type', protect, updateSellerType);

module.exports = router;
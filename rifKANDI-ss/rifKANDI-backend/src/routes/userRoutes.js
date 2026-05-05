const express = require('express');
const router = express.Router();
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { upload, processAndSaveImage } = require('../middleware/upload');

// Protect middleware (you already have this)
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Upload profile picture
router.post('/upload-profile-picture', 
  protect, 
  upload.single('profilePicture'),
  processAndSaveImage,
  async (req, res) => {
    try {
      if (!req.processedImageUrl) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const oldImagePath = req.user.profilePicture;
      
      req.user.profilePicture = req.processedImageUrl;
      await req.user.save();
      
      if (oldImagePath && oldImagePath !== '/uploads/profile-pictures/default-avatar.png') {
        const oldFilePath = path.join(__dirname, '..', oldImagePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      res.json({
        success: true,
        profilePicture: req.user.profilePicture,
        user: req.user
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload profile picture' });
    }
  }
);

// Remove profile picture
router.delete('/profile-picture', protect, async (req, res) => {
  try {
    const oldImagePath = req.user.profilePicture;
    
    req.user.profilePicture = '';
    await req.user.save();
    
    if (oldImagePath && oldImagePath !== '/uploads/profile-pictures/default-avatar.png') {
      const oldFilePath = path.join(__dirname, '..', oldImagePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    res.json({
      success: true,
      message: 'Profile picture removed',
      profilePicture: ''
    });
  } catch (error) {
    console.error('Remove error:', error);
    res.status(500).json({ error: 'Failed to remove profile picture' });
  }
});

// Update profile
router.patch('/update-me', protect, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'bio', 'city', 'country'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    Object.assign(req.user, updates);
    await req.user.save();
    
    res.json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update password
router.patch('/update-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
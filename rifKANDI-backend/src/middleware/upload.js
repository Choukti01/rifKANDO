const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

const processAndSaveImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    const timestamp = Date.now();
    const filename = `user-${req.user.id}-${timestamp}.jpeg`;
    const filepath = path.join(uploadDir, filename);
    
    await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(filepath);
    
    req.processedImageUrl = `/uploads/profile-pictures/${filename}`;
    next();
  } catch (error) {
    console.error('Image processing error:', error);
    return res.status(500).json({ error: 'Failed to process image' });
  }
};

module.exports = { upload, processAndSaveImage };
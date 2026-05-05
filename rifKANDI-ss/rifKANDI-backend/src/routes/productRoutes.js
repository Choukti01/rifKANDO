const express = require('express');
const {
  getAllProducts,
  getProduct,
  createProduct,
  getMyProducts
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', getAllProducts);
router.get('/my-products', protect, getMyProducts);
router.get('/:id', getProduct);
router.post('/', protect, createProduct);

module.exports = router;
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Get all products
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find({ status: 'published' })
    .populate('seller', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products }
  });
});

// Get single product
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('seller', 'name');

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  // Increment views
  product.views += 1;
  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { product }
  });
});

// Create product
exports.createProduct = catchAsync(async (req, res, next) => {
  req.body.seller = req.user.id;

  const product = await Product.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { product }
  });
});

// Get seller's products
exports.getMyProducts = catchAsync(async (req, res, next) => {
  const products = await Product.find({ seller: req.user.id });

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products }
  });
});
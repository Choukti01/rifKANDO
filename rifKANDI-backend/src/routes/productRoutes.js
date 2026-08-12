const express = require('express');

/**
 * Active product domain routes.
 *
 * Dependencies are injected by the application composition root. Keeping the
 * router free of application globals makes the authorization and data access
 * rules explicit and lets it be tested independently from the HTTP server.
 */
const createProductRoutes = ({
  db,
  protect,
  requireSeller,
  isAdmin,
  validateIdParams,
  validateProductCreate,
  validateProductQuery,
  validateProductReview,
  validateProductUpdate,
  Money,
}) => {
  const router = express.Router();

  const attachMedia = (products, done) => {
    if (!products.length) return done(products);

    let completed = 0;
    products.forEach((product) => {
      db.all(
        'SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order, id',
        [product.id],
        (error, media) => {
          if (!error) product.media = media || [];
          completed += 1;
          if (completed === products.length) done(products);
        },
      );
    });
  };

  router.get('/products', validateProductQuery, (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const minPrice = req.query.minPrice ? Money.toMinor(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Money.toMinor(req.query.maxPrice) : null;
    const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;
    const sortBy = req.query.sortBy || 'newest';
    const condition = req.query.condition || '';
    let whereClause = 'p.status = "published"';
    const params = [];

    if (condition) {
      whereClause += ' AND p.condition = ?';
      params.push(condition);
    }
    if (search) {
      whereClause += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }
    if (minPrice !== null) {
      whereClause += ' AND p.price_minor >= ?';
      params.push(minPrice);
    }
    if (maxPrice !== null) {
      whereClause += ' AND p.price_minor <= ?';
      params.push(maxPrice);
    }
    if (minRating !== null) {
      whereClause += ' AND p.rating >= ?';
      params.push(minRating);
    }

    const orderBy = {
      price_asc: 'ORDER BY p.price_minor ASC',
      price_desc: 'ORDER BY p.price_minor DESC',
      rating: 'ORDER BY p.rating DESC',
      popular: 'ORDER BY p.sold DESC',
    }[sortBy] || 'ORDER BY p.created_at DESC';

    db.get(
      `SELECT COUNT(*) as total FROM products p JOIN users u ON p.seller_id = u.id WHERE ${whereClause}`,
      params,
      (countError, countResult) => {
        if (countError) return res.status(500).json({ error: countError.message });

        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        db.all(
          `SELECT p.*, u.name as seller_name, u.id as seller_id
           FROM products p
           JOIN users u ON p.seller_id = u.id
           WHERE ${whereClause}
           ${orderBy}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
          (productsError, products) => {
            if (productsError) return res.status(500).json({ error: productsError.message });
            attachMedia(products, (productsWithMedia) => res.json({
              success: true,
              products: productsWithMedia,
              pagination: { page, limit, total, totalPages },
            }));
          },
        );
      },
    );
  });

  router.get('/products/:id', validateIdParams('id'), (req, res) => {
    db.get(
      `SELECT p.*, u.name as seller_name, u.id as seller_id
       FROM products p
       JOIN users u ON p.seller_id = u.id
       WHERE p.id = ?`,
      [req.params.id],
      (error, product) => {
        if (error) return res.status(500).json({ error: error.message });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        attachMedia([product], ([productWithMedia]) => {
          res.json({ success: true, product: productWithMedia });
        });
      },
    );
  });

  router.post('/products', protect, requireSeller, validateProductCreate, (req, res) => {
    const { title, description, price, old_price: oldPrice, category, stock, media, condition } = req.body;
    const priceMinor = Money.toMinor(price);
    const oldPriceMinor = oldPrice === undefined ? null : Money.toMinor(oldPrice);

    db.run(
      `INSERT INTO products
       (title, description, price, old_price, price_minor, old_price_minor, category, stock, seller_id, condition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        Money.fromMinor(priceMinor),
        oldPriceMinor === null ? null : Money.fromMinor(oldPriceMinor),
        priceMinor,
        oldPriceMinor,
        category,
        stock,
        req.user.id,
        condition || 'new',
      ],
      function onProductCreated(error) {
        if (error) return res.status(400).json({ error: error.message });
        const productId = this.lastID;
        if (!media || !media.length) {
          return res.json({ success: true, product: { id: productId, ...req.body } });
        }

        let inserted = 0;
        media.forEach((item, index) => {
          db.run(
            'INSERT INTO product_media (product_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
            [productId, item.type, item.url, index, index === 0 ? 1 : 0],
            (mediaError) => {
              if (mediaError) console.error('Media insert error:', mediaError);
              inserted += 1;
              if (inserted === media.length) {
                res.json({ success: true, product: { id: productId, ...req.body } });
              }
            },
          );
        });
      },
    );
  });

  router.put('/products/:id', protect, requireSeller, validateIdParams('id'), validateProductUpdate, (req, res) => {
    const { title, description, price, old_price: oldPrice, category, stock, media, condition } = req.body;
    const priceMinor = price === undefined ? undefined : Money.toMinor(price);
    const oldPriceMinor = oldPrice === undefined ? undefined : Money.toMinor(oldPrice);

    db.get('SELECT seller_id FROM products WHERE id = ?', [req.params.id], (lookupError, product) => {
      if (lookupError || !product) return res.status(404).json({ error: 'Product not found' });
      if (product.seller_id !== req.user.id && !isAdmin(req.user)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      db.run(
        `UPDATE products SET
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           old_price = COALESCE(?, old_price),
           price_minor = COALESCE(?, price_minor),
           old_price_minor = COALESCE(?, old_price_minor),
           category = COALESCE(?, category),
           stock = COALESCE(?, stock),
           condition = COALESCE(?, condition)
         WHERE id = ?`,
        [
          title,
          description,
          priceMinor === undefined ? undefined : Money.fromMinor(priceMinor),
          oldPriceMinor === undefined ? undefined : Money.fromMinor(oldPriceMinor),
          priceMinor,
          oldPriceMinor,
          category,
          stock,
          condition,
          req.params.id,
        ],
        (updateError) => {
          if (updateError) return res.status(400).json({ error: updateError.message });
          db.run('DELETE FROM product_media WHERE product_id = ?', [req.params.id], () => {
            if (media && media.length) {
              media.forEach((item, index) => {
                db.run(
                  'INSERT INTO product_media (product_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
                  [req.params.id, item.type, item.url, index, index === 0 ? 1 : 0],
                );
              });
            }
            res.json({ success: true, message: 'Product updated' });
          });
        },
      );
    });
  });

  router.delete('/products/:id', protect, requireSeller, validateIdParams('id'), (req, res) => {
    db.get('SELECT seller_id FROM products WHERE id = ?', [req.params.id], (lookupError, product) => {
      if (lookupError || !product) return res.status(404).json({ error: 'Product not found' });
      if (product.seller_id !== req.user.id && !isAdmin(req.user)) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      db.run('DELETE FROM products WHERE id = ?', [req.params.id], function onProductDeleted(error) {
        if (error) return res.status(400).json({ error: error.message });
        return res.json({ success: true, message: 'Product deleted' });
      });
    });
  });

  router.get('/my-products', protect, requireSeller, (req, res) => {
    db.all(
      `SELECT p.*, u.name as seller_name
       FROM products p
       JOIN users u ON p.seller_id = u.id
       WHERE p.seller_id = ?`,
      [req.user.id],
      (error, products) => {
        if (error) return res.status(500).json({ error: error.message });
        attachMedia(products, (productsWithMedia) => {
          res.json({ success: true, products: productsWithMedia });
        });
      },
    );
  });

  router.get('/products/:id/reviews', validateIdParams('id'), (req, res) => {
    db.all(
      `SELECT r.*, u.name as user_name
       FROM product_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id],
      (error, reviews) => {
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, reviews });
      },
    );
  });

  router.post('/products/:id/reviews', protect, validateIdParams('id'), validateProductReview, (req, res) => {
    const productId = req.params.id;
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    db.get(
      'SELECT * FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = ? AND o.user_id = ?',
      [productId, req.user.id],
      (purchaseError, purchase) => {
        if (purchaseError || !purchase) {
          return res.status(403).json({ error: 'You can only review products you have purchased' });
        }
        db.get(
          'SELECT * FROM product_reviews WHERE product_id = ? AND user_id = ?',
          [productId, req.user.id],
          (reviewLookupError, existingReview) => {
            if (reviewLookupError) return res.status(500).json({ error: reviewLookupError.message });
            if (existingReview) return res.status(400).json({ error: 'You have already reviewed this product' });
            db.run(
              'INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
              [productId, req.user.id, rating, comment || ''],
              (insertError) => {
                if (insertError) return res.status(500).json({ error: insertError.message });
                db.get(
                  'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM product_reviews WHERE product_id = ?',
                  [productId],
                  (statsError, result) => {
                    if (!statsError && result) {
                      db.run(
                        'UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?',
                        [Math.round(result.avg_rating * 10) / 10, result.review_count, productId],
                      );
                    }
                    return res.json({ success: true, message: 'Review added' });
                  },
                );
              },
            );
          },
        );
      },
    );
  });

  return router;
};

module.exports = createProductRoutes;

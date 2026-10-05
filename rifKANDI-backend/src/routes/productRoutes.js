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
  AuditService,
  NotificationService,
}) => {
  const router = express.Router();
  const reportReasons = new Set(['scam', 'prohibited', 'misleading', 'counterfeit', 'other']);

  const attachMedia = (products, done) => {
    if (!products.length) return done(products);

    // Fetch media for one catalogue page in a single query. The former
    // per-product queries became an N+1 bottleneck as listings increased.
    const productIds = products.map((product) => product.id);
    db.all(
      `SELECT * FROM product_media
       WHERE product_id IN (${productIds.map(() => '?').join(', ')})
       ORDER BY product_id, display_order, id`,
      productIds,
      (error, media) => {
        if (error) return done(products.map((product) => ({ ...product, media: [] })));
        const mediaByProduct = new Map();
        for (const item of media || []) {
          const collection = mediaByProduct.get(item.product_id) || [];
          collection.push(item);
          mediaByProduct.set(item.product_id, collection);
        }
        return done(products.map((product) => ({
          ...product,
          media: mediaByProduct.get(product.id) || [],
        })));
      },
    );
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
    // A seller with an overdue, verified-delivery COD commission cannot accept
    // new sales. This is enforced in the catalogue and again at checkout.
    let whereClause = `p.status = 'published' AND NOT EXISTS (
      SELECT 1 FROM cod_fulfillments debt
      WHERE debt.seller_id = p.seller_id
        AND debt.commission_payment_status = 'due'
        AND debt.commission_due_at <= CURRENT_TIMESTAMP
    )`;
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
       WHERE p.id = ? AND p.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM cod_fulfillments debt
           WHERE debt.seller_id = p.seller_id
             AND debt.commission_payment_status = 'due'
             AND debt.commission_due_at <= CURRENT_TIMESTAMP
         )`,
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
    const { title, description, price, old_price: oldPrice, category, stock, media, condition, origin_city: originCity, preparation_days: preparationDays, estimated_delivery_days: estimatedDeliveryDays } = req.body;
    const priceMinor = Money.toMinor(price);
    const oldPriceMinor = oldPrice === undefined ? null : Money.toMinor(oldPrice);

    db.run(
      `INSERT INTO products
       (title, description, price, old_price, price_minor, old_price_minor, delivery_fee, delivery_fee_minor, category, stock, seller_id, condition, origin_city, preparation_days, estimated_delivery_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        Money.fromMinor(priceMinor),
        oldPriceMinor === null ? null : Money.fromMinor(oldPriceMinor),
        priceMinor,
        oldPriceMinor,
        0,
        0,
        category,
        stock,
        req.user.id,
        condition || 'new',
        originCity || '', preparationDays ?? 1, estimatedDeliveryDays ?? 3,
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
    const { title, description, price, old_price: oldPrice, category, stock, media, condition, origin_city: originCity, preparation_days: preparationDays, estimated_delivery_days: estimatedDeliveryDays } = req.body;
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
           condition = COALESCE(?, condition),
           origin_city = COALESCE(?, origin_city),
           preparation_days = COALESCE(?, preparation_days),
           estimated_delivery_days = COALESCE(?, estimated_delivery_days)
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
          originCity,
          preparationDays,
          estimatedDeliveryDays,
          req.params.id,
        ],
        (updateError) => {
          if (updateError) return res.status(400).json({ error: updateError.message });
          // Omitted media means a normal partial edit. Do not erase existing
          // images unless the seller explicitly supplied a replacement list.
          if (media === undefined) return res.json({ success: true, message: 'Product updated' });

          db.run('DELETE FROM product_media WHERE product_id = ?', [req.params.id], (deleteError) => {
            if (deleteError) return res.status(500).json({ error: 'Unable to update product media.' });
            if (!media.length) return res.json({ success: true, message: 'Product updated' });

            let inserted = 0;
            let failed = false;
            media.forEach((item, index) => {
              db.run(
                'INSERT INTO product_media (product_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
                [req.params.id, item.type, item.url, index, index === 0 ? 1 : 0],
                (mediaError) => {
                  if (failed) return;
                  if (mediaError) {
                    failed = true;
                    return res.status(500).json({ error: 'Unable to save product media.' });
                  }
                  inserted += 1;
                  if (inserted === media.length) return res.json({ success: true, message: 'Product updated' });
                },
              );
            });
          });
        },
      );
    });
  });

  router.delete('/products/:id', protect, requireSeller, validateIdParams('id'), (req, res) => {
    db.get('SELECT seller_id FROM products WHERE id = ?', [req.params.id], (lookupError, product) => {
      if (lookupError) return res.status(500).json({ error: 'Could not find this product.' });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.seller_id !== req.user.id && !isAdmin(req.user)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const endProduct = (message) => db.run(
        "UPDATE products SET status = 'ended', stock = 0 WHERE id = ?",
        [req.params.id],
        (endError) => {
          if (endError) return res.status(500).json({ error: 'Could not end this listing.' });
          return res.json({ success: true, archived: true, message });
        },
      );

      // Order items are an immutable record of what was sold. Removing their
      // product would corrupt accounting, COD reconciliation, and buyer order
      // history. End the listing instead, which immediately removes it from
      // the catalogue and prevents a new checkout.
      db.get('SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?', [req.params.id], (orderError, result) => {
        if (orderError) return res.status(500).json({ error: 'Could not check this product history.' });
        if (Number(result?.count || 0) > 0) {
          return endProduct('Product removed from sale. Its completed order history was kept safely.');
        }

        // Stop new purchases first, then clear transient cart entries before
        // the physical delete. This keeps both SQLite and PostgreSQL foreign
        // key rules satisfied without touching historical transactions.
        db.run("UPDATE products SET status = 'ended', stock = 0 WHERE id = ?", [req.params.id], (endError) => {
          if (endError) return res.status(500).json({ error: 'Could not prepare this product for deletion.' });
          db.run('DELETE FROM cart WHERE product_id = ?', [req.params.id], (cartError) => {
            if (cartError) return res.status(500).json({ error: 'Could not clear active carts for this product.' });
            db.run('DELETE FROM products WHERE id = ?', [req.params.id], function onProductDeleted(deleteError) {
              if (!deleteError) return res.json({ success: true, deleted: true, message: 'Product deleted.' });

              // A checkout can complete between the history check and this
              // delete. The product is already ended, so retain it safely
              // rather than surfacing a misleading deletion failure.
              if (/foreign key|constraint/i.test(deleteError.message || '')) {
                return res.json({
                  success: true,
                  archived: true,
                  message: 'Product removed from sale. Its order history was kept safely.',
                });
              }
              return res.status(500).json({ error: 'Could not delete this product.' });
            });
          });
        });
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

  router.post('/products/:id/reports', protect, validateIdParams('id'), (req, res) => {
    const reason = String(req.body?.reason || '').trim().toLowerCase();
    const details = String(req.body?.details || '').trim();
    if (!reportReasons.has(reason) || details.length < 10 || details.length > 1_000) {
      return res.status(422).json({ error: 'Choose a report reason and provide 10 to 1000 characters of detail.' });
    }
    db.get('SELECT seller_id FROM products WHERE id = ?', [req.params.id], (productError, product) => {
      if (productError) return res.status(500).json({ error: 'Unable to verify this listing.' });
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      if (Number(product.seller_id) === Number(req.user.id)) return res.status(403).json({ error: 'You cannot report your own listing.' });
      db.get("SELECT id FROM product_reports WHERE product_id = ? AND reporter_id = ? AND status = 'pending'", [req.params.id, req.user.id], (lookupError, existing) => {
        if (lookupError) return res.status(500).json({ error: 'Unable to submit this report.' });
        if (existing) return res.status(409).json({ error: 'You already have a report under review for this listing.' });
        db.run('INSERT INTO product_reports (product_id, reporter_id, reason, details) VALUES (?, ?, ?, ?)', [req.params.id, req.user.id, reason, details], async function onReportCreated(insertError) {
          if (insertError) return res.status(500).json({ error: 'Unable to submit this report.' });
          if (AuditService) void AuditService.record({ actorUserId: req.user.id, actorRole: req.user.role, action: 'product.reported', resourceType: 'product_report', resourceId: this.lastID, metadata: { productId: Number(req.params.id), reason } }).catch(() => undefined);
          if (NotificationService) void NotificationService.createForRoles(['admin', 'super_admin'], {
            kind: 'moderation.report_created',
            title: 'New product report',
            body: 'A listing was reported and is ready for moderation review.',
            href: '/admin/product-reports',
            metadata: { productId: Number(req.params.id), reportId: this.lastID, reason },
          }).catch(() => undefined);
          return res.status(201).json({ success: true, message: 'Thanks. Our team will review this listing.', reportId: this.lastID });
        });
      });
    });
  });

  router.get('/admin/product-reports', protect, (req, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Administrator access is required.' });
    db.all(`SELECT r.id, r.reason, r.details, r.status, r.resolution_note, r.created_at,
                   p.id AS product_id, p.title AS product_title, p.status AS product_status,
                   reporter.name AS reporter_name, reviewer.name AS reviewer_name
            FROM product_reports r
            JOIN products p ON p.id = r.product_id
            JOIN users reporter ON reporter.id = r.reporter_id
            LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
            ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at ASC`, [], (error, reports) => {
      if (error) return res.status(500).json({ error: 'Unable to load moderation reports.' });
      return res.json({ success: true, reports });
    });
  });

  router.patch('/admin/product-reports/:id', protect, validateIdParams('id'), (req, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Administrator access is required.' });
    const decision = String(req.body?.decision || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!['dismiss', 'remove_listing'].includes(decision) || note.length < 3 || note.length > 1_000) return res.status(422).json({ error: 'Choose a moderation decision and provide a short note.' });
    db.get(`SELECT r.id, r.product_id, p.seller_id, p.title AS product_title
            FROM product_reports r JOIN products p ON p.id = r.product_id
            WHERE r.id = ? AND r.status = 'pending'`, [req.params.id], (lookupError, report) => {
      if (lookupError) return res.status(500).json({ error: 'Unable to review this report.' });
      if (!report) return res.status(404).json({ error: 'Open report not found.' });
      const resolve = () => db.run("UPDATE product_reports SET status = ?, resolution_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'", [decision === 'dismiss' ? 'dismissed' : 'resolved', note, req.user.id, report.id], async function onResolved(updateError) {
        if (updateError || this.changes !== 1) return res.status(409).json({ error: 'This report was already reviewed.' });
        if (AuditService) void AuditService.record({ actorUserId: req.user.id, actorRole: req.user.role, action: `product_report.${decision}`, resourceType: 'product_report', resourceId: report.id, metadata: { productId: report.product_id } }).catch(() => undefined);
        if (NotificationService) void NotificationService.create({
          userId: report.seller_id,
          kind: `moderation.report_${decision}`,
          title: decision === 'remove_listing' ? 'Listing removed from sale' : 'Listing report reviewed',
          body: decision === 'remove_listing'
            ? `Your listing "${report.product_title}" was removed after moderation review.`
            : `A report about "${report.product_title}" was reviewed and dismissed.`,
          href: '/seller/dashboard/products',
          metadata: { productId: report.product_id, reportId: report.id },
        }).catch(() => undefined);
        return res.json({ success: true });
      });
      if (decision === 'dismiss') return resolve();
      db.run("UPDATE products SET status = 'ended', stock = 0 WHERE id = ?", [report.product_id], (productError) => {
        if (productError) return res.status(500).json({ error: 'Unable to remove this listing from sale.' });
        return resolve();
      });
    });
  });

  router.post('/products/:id/reviews', protect, validateIdParams('id'), validateProductReview, (req, res) => {
    const productId = req.params.id;
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    db.get(
      "SELECT * FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = ? AND o.user_id = ? AND o.status = 'delivered'",
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

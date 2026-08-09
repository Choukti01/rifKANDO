const express = require('express');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');

/**
 * Private digital product catalog, purchase history, and protected downloads.
 * Storage and database helpers are injected by the composition root so this
 * domain cannot silently bypass the application's security boundaries.
 */
const createDigitalRoutes = ({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateDigitalCreate,
  validateDigitalUpdate,
  requireFeature,
  storageService,
  path,
  getDatabaseRow,
  runDatabaseStatement,
  streamPrivateAttachment,
}) => {
  const router = express.Router();

// ==================== DIGITAL PRODUCT ENDPOINTS ====================
// (unchanged – kept exactly as in original)
const privateDigitalKeyForSeller = (storageReference, sellerId) => {
  try {
    const key = storageService.keyFromReference(storageReference, 'private');
    const ownerPrefix = sellerId === undefined
      ? 'private/digital-files-user-'
      : `private/digital-files-user-${sellerId}/`;
    return key?.startsWith(ownerPrefix) ? key : null;
  } catch (_) {
    return null;
  }
};

const removePrivateDigitalFields = (product) => {
  if (!product) return product;
  delete product.file_url;
  delete product.file_name;
  delete product.file_content_type;
  return product;
};

router.post('/digital', protect, requireSeller, validateDigitalCreate, (req, res) => {
  const { title, description, price, old_price, category, file_url, file_name, file_content_type, file_size, download_limit, image, media } = req.body;
  const fileKey = privateDigitalKeyForSeller(file_url, req.user.id);
  if (!fileKey) return res.status(400).json({ error: 'Upload a private digital file before publishing this product.' });
  if (media && (!Array.isArray(media) || !media.every((item) => item?.type === 'image' && storageService.publicKeyFromUrl(item.url)))) {
    return res.status(400).json({ error: 'Digital product media must use uploaded public images.' });
  }

  db.run(`
    INSERT INTO digital_products (
      title, description, price, old_price, category, file_type, file_url, file_name, file_content_type, file_size, download_limit, image, seller_id, status
    ) VALUES (?, ?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, file_url, file_name || path.basename(fileKey), file_content_type || 'application/octet-stream', file_size || '', download_limit || 0, image || '💻', req.user.id
  ], function(err) {
    if (err) {
      console.error('Digital product creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const productId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO digital_media (digital_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [productId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, product: { id: productId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, product: { id: productId, ...req.body } });
      }
    }
  });
});

router.get('/digital', (req, res) => {
  const { page, limit, offset } = getPagination(req.query);

  db.get("SELECT COUNT(*) AS total FROM digital_products WHERE status = 'published'", (countError, countRow) => {
    if (countError) return res.status(500).json({ error: countError.message });

    const pagination = createPaginationMetadata(page, limit, countRow?.total || 0);
    const sendProducts = (products) => {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ success: true, products, pagination });
    };

    db.all(`
      SELECT d.*, u.name as seller_name, u.id as seller_id
      FROM digital_products d
      JOIN users u ON d.seller_id = u.id
      WHERE d.status = 'published'
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return sendProducts([]);

      let completed = 0;
      rows.forEach((product) => {
        db.all(`SELECT * FROM digital_media WHERE digital_id = ? ORDER BY display_order, id`, [product.id], (mediaError, media) => {
          if (!mediaError) product.media = media || [];
          completed++;
          if (completed === rows.length) sendProducts(rows.map(removePrivateDigitalFields));
        });
      });
    });
  });
});

router.get('/digital/:id', (req, res) => {
  db.get(`
    SELECT d.*, u.name as seller_name, u.id as seller_id
    FROM digital_products d
    JOIN users u ON d.seller_id = u.id
    WHERE d.id = ?
  `, [req.params.id], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!product) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      db.all(`SELECT * FROM digital_media WHERE digital_id = ? ORDER BY display_order, id`, [product.id], (err, media) => {
        if (!err) product.media = media || [];
        res.json({ success: true, product: removePrivateDigitalFields(product) });
      });
    }
  });
});

router.get('/my-digital', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT d.*,
      (SELECT COUNT(*) FROM digital_purchases WHERE product_id = d.id) as sales_count
    FROM digital_products d
    WHERE d.seller_id = ?
    ORDER BY d.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, products: [] });
      let completed = 0;
      rows.forEach((product) => {
        db.all(`SELECT * FROM digital_media WHERE digital_id = ? ORDER BY display_order, id`, [product.id], (err, media) => {
          if (!err) product.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, products: rows });
          }
        });
      });
    }
  });
});

router.put('/digital/:id', protect, requireSeller, validateIdParams('id'), validateDigitalUpdate, async (req, res) => {
  try {
    const existing = await getDatabaseRow('SELECT * FROM digital_products WHERE id = ? AND seller_id = ?', [req.params.id, req.user.id]);
    if (!existing) return res.status(404).json({ error: 'Digital product not found.' });

    const { title, description, price, old_price, category, file_url, file_name, file_content_type, file_size, download_limit, image, media } = req.body;
    const fileKey = privateDigitalKeyForSeller(file_url || existing.file_url, req.user.id);
    if (!fileKey) return res.status(400).json({ error: 'Upload a private digital file before updating this product.' });
    if (media && (!Array.isArray(media) || !media.every((item) => item?.type === 'image' && storageService.publicKeyFromUrl(item.url)))) {
      return res.status(400).json({ error: 'Digital product media must use uploaded public images.' });
    }

    await runDatabaseStatement(`
      UPDATE digital_products SET
        title = ?, description = ?, price = ?, old_price = ?, category = ?, file_type = 'file',
        file_url = ?, file_name = ?, file_content_type = ?, file_size = ?, download_limit = ?, image = ?
      WHERE id = ?
    `, [
      title, description, price, old_price || null, category,
      file_url || existing.file_url,
      file_name || existing.file_name || path.basename(fileKey),
      file_content_type || existing.file_content_type || 'application/octet-stream',
      file_size || existing.file_size || '', download_limit || 0, image || existing.image,
      existing.id,
    ]);

    if (media) {
      await runDatabaseStatement('DELETE FROM digital_media WHERE digital_id = ?', [existing.id]);
      for (const [index, item] of media.entries()) {
        await runDatabaseStatement(
          'INSERT INTO digital_media (digital_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
          [existing.id, item.type, item.url, index, index === 0 ? 1 : 0]
        );
      }
    }
    return res.json({ success: true, message: 'Digital product updated.' });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'digital_product_update_failed', error: error.message }));
    return res.status(500).json({ error: 'Unable to update the digital product.' });
  }
});

router.delete('/digital/:id', protect, requireSeller, validateIdParams('id'), (req, res) => {
  db.get('SELECT seller_id FROM digital_products WHERE id = ?', [req.params.id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run('DELETE FROM digital_products WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM digital_media WHERE digital_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted' });
      }
    });
  });
});

router.post('/digital/:id/purchase', protect, (req, res) => {
  return res.status(410).json({ error: 'This legacy purchase endpoint is disabled. Request access and wait for the seller to approve it.' });
});

router.get('/my-purchases', protect, (req, res) => {
  db.all(`
    SELECT
      p.id, p.order_number, p.product_id, p.seller_id, p.price, p.file_type,
      p.download_limit, p.download_count, p.last_downloaded_at, p.status, p.created_at,
      d.title,
      d.image,
      d.file_type,
      d.file_name,
      d.download_limit,
      d.file_size,
      d.seller_id
    FROM digital_purchases p
    JOIN digital_products d ON p.product_id = d.id
    WHERE p.buyer_id = ?
    ORDER BY p.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, purchases: rows });
    }
  });
});

const downloadDigitalProduct = async (req, res) => {
  try {
    const purchase = await getDatabaseRow(`
      SELECT dp.id, dp.download_limit, dp.download_count, d.file_url, d.file_name, d.file_content_type
      FROM digital_purchases dp
      JOIN digital_products d ON d.id = dp.product_id
      WHERE dp.product_id = ? AND dp.buyer_id = ?
      ORDER BY dp.id DESC
      LIMIT 1
    `, [req.params.id, req.user.id]);
    if (!purchase) return res.status(403).json({ error: 'You do not have download access to this product.' });
    if (purchase.download_limit > 0 && purchase.download_count >= purchase.download_limit) {
      return res.status(403).json({ error: 'Your download limit has been reached.' });
    }
    const key = privateDigitalKeyForSeller(purchase.file_url, undefined);
    if (!key) {
      return res.status(410).json({ error: 'This digital file must be migrated to private storage before it can be downloaded.' });
    }
    const reserved = await runDatabaseStatement(
      `UPDATE digital_purchases
       SET download_count = download_count + 1, last_downloaded_at = CURRENT_TIMESTAMP
       WHERE id = ? AND (download_limit = 0 OR download_count < download_limit)`,
      [purchase.id]
    );
    if (reserved.changes !== 1) return res.status(403).json({ error: 'Your download limit has been reached.' });
    await streamPrivateAttachment(res, key, purchase.file_name || `digital-${req.params.id}`, purchase.file_content_type || 'application/octet-stream');
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'digital_download_failed', error: error.message }));
    if (!res.headersSent) return res.status(500).json({ error: 'Unable to prepare this download.' });
  }
};

router.get('/digital/:id/download', protect, requireFeature('digital_downloads'), downloadDigitalProduct);

  return router;
};

module.exports = createDigitalRoutes;

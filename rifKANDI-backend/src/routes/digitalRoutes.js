const express = require('express');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');
const {
  all,
  get: getRow,
  run,
  withTransaction,
} = require('../services/bookingProtocolService');
const { verifyUploadReceipt } = require('../services/digitalFileService');

const fileSizeLabel = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 1) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unit = 0;
  let size = value;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
};

const createDigitalRoutes = ({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateDigitalCreate,
  validateDigitalUpdate,
  validateDigitalAccessRequest,
  validateDigitalAccessDecision,
  requireFeature,
  storageService,
  streamPrivateAttachment,
  auditService,
}) => {
  const router = express.Router();

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

  const publicProduct = (product) => {
    if (!product) return product;
    const {
      file_url: ignoredReference,
      file_name: ignoredFileName,
      file_content_type: ignoredContentType,
      file_sha256: ignoredChecksum,
      ...safeProduct
    } = product;
    return safeProduct;
  };

  const sellerProduct = (product) => {
    if (!product) return product;
    const { file_url: ignoredReference, ...safeProduct } = product;
    return safeProduct;
  };

  const uploadedFileForSeller = ({ file_url: storageReference, upload_receipt: receipt }, sellerId) => {
    const key = privateDigitalKeyForSeller(storageReference, sellerId);
    if (!key) throw new Error('Upload a private digital file before publishing this product.');
    const upload = verifyUploadReceipt({ receipt, storageReference, sellerId });
    if (upload.key !== key) throw new Error('Upload receipt does not match this file. Upload the file again.');
    return {
      reference: storageReference,
      name: upload.fileName,
      contentType: upload.contentType,
      sizeBytes: upload.fileSize,
      sizeLabel: fileSizeLabel(upload.fileSize),
      sha256: upload.sha256,
    };
  };

  const attachMedia = async (product) => ({
    ...product,
    media: await all(db, 'SELECT * FROM digital_media WHERE digital_id = ? ORDER BY display_order, id', [product.id]),
  });

  const record = async (req, action, resourceId, metadata = {}) => {
    if (!auditService) return;
    try {
      await auditService.recordFromRequest(req, {
        action,
        resourceType: 'digital_product',
        resourceId: String(resourceId),
        metadata,
      });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'digital_audit_log_failed', error: error.message }));
    }
  };

  router.post('/digital', protect, requireSeller, validateDigitalCreate, async (req, res) => {
    try {
      const file = uploadedFileForSeller(req.body, req.user.id);
      const product = await withTransaction(db, async (transaction) => {
        const inserted = await run(transaction, `
          INSERT INTO digital_products (
            title, description, price, old_price, category, file_type, file_url, file_name,
            file_content_type, file_size, file_size_bytes, file_sha256, download_limit, image, seller_id, status
          ) VALUES (?, ?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
        `, [
          req.body.title, req.body.description, req.body.price, req.body.old_price ?? null, req.body.category,
          file.reference, file.name, file.contentType, file.sizeLabel, file.sizeBytes, file.sha256,
          req.body.download_limit ?? 0, req.body.image || '💻', req.user.id,
        ]);
        for (const [index, media] of (req.body.media || []).entries()) {
          await run(transaction, `
            INSERT INTO digital_media (digital_id, media_type, media_url, display_order, is_primary)
            VALUES (?, ?, ?, ?, ?)
          `, [inserted.lastID, media.type, media.url, index, index === 0 ? 1 : 0]);
        }
        return getRow(transaction, 'SELECT * FROM digital_products WHERE id = ?', [inserted.lastID]);
      });
      await record(req, 'digital.product_created', product.id, { category: product.category, fileType: product.file_content_type });
      return res.status(201).json({ success: true, product: sellerProduct(await attachMedia(product)) });
    } catch (error) {
      const status = /receipt|private digital file|Upload a private/i.test(error.message) ? 400 : 500;
      if (status === 500) console.error(JSON.stringify({ level: 'error', event: 'digital_product_create_failed', error: error.message }));
      return res.status(status).json({ error: status === 400 ? error.message : 'Unable to create the digital product.' });
    }
  });

  router.get('/digital', async (req, res) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const count = await getRow(db, "SELECT COUNT(*) AS total FROM digital_products WHERE status = 'published'");
      const products = await all(db, `
        SELECT d.*, u.name AS seller_name, u.id AS seller_id
        FROM digital_products d
        JOIN users u ON d.seller_id = u.id
        WHERE d.status = 'published'
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      const results = await Promise.all(products.map(attachMedia));
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({
        success: true,
        products: results.map(publicProduct),
        pagination: createPaginationMetadata(page, limit, count?.total || 0),
      });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'digital_catalog_failed', error: error.message }));
      return res.status(500).json({ error: 'Unable to load digital products.' });
    }
  });

  router.get('/digital/:id/manage', protect, requireSeller, validateIdParams('id'), async (req, res) => {
    try {
      const product = await getRow(db, 'SELECT * FROM digital_products WHERE id = ? AND seller_id = ?', [req.params.id, req.user.id]);
      if (!product) return res.status(404).json({ error: 'Digital product not found.' });
      return res.json({ success: true, product: sellerProduct(await attachMedia(product)) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load the digital product.' });
    }
  });

  router.get('/digital/:id', validateIdParams('id'), async (req, res) => {
    try {
      const product = await getRow(db, `
        SELECT d.*, u.name AS seller_name, u.id AS seller_id
        FROM digital_products d
        JOIN users u ON d.seller_id = u.id
        WHERE d.id = ? AND d.status = 'published'
      `, [req.params.id]);
      if (!product) return res.status(404).json({ error: 'Product not found.' });
      return res.json({ success: true, product: publicProduct(await attachMedia(product)) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load the digital product.' });
    }
  });

  router.get('/my-digital', protect, requireSeller, async (req, res) => {
    try {
      const products = await all(db, `
        SELECT d.*, (SELECT COUNT(*) FROM digital_purchases WHERE product_id = d.id) AS sales_count
        FROM digital_products d
        WHERE d.seller_id = ?
        ORDER BY d.created_at DESC
      `, [req.user.id]);
      return res.json({ success: true, products: (await Promise.all(products.map(attachMedia))).map(sellerProduct) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load your digital products.' });
    }
  });

  router.put('/digital/:id', protect, requireSeller, validateIdParams('id'), validateDigitalUpdate, async (req, res) => {
    try {
      const existing = await getRow(db, 'SELECT * FROM digital_products WHERE id = ? AND seller_id = ?', [req.params.id, req.user.id]);
      if (!existing) return res.status(404).json({ error: 'Digital product not found.' });
      const replacement = req.body.file_url ? uploadedFileForSeller(req.body, req.user.id) : null;
      const product = await withTransaction(db, async (transaction) => {
        await run(transaction, `
          UPDATE digital_products SET
            title = ?, description = ?, price = ?, old_price = ?, category = ?, file_type = 'file',
            file_url = ?, file_name = ?, file_content_type = ?, file_size = ?, file_size_bytes = ?, file_sha256 = ?,
            download_limit = ?, image = ?
          WHERE id = ?
        `, [
          req.body.title ?? existing.title,
          req.body.description ?? existing.description,
          req.body.price ?? existing.price,
          req.body.old_price ?? existing.old_price,
          req.body.category ?? existing.category,
          replacement?.reference ?? existing.file_url,
          replacement?.name ?? existing.file_name,
          replacement?.contentType ?? existing.file_content_type,
          replacement?.sizeLabel ?? existing.file_size,
          replacement?.sizeBytes ?? existing.file_size_bytes,
          replacement?.sha256 ?? existing.file_sha256,
          req.body.download_limit ?? existing.download_limit,
          req.body.image ?? existing.image,
          existing.id,
        ]);
        if (req.body.media !== undefined) {
          await run(transaction, 'DELETE FROM digital_media WHERE digital_id = ?', [existing.id]);
          for (const [index, media] of req.body.media.entries()) {
            await run(transaction, `
              INSERT INTO digital_media (digital_id, media_type, media_url, display_order, is_primary)
              VALUES (?, ?, ?, ?, ?)
            `, [existing.id, media.type, media.url, index, index === 0 ? 1 : 0]);
          }
        }
        return getRow(transaction, 'SELECT * FROM digital_products WHERE id = ?', [existing.id]);
      });
      await record(req, replacement ? 'digital.product_file_replaced' : 'digital.product_updated', product.id, {
        replacement: Boolean(replacement),
        category: product.category,
      });
      return res.json({ success: true, product: sellerProduct(await attachMedia(product)) });
    } catch (error) {
      const status = /receipt|private digital file|Upload a private/i.test(error.message) ? 400 : 500;
      if (status === 500) console.error(JSON.stringify({ level: 'error', event: 'digital_product_update_failed', error: error.message }));
      return res.status(status).json({ error: status === 400 ? error.message : 'Unable to update the digital product.' });
    }
  });

  router.delete('/digital/:id', protect, requireSeller, validateIdParams('id'), async (req, res) => {
    try {
      const product = await getRow(db, 'SELECT id FROM digital_products WHERE id = ? AND seller_id = ?', [req.params.id, req.user.id]);
      if (!product) return res.status(404).json({ error: 'Digital product not found.' });
      await withTransaction(db, async (transaction) => {
        await run(transaction, 'DELETE FROM digital_media WHERE digital_id = ?', [product.id]);
        await run(transaction, 'DELETE FROM digital_products WHERE id = ?', [product.id]);
      });
      await record(req, 'digital.product_deleted', product.id);
      return res.json({ success: true, message: 'Digital product deleted.' });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to delete the digital product.' });
    }
  });

  router.post('/digital/:id/purchase', protect, (req, res) => res.status(410).json({
    error: 'This legacy purchase endpoint is disabled. Request access through the product page instead.',
  }));

  router.post('/digital/:id/request', protect, validateIdParams('id'), validateDigitalAccessRequest, async (req, res) => {
    try {
      const product = await getRow(db, "SELECT id, seller_id FROM digital_products WHERE id = ? AND status = 'published'", [req.params.id]);
      if (!product) return res.status(404).json({ error: 'Digital product not found.' });
      if (Number(product.seller_id) === Number(req.user.id)) return res.status(422).json({ error: 'You cannot request access to your own digital product.' });
      const existing = await getRow(db, `
        SELECT id FROM digital_requests
        WHERE digital_id = ? AND buyer_id = ? AND status = 'pending'
        ORDER BY id DESC LIMIT 1
      `, [product.id, req.user.id]);
      if (existing) return res.status(409).json({ error: 'You already have a pending access request for this product.' });
      const created = await run(db, `
        INSERT INTO digital_requests (digital_id, buyer_id, status, buyer_message, updated_at)
        VALUES (?, ?, 'pending', ?, CURRENT_TIMESTAMP)
      `, [product.id, req.user.id, req.body.message || null]);
      await record(req, 'digital.access_requested', product.id, { requestId: created.lastID });
      return res.status(201).json({ success: true, message: 'Access request sent. You will be notified when the seller responds.' });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'digital_access_request_failed', error: error.message }));
      return res.status(500).json({ error: 'Unable to send the access request.' });
    }
  });

  router.get('/seller/digital-requests', protect, requireSeller, async (req, res) => {
    try {
      const requests = await all(db, `
        SELECT dr.id, dr.digital_id, dr.status, dr.buyer_message, dr.decision_reason, dr.created_at, dr.updated_at,
               d.title AS product_title, u.name AS buyer_name
        FROM digital_requests dr
        JOIN digital_products d ON dr.digital_id = d.id
        JOIN users u ON dr.buyer_id = u.id
        WHERE d.seller_id = ?
        ORDER BY CASE dr.status WHEN 'pending' THEN 0 ELSE 1 END, dr.created_at DESC
      `, [req.user.id]);
      return res.json({ success: true, requests });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load digital access requests.' });
    }
  });

  router.post('/seller/digital-requests/:id/decision', protect, requireSeller, validateIdParams('id'), validateDigitalAccessDecision, async (req, res) => {
    try {
      const outcome = await withTransaction(db, async (transaction) => {
        const request = await getRow(transaction, `
          SELECT dr.*, d.seller_id, d.price, d.price_minor, d.file_url, d.file_type, d.file_name,
                 d.file_content_type, d.file_size, d.file_size_bytes, d.file_sha256, d.download_limit
          FROM digital_requests dr
          JOIN digital_products d ON d.id = dr.digital_id
          WHERE dr.id = ? AND d.seller_id = ?
          ${db.dialect === 'postgres' ? 'FOR UPDATE' : ''}
        `, [req.params.id, req.user.id]);
        if (!request) throw Object.assign(new Error('Digital access request not found.'), { statusCode: 404 });
        if (request.status !== 'pending') throw Object.assign(new Error('This access request has already been decided.'), { statusCode: 409 });

        const decision = req.body.action === 'grant' ? 'granted' : 'declined';
        const updated = await run(transaction, `
          UPDATE digital_requests
          SET status = ?, decision_reason = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'pending'
        `, [decision, req.body.reason || null, request.id]);
        if (updated.changes !== 1) throw Object.assign(new Error('This access request has already been decided.'), { statusCode: 409 });

        if (decision === 'declined') return { request, decision, purchaseCreated: false };

        const fileKey = privateDigitalKeyForSeller(request.file_url, request.seller_id);
        if (!fileKey) throw Object.assign(new Error('The product file is unavailable. Upload a new private file before granting access.'), { statusCode: 409 });
        const existingPurchase = await getRow(transaction, `
          SELECT id FROM digital_purchases WHERE product_id = ? AND buyer_id = ? ORDER BY id DESC LIMIT 1
          ${db.dialect === 'postgres' ? 'FOR UPDATE' : ''}
        `, [request.digital_id, request.buyer_id]);
        if (existingPurchase) return { request, decision, purchaseCreated: false };

        await run(transaction, `
          INSERT INTO digital_purchases (
            order_number, product_id, buyer_id, seller_id, price, price_minor, download_url, file_type,
            download_file_name, download_file_content_type, download_file_size, download_file_size_bytes,
            download_file_sha256, download_limit, granted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          `DIG-${Date.now()}-${request.id}`,
          request.digital_id, request.buyer_id, request.seller_id, request.price, request.price_minor,
          request.file_url, request.file_type, request.file_name, request.file_content_type, request.file_size,
          request.file_size_bytes, request.file_sha256, request.download_limit,
        ]);
        return { request, decision, purchaseCreated: true };
      });
      await record(req, outcome.decision === 'granted' ? 'digital.access_granted' : 'digital.access_declined', outcome.request.digital_id, {
        requestId: outcome.request.id,
        purchaseCreated: outcome.purchaseCreated,
      });
      return res.json({
        success: true,
        message: outcome.decision === 'granted'
          ? 'Download access granted. The buyer can now retrieve the file securely.'
          : 'Access request declined.',
      });
    } catch (error) {
      const status = error.statusCode || 500;
      if (status === 500) console.error(JSON.stringify({ level: 'error', event: 'digital_access_decision_failed', error: error.message }));
      return res.status(status).json({ error: status === 500 ? 'Unable to update the access request.' : error.message });
    }
  });

  router.get('/digital/:id/can-download', protect, validateIdParams('id'), async (req, res) => {
    try {
      const purchase = await getRow(db, `
        SELECT id, download_limit, download_count FROM digital_purchases
        WHERE product_id = ? AND buyer_id = ?
        ORDER BY id DESC LIMIT 1
      `, [req.params.id, req.user.id]);
      return res.json({
        success: true,
        canDownload: Boolean(purchase && (purchase.download_limit === 0 || purchase.download_count < purchase.download_limit)),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to check download access.' });
    }
  });

  router.get('/my-purchases', protect, async (req, res) => {
    try {
      const purchases = await all(db, `
        SELECT p.id, p.order_number, p.product_id, p.seller_id, p.price, p.file_type, p.download_limit,
               p.download_count, p.last_downloaded_at, p.granted_at, p.status, p.created_at,
               COALESCE(p.download_file_name, d.file_name) AS file_name,
               COALESCE(p.download_file_content_type, d.file_content_type) AS file_content_type,
               COALESCE(p.download_file_size, d.file_size) AS file_size,
               COALESCE(p.download_file_size_bytes, d.file_size_bytes) AS file_size_bytes,
               d.title, d.image, d.seller_id
        FROM digital_purchases p
        JOIN digital_products d ON p.product_id = d.id
        WHERE p.buyer_id = ?
        ORDER BY p.created_at DESC
      `, [req.user.id]);
      return res.json({ success: true, purchases });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load your digital purchases.' });
    }
  });

  router.get('/digital/:id/download', protect, requireFeature('digital_downloads'), validateIdParams('id'), async (req, res) => {
    try {
      const purchase = await getRow(db, `
        SELECT dp.id, dp.product_id, dp.seller_id, dp.download_limit, dp.download_count,
               COALESCE(dp.download_url, d.file_url) AS file_url,
               COALESCE(dp.download_file_name, d.file_name) AS file_name,
               COALESCE(dp.download_file_content_type, d.file_content_type) AS file_content_type
        FROM digital_purchases dp
        JOIN digital_products d ON d.id = dp.product_id
        WHERE dp.product_id = ? AND dp.buyer_id = ?
        ORDER BY dp.id DESC LIMIT 1
      `, [req.params.id, req.user.id]);
      if (!purchase) return res.status(403).json({ error: 'You do not have download access to this product.' });
      if (purchase.download_limit > 0 && purchase.download_count >= purchase.download_limit) {
        return res.status(403).json({ error: 'Your download limit has been reached.' });
      }
      const key = privateDigitalKeyForSeller(purchase.file_url);
      if (!key) return res.status(410).json({ error: 'This digital file is unavailable. Please contact support.' });
      const reserved = await run(db, `
        UPDATE digital_purchases
        SET download_count = download_count + 1, last_downloaded_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (download_limit = 0 OR download_count < download_limit)
      `, [purchase.id]);
      if (reserved.changes !== 1) return res.status(403).json({ error: 'Your download limit has been reached.' });
      await run(db, 'UPDATE digital_products SET downloads = downloads + 1 WHERE id = ?', [purchase.product_id]);
      await streamPrivateAttachment(res, key, purchase.file_name || `digital-${req.params.id}`, purchase.file_content_type || 'application/octet-stream');
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'digital_download_failed', error: error.message }));
      if (!res.headersSent) return res.status(500).json({ error: 'Unable to prepare this download.' });
    }
  });

  return router;
};

module.exports = createDigitalRoutes;

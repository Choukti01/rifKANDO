const storageService = require('./storageService');

const SNAPSHOT_KEY = 'public/catalog/latest.json';
const MAX_CATALOG_ITEMS = 500;

const all = (database, sql, params = []) => new Promise((resolve, reject) => {
  database.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows || [])));
});

const get = (database, sql, params = []) => new Promise((resolve, reject) => {
  database.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
});

const numeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

class PublicCatalogSnapshotService {
  constructor(database, storage = storageService) {
    this.database = database;
    this.storage = storage;
    this.publishing = null;
  }

  isAvailable() {
    return !this.storage.isLocal() && Boolean(this.storage.publicBaseUrl && this.storage.publicBucket);
  }

  async build() {
    const [productCount, products, finditRequests] = await Promise.all([
      get(this.database, `
        SELECT COUNT(*) AS total
        FROM products p
        WHERE p.status = 'published'
          AND NOT EXISTS (
            SELECT 1 FROM cod_fulfillments debt
            WHERE debt.seller_id = p.seller_id
              AND debt.commission_payment_status = 'due'
              AND debt.commission_due_at <= CURRENT_TIMESTAMP
          )
      `),
      all(this.database, `
        SELECT p.id, p.title, p.description, p.price, p.price_minor, p.old_price, p.old_price_minor,
               p.delivery_fee, p.delivery_fee_minor, p.category, p.stock, p.condition, p.origin_city,
               p.preparation_days, p.estimated_delivery_days, p.rating, p.review_count, p.sold, p.created_at,
               u.id AS seller_id, u.name AS seller_name
        FROM products p
        JOIN users u ON u.id = p.seller_id
        WHERE p.status = 'published'
          AND NOT EXISTS (
            SELECT 1 FROM cod_fulfillments debt
            WHERE debt.seller_id = p.seller_id
              AND debt.commission_payment_status = 'due'
              AND debt.commission_due_at <= CURRENT_TIMESTAMP
          )
        ORDER BY p.created_at DESC
        LIMIT ?
      `, [MAX_CATALOG_ITEMS]),
      all(this.database, `
        SELECT r.id, r.request_number, r.title, r.description, r.category, r.city,
               r.preferred_condition, r.budget_max, r.budget_max_minor, r.status, r.expires_at, r.created_at,
               (SELECT COUNT(*) FROM findit_offers fo WHERE fo.request_id = r.id AND fo.status = 'active') AS offer_count
        FROM findit_requests r
        WHERE r.status = 'active' AND r.expires_at > CURRENT_TIMESTAMP
        ORDER BY r.created_at DESC
        LIMIT ?
      `, [MAX_CATALOG_ITEMS]),
    ]);

    const productIds = products.map((product) => product.id);
    const requestIds = finditRequests.map((request) => request.id);
    const [productMedia, requestMedia] = await Promise.all([
      productIds.length
        ? all(this.database, `
          SELECT product_id, media_type, media_url, display_order, is_primary
          FROM product_media
          WHERE product_id IN (${productIds.map(() => '?').join(', ')})
          ORDER BY product_id, display_order, id
        `, productIds)
        : [],
      requestIds.length
        ? all(this.database, `
          SELECT request_id, media_url, display_order
          FROM findit_request_media
          WHERE request_id IN (${requestIds.map(() => '?').join(', ')})
          ORDER BY request_id, display_order, id
        `, requestIds)
        : [],
    ]);

    const mediaByProduct = new Map();
    for (const media of productMedia) {
      const collection = mediaByProduct.get(media.product_id) || [];
      collection.push(media);
      mediaByProduct.set(media.product_id, collection);
    }
    const mediaByRequest = new Map();
    for (const media of requestMedia) {
      const collection = mediaByRequest.get(media.request_id) || [];
      collection.push(media);
      mediaByRequest.set(media.request_id, collection);
    }

    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      productsTotal: numeric(productCount?.total),
      productsTruncated: numeric(productCount?.total) > products.length,
      products: products.map((product) => ({
        ...product,
        stock: numeric(product.stock),
        price: numeric(product.price),
        price_minor: numeric(product.price_minor),
        old_price: product.old_price === null ? null : numeric(product.old_price),
        old_price_minor: product.old_price_minor === null ? null : numeric(product.old_price_minor),
        delivery_fee: numeric(product.delivery_fee),
        delivery_fee_minor: numeric(product.delivery_fee_minor),
        rating: numeric(product.rating),
        review_count: numeric(product.review_count),
        sold: numeric(product.sold),
        media: mediaByProduct.get(product.id) || [],
      })),
      finditRequests: finditRequests.map((request) => ({
        ...request,
        budget_max: numeric(request.budget_max),
        budget_max_minor: numeric(request.budget_max_minor),
        offer_count: numeric(request.offer_count),
        media: mediaByRequest.get(request.id) || [],
      })),
    };
  }

  async publish() {
    if (!this.isAvailable()) return { published: false, reason: 'object-storage-unavailable' };
    if (this.publishing) return this.publishing;

    this.publishing = (async () => {
      const snapshot = await this.build();
      await this.storage.put(SNAPSHOT_KEY, JSON.stringify(snapshot), {
        contentType: 'application/json; charset=utf-8',
        cacheControl: 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      });
      return {
        published: true,
        generatedAt: snapshot.generatedAt,
        productCount: snapshot.products.length,
        finditRequestCount: snapshot.finditRequests.length,
      };
    })();

    try {
      return await this.publishing;
    } finally {
      this.publishing = null;
    }
  }
}

module.exports = {
  PublicCatalogSnapshotService,
  SNAPSHOT_KEY,
};

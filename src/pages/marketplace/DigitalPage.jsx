import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDigitalProducts } from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import { getImageUrl } from '../../utils/imageUtils';
import MarketplaceImage from '../../components/common/MarketplaceImage';

const DigitalPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getDigitalProducts();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching digital products:', error);
      toast.error('Failed to load digital products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading digital products...</p>
      </div>
    );
  }

  return (
    <div className="digital-page">
      <div className="container">
        <div className="digital-header">
          <h1>Digital Products</h1>
          <p>Instant downloads – ebooks, software, templates and more</p>
        </div>

        <div className="digital-grid">
          {products.length === 0 ? (
            <p className="text-center col-span-full">No digital products found</p>
          ) : (
            products.map(product => {
              const primaryMedia = product.media?.find(m => m.is_primary) || product.media?.[0];
              return (
                <div key={product.id} className="digital-card">
                  <div 
                    className="digital-image" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (product.media?.length) setGalleryProduct(product);
                    }}
                  >
                    {primaryMedia ? (
                      <>
                        {primaryMedia.media_type === 'video' && <div className="video-badge">🎬 Video</div>}
                        <MarketplaceImage source={primaryMedia.media_url} alt={product.title} />
                        {product.media.length > 1 && (
                          <div className="media-count">{product.media.length} items</div>
                        )}
                      </>
                    ) : (
                      <div className="image-placeholder">{product.image || '💻'}</div>
                    )}
                  </div>
                  <Link to={`/digital/${product.id}`}>
                    <h3>{product.title}</h3>
                  </Link>
                  <p className="seller-name">
                    by <Link to={`/profile/${product.seller_id}`} className="seller-link">
                      {product.seller_name || 'Unknown Seller'}
                    </Link>
                  </p>
                  <div className="digital-meta">
                    <span>⭐ {product.rating || 0}</span>
                    <span>📥 {product.downloads || 0} downloads</span>
                  </div>
                  <div className="digital-price">
                    <span className="current-price">{product.price} MAD</span>
                    {product.old_price && <span className="old-price">{product.old_price} MAD</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {galleryProduct && (
        <MediaGallery
            media={galleryProduct.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}     
                 onClose={() => setGalleryProduct(null)}
        />
      )}

      <style>{`
        .digital-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .digital-header { text-align: center; margin-bottom: 2rem; }
        .digital-header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .digital-header p { color: #6b7280; }
        .digital-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .digital-card { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .digital-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .digital-image { height: 180px; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; }
        .digital-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .video-badge { position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .media-count { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .digital-card h3 { font-size: 1rem; font-weight: 600; margin: 0.75rem 1rem 0.25rem; color: #1a1a1a; }
        .digital-card a { text-decoration: none; }
        .seller-name { font-size: 0.75rem; color: #6b7280; margin: 0 1rem 0.5rem; }
        .seller-link { color: #87CEEB; text-decoration: none; }
        .seller-link:hover { text-decoration: underline; }
        .digital-meta { display: flex; gap: 1rem; margin: 0 1rem 0.5rem; font-size: 0.7rem; color: #6b7280; }
        .digital-price { margin: 0 1rem 0.75rem; display: flex; gap: 0.5rem; align-items: baseline; }
        .current-price { font-weight: 700; font-size: 1rem; }
        .old-price { font-size: 0.75rem; color: #9ca3af; text-decoration: line-through; }
      `}</style>
    </div>
  );
};

export default DigitalPage;

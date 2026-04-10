import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState(null);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data.products || []);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (!isAuthenticated) { toast.error('Please login'); return; }
    addToCart(product, 1, 'product');
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading products...</p></div>;

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header"><h1>Products</h1><p>Discover the best products from Moroccan sellers</p></div>
        <div className="products-grid">
          {products.length === 0 ? <p className="text-center col-span-full">No products found</p> : products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image" onClick={() => setGalleryProduct(product)}>
                {product.media && product.media.length > 0 ? (
                  <>
                    {product.media[0].media_type === 'video' && <div className="video-badge">🎬 Video</div>}
                    <img src={`http://localhost:5000${product.media[0].media_url}`} alt={product.title} />
                    {product.media.length > 1 && <div className="media-count">{product.media.length} items</div>}
                  </>
                ) : (
                  <div className="image-placeholder">📦</div>
                )}
              </div>
              <Link to={`/product/${product.id}`}><h3>{product.title}</h3></Link>
              {/* FIXED: seller_name instead of seller?.name */}
              <p>{product.seller_name || 'Unknown Seller'}</p>
              <div className="product-price">
                <span className="current-price">{product.price} MAD</span>
                {product.old_price && <span className="old-price">{product.old_price} MAD</span>}
              </div>
              <button onClick={() => handleAddToCart(product)} className="product-btn">Add to Cart</button>
            </div>
          ))}
        </div>
      </div>
      {galleryProduct && (
        <MediaGallery
          media={galleryProduct.media.map(m => ({ url: `http://localhost:5000${m.media_url}`, type: m.media_type }))}
          onClose={() => setGalleryProduct(null)}
        />
      )}
      <style>{`
        .products-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .products-header { text-align: center; margin-bottom: 2rem; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .product-card { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.3s; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .product-image { height: 200px; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; }
        .product-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .video-badge { position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .media-count { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .product-card h3 { font-size: 1rem; margin: 0.5rem 1rem 0.25rem; }
        .product-card p { font-size: 0.75rem; color: #6b7280; margin: 0 1rem 0.5rem; }
        .product-price { margin: 0 1rem 0.5rem; display: flex; gap: 0.5rem; align-items: baseline; }
        .current-price { font-weight: 700; }
        .old-price { font-size: 0.75rem; color: #9ca3af; text-decoration: line-through; }
        .product-btn { width: calc(100% - 2rem); margin: 0 1rem 1rem; padding: 0.6rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default ProductsPage;
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StarIcon, HeartIcon, TruckIcon, ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import { getProduct } from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';

const ProductDetailsPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isFav, setIsFav] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();

  useEffect(() => { fetchProduct(); }, [id]);
  useEffect(() => { if (product && isAuthenticated) setIsFav(isFavorite(product.id, 'product')); }, [product, isAuthenticated, isFavorite]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await getProduct(id);
      setProduct(response.data.product);
    } catch (error) {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) { toast.error('Please login'); return; }
    addToCart(product, quantity, 'product');
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) { toast.error('Please login'); return; }
    if (isFav) {
      const success = await removeFromFavorites(product.id, 'product');
      if (success) setIsFav(false);
    } else {
      const success = await addToFavorites(product, 'product');
      if (success) setIsFav(true);
    }
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading product...</p></div>;
  if (!product) return <div className="container text-center py-16"><p>Product not found</p><Link to="/products" className="btn btn-primary mt-4">Back</Link></div>;

  const primaryMedia = product.media?.find(m => m.is_primary) || product.media?.[0];

  return (
    <div className="product-details">
      <div className="container">
        <div className="product-grid">
          <div className="product-image-section">
            <div className="main-image" onClick={() => product.media?.length && setShowGallery(true)}>
              {primaryMedia ? (
                primaryMedia.media_type === 'video' ? (
                  <video src={`http://localhost:5000${primaryMedia.media_url}`} />
                ) : (
                  <img src={`http://localhost:5000${primaryMedia.media_url}`} alt={product.title} />
                )
              ) : (
                <div className="image-placeholder">📦</div>
              )}
            </div>
            {product.media && product.media.length > 1 && (
              <div className="thumbnail-strip">
                {product.media.slice(0, 5).map((media, idx) => (
                  <div key={idx} className="thumbnail" onClick={() => {
                    const newMedia = [...product.media];
                    const index = newMedia.findIndex(m => m.id === media.id);
                    [newMedia[0], newMedia[index]] = [newMedia[index], newMedia[0]];
                    setProduct({ ...product, media: newMedia });
                  }}>
                    {media.media_type === 'video' ? <div className="video-thumb">🎬</div> : <img src={`http://localhost:5000${media.media_url}`} alt="" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <h1>{product.title}</h1>
            <div className="product-meta">
              <div className="product-rating"><StarIcon className="star-icon" /><span>{product.rating || 0}</span><span className="review-count">({product.reviewsCount || 0} reviews)</span></div>
              <div className="product-seller">
                by <Link to={`/profile/${product.seller_id}`} className="seller-link">{product.seller_name || 'Unknown Seller'}</Link>
              </div>
            </div>
            <div className="product-price"><span className="current-price">{product.price} MAD</span>{product.old_price && <span className="old-price">{product.old_price} MAD</span>}</div>
            <div className="product-stock">{product.stock > 0 ? <span className="in-stock">In Stock ({product.stock} available)</span> : <span className="out-of-stock">Out of Stock</span>}</div>
            <div className="product-quantity"><label>Quantity</label><div className="quantity-selector"><button onClick={() => setQuantity(Math.max(1, quantity-1))}>-</button><span>{quantity}</span><button onClick={() => setQuantity(quantity+1)}>+</button></div></div>
            <div className="product-actions"><button className="add-to-cart-btn" onClick={handleAddToCart} disabled={product.stock===0}>Add to Cart</button><button className="favorite-btn" onClick={handleFavorite}><HeartIcon className={`heart-icon ${isFav ? 'text-red-500 fill-current' : ''}`} /></button></div>
            <div className="product-shipping">
              <div className="shipping-item"><TruckIcon className="shipping-icon" /><span>Free shipping on orders over 500 MAD</span></div>
              <div className="shipping-item"><ShieldCheckIcon className="shipping-icon" /><span>14-day money-back guarantee</span></div>
              <div className="shipping-item"><ArrowPathIcon className="shipping-icon" /><span>7-day return policy</span></div>
            </div>
          </div>
        </div>

        <div className="product-tabs">
          <div className="tabs-header"><button className={`tab-btn ${activeTab==='description'?'active':''}`} onClick={()=>setActiveTab('description')}>Description</button><button className={`tab-btn ${activeTab==='specifications'?'active':''}`} onClick={()=>setActiveTab('specifications')}>Specifications</button></div>
          <div className="tabs-content">{activeTab==='description'?<p>{product.description}</p>:<div className="specs-list"><div className="spec-item"><span className="spec-label">Category</span><span className="spec-value">{product.category}</span></div><div className="spec-item"><span className="spec-label">Stock</span><span className="spec-value">{product.stock} units</span></div><div className="spec-item"><span className="spec-label">Sold</span><span className="spec-value">{product.sold || 0} units</span></div></div>}</div>
        </div>
      </div>
      {showGallery && product.media && (
        <MediaGallery media={product.media.map(m => ({ url: `http://localhost:5000${m.media_url}`, type: m.media_type }))} onClose={() => setShowGallery(false)} />
      )}
      <style>{`
        .product-details { padding: 2rem 0; }
        .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        @media (max-width: 768px) { .product-grid { grid-template-columns: 1fr; } }
        .main-image { background: #f3f4f6; border-radius: 1rem; height: 400px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; }
        .main-image img, .main-image video { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { font-size: 8rem; }
        .thumbnail-strip { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
        .thumbnail { width: 80px; height: 80px; border-radius: 0.5rem; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
        .thumbnail:hover { border-color: #87CEEB; }
        .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        .video-thumb { width: 100%; height: 100%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .product-info h1 { font-size: 1.75rem; margin-bottom: 1rem; }
        .product-meta { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .product-rating { display: flex; align-items: center; gap: 0.25rem; color: #f59e0b; }
        .star-icon { width: 1rem; height: 1rem; fill: #f59e0b; }
        .current-price { font-size: 1.5rem; font-weight: bold; }
        .old-price { font-size: 1rem; color: #9ca3af; text-decoration: line-through; margin-left: 0.5rem; }
        .in-stock { color: #10b981; }
        .quantity-selector { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; }
        .quantity-selector button { width: 2rem; height: 2rem; border: 1px solid #e5e7eb; background: white; border-radius: 0.5rem; cursor: pointer; }
        .product-actions { display: flex; gap: 1rem; margin-bottom: 2rem; margin-top: 1rem; }
        .add-to-cart-btn { flex: 1; padding: 0.75rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; }
        .favorite-btn { padding: 0.75rem; border: 1px solid #e5e7eb; background: white; border-radius: 2rem; cursor: pointer; }
        .heart-icon { width: 1.25rem; height: 1.25rem; }
        .text-red-500 { color: #ef4444; }
        .fill-current { fill: currentColor; }
        .product-shipping { border-top: 1px solid #e5e7eb; padding-top: 1rem; }
        .shipping-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.875rem; color: #6b7280; }
        .shipping-icon { width: 1rem; height: 1rem; }
        .product-tabs { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .tabs-header { display: flex; border-bottom: 1px solid #e5e7eb; }
        .tab-btn { padding: 1rem 2rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
        .tab-btn.active { color: #87CEEB; border-bottom: 2px solid #87CEEB; }
        .tabs-content { padding: 1.5rem; }
        .specs-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .spec-item { display: flex; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb; }
        .spec-label { width: 150px; font-weight: 500; }
        .spec-value { color: #6b7280; }
        .seller-link { color: #87CEEB; text-decoration: none; font-weight: 500; }
        .seller-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
};

export default ProductDetailsPage;
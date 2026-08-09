import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StarIcon, HeartIcon, TruckIcon, ShieldCheckIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import { getProduct } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import { getImageUrl } from '../../utils/imageUtils';

const ProductDetailsPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isFav, setIsFav] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState(null);
  
  // Offer modal state (for Joutiya products)
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  
  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    if (isAuthenticated) {
      checkPurchaseStatus();
      checkReviewStatus();
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (product && isAuthenticated) {
      setIsFav(isFavorite(product.id, 'product'));
    }
  }, [product, isAuthenticated, isFavorite]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await getProduct(id);
      const nextProduct = response.data.product;
      setProduct(nextProduct);
      setActiveMediaId((currentMediaId) => {
        if (nextProduct.media?.some((media) => media.id === currentMediaId)) return currentMediaId;
        return (nextProduct.media?.find((media) => media.is_primary) || nextProduct.media?.[0])?.id || null;
      });
      setQuantity(1);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/products/${id}/reviews`);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkPurchaseStatus = async () => {
    try {
      const response = await api.get(`/orders`);
      const orders = response.data.orders || [];
      const purchased = orders.some(order => 
        order.status === 'delivered' && 
        order.items?.some(item => item.product_id === parseInt(id))
      );
      setHasPurchased(purchased);
    } catch (error) {
      console.error('Error checking purchase status:', error);
    }
  };

  const checkReviewStatus = async () => {
    try {
      const response = await api.get(`/products/${id}/reviews`);
      const existing = response.data.reviews?.some(r => r.user_id === user?.id);
      setHasReviewed(existing);
    } catch (error) {
      console.error('Error checking review status:', error);
    }
  };

  const submitReview = async () => {
    if (!reviewRating) {
      toast.error('Please select a rating');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/products/${id}/review`, {
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success('Review submitted successfully!');
      setReviewRating(0);
      setReviewComment('');
      fetchReviews();
      setHasReviewed(true);
      fetchProduct();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    addToCart(product, quantity, 'product');
  };

  const handleMakeOffer = () => {
    if (!isAuthenticated) {
      toast.error('Please login to make an offer');
      return;
    }
    setOfferAmount('');
    setOfferMessage('');
    setShowOfferModal(true);
  };

  const submitOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }
    if (parseFloat(offerAmount) > product.price) {
      toast.error(`Offer cannot exceed the original price of ${product.price} MAD`);
      return;
    }
    setSubmittingOffer(true);
    try {
      await api.post(`/products/${id}/offers`, {
        amount: parseFloat(offerAmount),
        message: offerMessage
      });
      toast.success(`Offer of ${offerAmount} MAD sent to seller!`);
      setShowOfferModal(false);
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error(error.response?.data?.error || 'Failed to submit offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add to favorites');
      return;
    }
    if (isFav) {
      const success = await removeFromFavorites(product.id, 'product');
      if (success) setIsFav(false);
    } else {
      const success = await addToFavorites(product, 'product');
      if (success) setIsFav(true);
    }
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading product...</p></div>;
  if (!product) return <div className="container text-center py-16"><p>Product not found</p><Link to="/products" className="btn btn-primary">Back</Link></div>;

  const media = product.media || [];
  const primaryMedia = media.find((item) => item.id === activeMediaId) || media.find((item) => item.is_primary) || media[0];
  const averageRating = product.rating || 0;
  const totalReviews = product.reviews_count || 0;
  const isJoutiya = product.condition === 'joutiya';
  const stock = Number(product.stock) || 0;
  const categoryLabel = product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : null;
  const canOpenGallery = media.length > 0 && primaryMedia?.media_type !== 'video';
  const conditionLabel = product.condition === 'used_as_new' ? 'Used as New' : product.condition === 'joutiya' ? 'Joutiya (Haggle)' : 'New';

  return (
    <div className="product-details">
      <div className="container">
        <nav className="product-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/products">Products</Link>
          {categoryLabel && <><span aria-hidden="true">/</span><span>{categoryLabel}</span></>}
        </nav>
        <div className="product-grid">
          <div className="product-image-section">
            <div
              className={`main-image ${canOpenGallery ? 'main-image-interactive' : ''}`}
              role={canOpenGallery ? 'button' : undefined}
              tabIndex={canOpenGallery ? 0 : undefined}
              aria-label={canOpenGallery ? `Open media gallery for ${product.title}` : undefined}
              onClick={() => canOpenGallery && setShowGallery(true)}
              onKeyDown={(event) => {
                if (canOpenGallery && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  setShowGallery(true);
                }
              }}
            >
              {primaryMedia ? (
                primaryMedia.media_type === 'video' ? (
                  <video src={getImageUrl(primaryMedia.media_url)} controls />
                ) : (
                  <MarketplaceImage source={primaryMedia.media_url} alt={product.title} />
                )
              ) : (
                <div className="image-placeholder">📦</div>
              )}
            </div>
            {media.length > 1 && (
              <div className="thumbnail-strip">
                {media.slice(0, 5).map((mediaItem, index) => (
                  <button
                    key={mediaItem.id || index}
                    type="button"
                    className={`thumbnail ${primaryMedia?.id === mediaItem.id ? 'thumbnail-active' : ''}`}
                    aria-label={`Show media ${index + 1} for ${product.title}`}
                    aria-pressed={primaryMedia?.id === mediaItem.id}
                    onClick={() => setActiveMediaId(mediaItem.id)}
                  >
                    {mediaItem.media_type === 'video' ? <div className="video-thumb">Video</div> : <MarketplaceImage source={mediaItem.media_url} alt="" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            {/* Condition Badge */}
            <div className="product-condition-badge">
              {product.condition === 'used_as_new' && <span className="badge used">Used as New</span>}
              {product.condition === 'joutiya' && <span className="badge joutiya">Joutiya (Haggle)</span>}
              {(!product.condition || product.condition === 'new') && <span className="badge new">New</span>}
            </div>
            <h1>{product.title}</h1>
            <div className="product-meta">
              <div className="product-rating">
                <StarIcon className="star-icon" />
                <span>{averageRating}</span>
                <span className="review-count">({totalReviews} reviews)</span>
              </div>
              <div className="product-seller">
                Sold by <Link to={`/profile/${product.seller_id}`} className="seller-link">{product.seller_name || 'Unknown Seller'}</Link>
                {product.seller_verified === 1 && <VerifiedBadge size="small" />}
                {product.seller_verified === 1 && <span className="verified-seller-copy">Verified seller</span>}
              </div>
            </div>
            <div className="product-purchase-panel">
              <div className="product-price"><span className="price-label">Price</span><span className="current-price">{product.price} MAD</span>{product.old_price && <span className="old-price">{product.old_price} MAD</span>}</div>
              <div className="product-stock" aria-live="polite">
                {stock > 0 ? <span className="in-stock">In stock{stock <= 5 ? `, only ${stock} left` : `, ${stock} available`}</span> : <span className="out-of-stock">Out of stock</span>}
              </div>
              {!isJoutiya && (
                <div className="product-quantity">
                  <span className="quantity-label">Quantity</span>
                  <div className="quantity-selector" role="group" aria-label="Select quantity">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">-</button>
                    <output aria-live="polite">{quantity}</output>
                    <button type="button" onClick={() => setQuantity(Math.min(stock, quantity + 1))} disabled={quantity >= stock} aria-label="Increase quantity">+</button>
                  </div>
                </div>
              )}
              <div className="product-actions">
                {isJoutiya ? (
                  <button className="make-offer-btn" onClick={handleMakeOffer} disabled={stock === 0}>Make Offer</button>
                ) : (
                  <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={stock === 0}>Add to Cart</button>
                )}
                <button type="button" className="favorite-btn" onClick={handleFavorite} aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={isFav}><HeartIcon className={`heart-icon ${isFav ? 'text-red-500 fill-current' : ''}`} /></button>
              </div>
              <p className="purchase-note">Delivery costs and payment options are confirmed at checkout.</p>
              <div className="product-shipping">
                <div className="shipping-item"><TruckIcon className="shipping-icon" /><span>Delivery options are shown for your address at checkout</span></div>
                <div className="shipping-item"><ShieldCheckIcon className="shipping-icon" /><span>Review your order details before placing payment</span></div>
                <div className="shipping-item"><ArrowPathIcon className="shipping-icon" /><span>Follow your order status from your account</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="product-tabs">
          <div className="tabs-header" role="tablist" aria-label="Product information">
            <button type="button" id="description-tab" role="tab" aria-selected={activeTab === 'description'} aria-controls="description-panel" className={`tab-btn ${activeTab==='description'?'active':''}`} onClick={()=>setActiveTab('description')}>Description</button>
            <button type="button" id="specifications-tab" role="tab" aria-selected={activeTab === 'specifications'} aria-controls="specifications-panel" className={`tab-btn ${activeTab==='specifications'?'active':''}`} onClick={()=>setActiveTab('specifications')}>Specifications</button>
            <button type="button" id="reviews-tab" role="tab" aria-selected={activeTab === 'reviews'} aria-controls="reviews-panel" className={`tab-btn ${activeTab==='reviews'?'active':''}`} onClick={()=>setActiveTab('reviews')}>Reviews ({totalReviews})</button>
          </div>
          <div className="tabs-content" role="tabpanel" tabIndex={0} id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`}>
            {activeTab==='description' && <p>{product.description || 'The seller has not added a description yet.'}</p>}
            {activeTab==='specifications' && (
              <div className="specs-list">
                <div className="spec-item"><span className="spec-label">Category</span><span className="spec-value">{categoryLabel || 'Not specified'}</span></div>
                <div className="spec-item"><span className="spec-label">Condition</span><span className="spec-value">
                  {conditionLabel}
                </span></div>
                <div className="spec-item"><span className="spec-label">Availability</span><span className="spec-value">{stock > 0 ? `${stock} units available` : 'Out of stock'}</span></div>
                <div className="spec-item"><span className="spec-label">Sold</span><span className="spec-value">{product.sold || 0} units</span></div>
              </div>
            )}
            {activeTab==='reviews' && (
              <div className="reviews-section">
                {isAuthenticated && hasPurchased && !hasReviewed && (
                  <div className="write-review">
                    <h3>Write a Review</h3>
                    <div className="rating-input">
                      <label>Your Rating:</label>
                      <div className="stars">
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className={`star-btn ${star <= reviewRating ? 'active' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="review-comment">
                      <label>Your Review:</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience with this product..."
                        rows="4"
                      />
                    </div>
                    <button onClick={submitReview} disabled={submittingReview} className="submit-review-btn">
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                )}
                
                {isAuthenticated && hasPurchased && hasReviewed && (
                  <div className="already-reviewed">
                    <p>✅ You have already reviewed this product. Thank you for your feedback!</p>
                  </div>
                )}
                
                {isAuthenticated && !hasPurchased && (
                  <div className="review-notice">
                    <p>📝 You can only review this product after purchasing and receiving it.</p>
                  </div>
                )}
                
                {!isAuthenticated && (
                  <div className="review-notice">
                    <p>Sign in after delivery to leave a review.</p>
                  </div>
                )}

                <div className="reviews-list">
                  <h3>Customer Reviews</h3>
                  {reviews.length === 0 ? (
                    <p className="no-reviews">No reviews yet. Be the first to review!</p>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id} className="review-item">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <strong>{review.user_name}</strong>
                            <div className="review-stars">
                              {"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}
                            </div>
                          </div>
                          <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        {review.comment && <p className="review-comment-text">{review.comment}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Make Offer Modal for Joutiya Products */}
      {showOfferModal && (
        <div className="offer-modal" onClick={() => setShowOfferModal(false)}>
          <div className="offer-container" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="offer-header">
              <h3 id="offer-modal-title">Make an Offer</h3>
              <button type="button" onClick={() => setShowOfferModal(false)} className="close-offer-btn" aria-label="Close offer form"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="offer-body">
              <p>Product: <strong>{product.title}</strong></p>
              <p>Original price: <strong>{product.price} MAD</strong></p>
              <div className="offer-field">
                <label htmlFor="offer-amount">Your offer (MAD):</label>
                <input
                  id="offer-amount"
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="e.g., 50"
                  min="1"
                  step="0.01"
                  max={product.price}
                />
              </div>
              <div className="offer-field">
                <label htmlFor="offer-message">Message to seller (optional):</label>
                <textarea
                  id="offer-message"
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="e.g., I love this product, can you do a better price?"
                  rows="3"
                />
              </div>
            </div>
            <div className="offer-footer">
              <button type="button" onClick={() => setShowOfferModal(false)} className="cancel-offer-btn">Cancel</button>
              <button type="button" onClick={submitOffer} disabled={submittingOffer} className="submit-offer-btn">
                {submittingOffer ? 'Sending...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGallery && (
        <MediaGallery
          media={product.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}
          onClose={() => setShowGallery(false)}
        />
      )}

      <style>{`
        /* (keep all existing styles unchanged) */
        .product-details { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .product-breadcrumb { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; color: #6b7280; font-size: 0.875rem; }
        .product-breadcrumb a { color: #4b5563; text-decoration: none; }
        .product-breadcrumb a:hover { color: #1a1a1a; text-decoration: underline; }
        .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        @media (max-width: 768px) { .product-grid { grid-template-columns: 1fr; gap: 1.5rem; } }
        .product-info { align-self: start; position: sticky; top: 6.5rem; }
        .main-image { background: #f3f4f6; border-radius: 1rem; height: 400px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .main-image-interactive { cursor: pointer; }
        .main-image-interactive:focus-visible, .thumbnail:focus-visible, .quantity-selector button:focus-visible, .add-to-cart-btn:focus-visible, .make-offer-btn:focus-visible, .favorite-btn:focus-visible, .tab-btn:focus-visible, .offer-container button:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.6); outline-offset: 3px; }
        .main-image img, .main-image video { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { font-size: 8rem; }
        .thumbnail-strip { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
        .thumbnail { width: 80px; height: 80px; padding: 0; border-radius: 0.5rem; overflow: hidden; cursor: pointer; border: 2px solid transparent; background: #f3f4f6; }
        .thumbnail:hover { border-color: #87CEEB; }
        .thumbnail-active { border-color: #87CEEB; box-shadow: 0 0 0 2px rgba(135, 206, 235, 0.25); }
        .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        .video-thumb { width: 100%; height: 100%; background: #1a1a1a; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
        .product-info h1 { font-size: 1.75rem; margin-bottom: 1rem; }
        .product-condition-badge { margin-bottom: 0.5rem; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.7rem; font-weight: 500; }
        .badge.new { background: #87CEEB; color: #1a1a1a; }
        .badge.used { background: #4b5563; color: white; }
        .badge.joutiya { background: #1a1a1a; color: white; }
        .product-meta { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
        .product-rating { display: flex; align-items: center; gap: 0.25rem; color: #f59e0b; }
        .star-icon { width: 1rem; height: 1rem; fill: #f59e0b; }
        .product-seller { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 0.35rem; color: #4b5563; }
        .seller-link { color: #216275; text-decoration: none; font-weight: 700; }
        .seller-link:hover { text-decoration: underline; }
        .verified-seller-copy { color: #216275; font-size: 0.75rem; font-weight: 700; }
        .product-purchase-panel { padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 1rem; background: #fbfdfe; }
        .product-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; }
        .price-label { width: 100%; color: #6b7280; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .current-price { font-size: 1.75rem; font-weight: 800; color: #111827; }
        .old-price { font-size: 1rem; color: #9ca3af; text-decoration: line-through; margin-left: 0.5rem; }
        .product-stock { margin-top: 0.35rem; font-size: 0.875rem; }
        .in-stock { color: #087a5c; font-weight: 700; }
        .out-of-stock { color: #b42318; font-weight: 700; }
        .product-quantity { margin-top: 1.25rem; }
        .quantity-label { display: block; color: #374151; font-size: 0.875rem; font-weight: 700; }
        .quantity-selector { display: inline-flex; align-items: center; gap: 1rem; margin-top: 0.5rem; padding: 0.25rem; border: 1px solid #e5e7eb; border-radius: 0.65rem; background: white; }
        .quantity-selector button { width: 2.25rem; height: 2.25rem; border: 1px solid #e5e7eb; background: white; border-radius: 0.4rem; cursor: pointer; font-weight: 800; }
        .quantity-selector button:hover:not(:disabled) { background: #e8f7fc; border-color: #87CEEB; }
        .quantity-selector button:disabled { cursor: not-allowed; opacity: 0.45; }
        .quantity-selector output { min-width: 1.5rem; text-align: center; font-weight: 700; }
        .product-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; align-items: center; }
        .add-to-cart-btn, .make-offer-btn { flex: 1; min-height: 48px; padding: 0.75rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; font-weight: 700; }
        .add-to-cart-btn:hover:not(:disabled), .make-offer-btn:hover:not(:disabled) { background: #333; }
        .add-to-cart-btn:disabled, .make-offer-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .favorite-btn { display: grid; min-width: 48px; min-height: 48px; place-items: center; padding: 0.75rem; border: 1px solid #e5e7eb; background: white; border-radius: 50%; cursor: pointer; }
        .favorite-btn:hover { border-color: #87CEEB; background: #e8f7fc; }
        .heart-icon { width: 1.25rem; height: 1.25rem; }
        .text-red-500 { color: #ef4444; }
        .fill-current { fill: currentColor; }
        .purchase-note { margin: 0.8rem 0 0; color: #4b5563; font-size: 0.8rem; line-height: 1.5; }
        .product-shipping { display: grid; gap: 0.65rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem; }
        .shipping-item { display: flex; align-items: flex-start; gap: 0.55rem; font-size: 0.8rem; color: #4b5563; line-height: 1.4; }
        .shipping-icon { flex: 0 0 auto; width: 1rem; height: 1rem; margin-top: 0.05rem; color: #216275; }
        .product-tabs { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 2rem; }
        .tabs-header { display: flex; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
        .tab-btn { min-height: 48px; padding: 1rem 2rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 700; transition: all 0.2s; color: #4b5563; }
        .tab-btn.active { color: #216275; border-bottom: 2px solid #87CEEB; }
        .tabs-content { padding: 1.5rem; }
        .specs-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .spec-item { display: flex; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb; }
        .spec-label { width: 150px; font-weight: 500; }
        .spec-value { color: #6b7280; }
        .reviews-section { max-width: 100%; }
        .write-review { background: #f9fafb; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; }
        .write-review h3 { margin-bottom: 1rem; font-size: 1rem; }
        .rating-input { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .stars { display: flex; gap: 0.25rem; }
        .star-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #d1d5db; transition: color 0.2s; }
        .star-btn.active { color: #f59e0b; }
        .review-comment { margin-bottom: 1rem; }
        .review-comment label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
        .review-comment textarea { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; resize: vertical; }
        .submit-review-btn { background: #1a1a1a; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; }
        .submit-review-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .already-reviewed, .review-notice { background: #e0f2fe; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem; }
        .reviews-list h3 { margin-bottom: 1rem; font-size: 1rem; }
        .review-item { border-bottom: 1px solid #e5e7eb; padding: 1rem 0; }
        .review-item:last-child { border-bottom: none; }
        .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; }
        .reviewer-info { display: flex; align-items: center; gap: 1rem; }
        .review-stars { color: #f59e0b; font-size: 0.875rem; }
        .review-date { font-size: 0.7rem; color: #9ca3af; }
        .review-comment-text { color: #4b5563; font-size: 0.875rem; line-height: 1.5; }
        .no-reviews { color: #6b7280; text-align: center; padding: 2rem; }
        .offer-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1002; }
        .offer-container { background: white; border-radius: 1rem; width: 90%; max-width: 450px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
        .offer-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb; background: #1a1a1a; color: white; }
        .offer-header h3 { margin: 0; font-size: 1rem; }
        .close-offer-btn { background: none; border: none; color: white; cursor: pointer; }
        .offer-body { padding: 1rem; }
        .offer-field { margin-bottom: 1rem; }
        .offer-field label { display: block; margin-bottom: 0.25rem; font-weight: 500; font-size: 0.875rem; }
        .offer-field input, .offer-field textarea { width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .offer-footer { padding: 1rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem; justify-content: flex-end; }
        .cancel-offer-btn { background: #9ca3af; color: white; border: none; padding: 0.5rem 1rem; border-radius: 2rem; cursor: pointer; }
        .submit-offer-btn { background: #1a1a1a; color: white; border: none; padding: 0.5rem 1rem; border-radius: 2rem; cursor: pointer; }
        .submit-offer-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 640px) {
          .product-details { padding: 1rem 0; }
          .product-breadcrumb { margin-bottom: 1rem; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; }
          .product-info { position: static; }
          .main-image { height: min(78vw, 320px); border-radius: 0.75rem; }
          .thumbnail-strip { flex-wrap: nowrap; overflow-x: auto; padding-bottom: .25rem; }
          .thumbnail { flex: 0 0 64px; width: 64px; height: 64px; }
          .product-info h1 { font-size: 1.5rem; }
          .product-purchase-panel { padding: 1rem; }
          .current-price { font-size: 1.5rem; }
          .product-actions { flex-wrap: nowrap; gap: .6rem; }
          .add-to-cart-btn, .make-offer-btn { flex: 1 1 auto; min-height: 48px; }
          .favorite-btn { min-width: 48px; min-height: 48px; }
          .tabs-header { flex-wrap: nowrap; overflow-x: auto; }
          .tab-btn { flex: 0 0 auto; padding: .875rem 1rem; }
          .tabs-content { padding: 1rem; }
          .spec-item { flex-direction: column; gap: .25rem; }
          .spec-label { width: auto; }
          .offer-container { width: calc(100% - 2rem); max-height: calc(100dvh - 2rem); }
        }
      `}</style>
    </div>
  );
};

export default ProductDetailsPage;

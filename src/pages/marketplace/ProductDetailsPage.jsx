import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StarIcon, HeartIcon, TruckIcon, ShieldCheckIcon, ArrowPathIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import { getProduct } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import { getImageUrl } from '../../utils/imageUtils';

const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isFav, setIsFav] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
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
      setProduct(response.data.product);
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

  const askAI = async () => {
    if (!aiQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }
    setAiLoading(true);
    try {
      const response = await api.post('/ai/ask', {
        productTitle: product.title,
        productDescription: product.description,
        question: aiQuestion
      });
      if (response.data.success) {
        setAiAnswer(response.data.answer);
      } else {
        setAiAnswer('Sorry, I could not answer that. Please try asking about shipping, returns, materials, or contact the seller.');
      }
    } catch (error) {
      console.error('AI error:', error);
      setAiAnswer('Something went wrong. Please try again or click "Message Seller" to ask directly.');
    } finally {
      setAiLoading(false);
    }
  };

  const closeAIChat = () => {
    setShowAIChat(false);
    setAiQuestion('');
    setAiAnswer('');
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading product...</p></div>;
  if (!product) return <div className="container text-center py-16"><p>Product not found</p><Link to="/products" className="btn btn-primary">Back</Link></div>;

  const primaryMedia = product.media?.find(m => m.is_primary) || product.media?.[0];
  const averageRating = product.rating || 0;
  const totalReviews = product.reviews_count || 0;
  const isJoutiya = product.condition === 'joutiya';

  return (
    <div className="product-details">
      <div className="container">
        <div className="product-grid">
          <div className="product-image-section">
            <div className="main-image" onClick={() => product.media?.length && setShowGallery(true)}>
              {primaryMedia ? (
                primaryMedia.media_type === 'video' ? (
                  <video src={getImageUrl(primaryMedia.media_url)} controls />
                ) : (
                  <img src={getImageUrl(primaryMedia.media_url)} alt={product.title} />
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
                    {media.media_type === 'video' ? <div className="video-thumb">🎬</div> : <img src={getImageUrl(media.media_url)} alt="" />}
                  </div>
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
                by <Link to={`/profile/${product.seller_id}`} className="seller-link">{product.seller_name || 'Unknown Seller'}</Link>
                {product.seller_verified === 1 && <VerifiedBadge size="small" />}
              </div>
            </div>
            <div className="product-price"><span className="current-price">{product.price} MAD</span>{product.old_price && <span className="old-price">{product.old_price} MAD</span>}</div>
            <div className="product-stock">{product.stock > 0 ? <span className="in-stock">In Stock ({product.stock} available)</span> : <span className="out-of-stock">Out of Stock</span>}</div>
            {!isJoutiya && (
              <div className="product-quantity"><label>Quantity</label><div className="quantity-selector"><button onClick={() => setQuantity(Math.max(1, quantity-1))}>-</button><span>{quantity}</span><button onClick={() => setQuantity(quantity+1)}>+</button></div></div>
            )}
            <div className="product-actions">
              {isJoutiya ? (
                <button className="make-offer-btn" onClick={handleMakeOffer} disabled={product.stock===0}>Make Offer</button>
              ) : (
                <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={product.stock===0}>Add to Cart</button>
              )}
              <button className="favorite-btn" onClick={handleFavorite}><HeartIcon className={`heart-icon ${isFav ? 'text-red-500 fill-current' : ''}`} /></button>
              <button className="ai-chat-btn" onClick={() => setShowAIChat(true)} title="Ask AI about this product">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="product-shipping">
              <div className="shipping-item"><TruckIcon className="shipping-icon" /><span>Free shipping on orders over 500 MAD</span></div>
              <div className="shipping-item"><ShieldCheckIcon className="shipping-icon" /><span>14-day money-back guarantee</span></div>
              <div className="shipping-item"><ArrowPathIcon className="shipping-icon" /><span>7-day return policy</span></div>
            </div>
          </div>
        </div>

        <div className="product-tabs">
          <div className="tabs-header">
            <button className={`tab-btn ${activeTab==='description'?'active':''}`} onClick={()=>setActiveTab('description')}>Description</button>
            <button className={`tab-btn ${activeTab==='specifications'?'active':''}`} onClick={()=>setActiveTab('specifications')}>Specifications</button>
            <button className={`tab-btn ${activeTab==='reviews'?'active':''}`} onClick={()=>setActiveTab('reviews')}>Reviews ({totalReviews})</button>
          </div>
          <div className="tabs-content">
            {activeTab==='description' && <p>{product.description}</p>}
            {activeTab==='specifications' && (
              <div className="specs-list">
                <div className="spec-item"><span className="spec-label">Category</span><span className="spec-value">{product.category}</span></div>
                <div className="spec-item"><span className="spec-label">Condition</span><span className="spec-value">
                  {product.condition === 'used_as_new' ? 'Used as New' : product.condition === 'joutiya' ? 'Joutiya (Haggle)' : (product.condition || 'New')}
                </span></div>
                <div className="spec-item"><span className="spec-label">Stock</span><span className="spec-value">{product.stock} units</span></div>
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

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="ai-chat-modal" onClick={closeAIChat}>
          <div className="ai-chat-container" onClick={(e) => e.stopPropagation()}>
            <div className="ai-chat-header">
              <h3>🤖 rifKANDI AI Assistant</h3>
              <button onClick={closeAIChat} className="close-chat-btn"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="ai-chat-body">
              <p className="ai-welcome">Ask me anything about <strong>{product.title}</strong></p>
              <p className="ai-examples">💡 Try asking: "Is this authentic?" "Shipping time?" "Return policy?" "What material?"</p>
              {aiAnswer && (
                <div className="ai-answer">
                  <div className="ai-avatar">🤖</div>
                  <div className="ai-message">{aiAnswer}</div>
                </div>
              )}
            </div>
            <div className="ai-chat-footer">
              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="e.g., Is this product authentic? What's the material? How long is delivery?"
                rows="2"
                className="ai-question-input"
              />
              <button onClick={askAI} disabled={aiLoading} className="ai-send-btn">
                {aiLoading ? 'Thinking...' : 'Ask AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Make Offer Modal for Joutiya Products */}
      {showOfferModal && (
        <div className="offer-modal" onClick={() => setShowOfferModal(false)}>
          <div className="offer-container" onClick={(e) => e.stopPropagation()}>
            <div className="offer-header">
              <h3>Make an Offer</h3>
              <button onClick={() => setShowOfferModal(false)} className="close-offer-btn"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="offer-body">
              <p>Product: <strong>{product.title}</strong></p>
              <p>Original price: <strong>{product.price} MAD</strong></p>
              <div className="offer-field">
                <label>Your offer (MAD):</label>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="e.g., 50"
                  min="1"
                  max={product.price}
                />
              </div>
              <div className="offer-field">
                <label>Message to seller (optional):</label>
                <textarea
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="e.g., I love this product, can you do a better price?"
                  rows="3"
                />
              </div>
            </div>
            <div className="offer-footer">
              <button onClick={() => setShowOfferModal(false)} className="cancel-offer-btn">Cancel</button>
              <button onClick={submitOffer} disabled={submittingOffer} className="submit-offer-btn">
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
        .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        @media (max-width: 768px) { .product-grid { grid-template-columns: 1fr; gap: 1.5rem; } }
        .main-image { background: #f3f4f6; border-radius: 1rem; height: 400px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; }
        .main-image img, .main-image video { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { font-size: 8rem; }
        .thumbnail-strip { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
        .thumbnail { width: 80px; height: 80px; border-radius: 0.5rem; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
        .thumbnail:hover { border-color: #87CEEB; }
        .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        .video-thumb { width: 100%; height: 100%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .product-info h1 { font-size: 1.75rem; margin-bottom: 1rem; }
        .product-condition-badge { margin-bottom: 0.5rem; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.7rem; font-weight: 500; }
        .badge.new { background: #10b981; color: white; }
        .badge.used { background: #f59e0b; color: white; }
        .badge.joutiya { background: #8b5cf6; color: white; }
        .product-meta { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
        .product-rating { display: flex; align-items: center; gap: 0.25rem; color: #f59e0b; }
        .star-icon { width: 1rem; height: 1rem; fill: #f59e0b; }
        .seller-link { color: #87CEEB; text-decoration: none; font-weight: 500; }
        .current-price { font-size: 1.5rem; font-weight: bold; }
        .old-price { font-size: 1rem; color: #9ca3af; text-decoration: line-through; margin-left: 0.5rem; }
        .in-stock { color: #10b981; }
        .quantity-selector { display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem; }
        .quantity-selector button { width: 2rem; height: 2rem; border: 1px solid #e5e7eb; background: white; border-radius: 0.5rem; cursor: pointer; }
        .product-actions { display: flex; gap: 1rem; margin-bottom: 2rem; margin-top: 1rem; align-items: center; }
        .add-to-cart-btn, .make-offer-btn { flex: 1; padding: 0.75rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; }
        .make-offer-btn { background: #8b5cf6; }
        .favorite-btn { padding: 0.75rem; border: 1px solid #e5e7eb; background: white; border-radius: 2rem; cursor: pointer; }
        .ai-chat-btn { padding: 0.75rem; border: 1px solid #e5e7eb; background: white; border-radius: 2rem; cursor: pointer; color: #87CEEB; transition: all 0.2s; }
        .ai-chat-btn:hover { background: #87CEEB; color: white; border-color: #87CEEB; }
        .heart-icon { width: 1.25rem; height: 1.25rem; }
        .text-red-500 { color: #ef4444; }
        .fill-current { fill: currentColor; }
        .product-shipping { border-top: 1px solid #e5e7eb; padding-top: 1rem; }
        .shipping-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.875rem; color: #6b7280; }
        .shipping-icon { width: 1rem; height: 1rem; }
        .product-tabs { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 2rem; }
        .tabs-header { display: flex; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
        .tab-btn { padding: 1rem 2rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .tab-btn.active { color: #87CEEB; border-bottom: 2px solid #87CEEB; }
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
        .ai-chat-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1001; }
        .ai-chat-container { background: white; border-radius: 1rem; width: 90%; max-width: 450px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
        .offer-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1002; }
        .offer-container { background: white; border-radius: 1rem; width: 90%; max-width: 450px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
        .offer-header, .ai-chat-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb; background: #1a1a1a; color: white; }
        .offer-header h3, .ai-chat-header h3 { margin: 0; font-size: 1rem; }
        .close-offer-btn, .close-chat-btn { background: none; border: none; color: white; cursor: pointer; }
        .offer-body { padding: 1rem; }
        .offer-field { margin-bottom: 1rem; }
        .offer-field label { display: block; margin-bottom: 0.25rem; font-weight: 500; font-size: 0.875rem; }
        .offer-field input, .offer-field textarea { width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .offer-footer { padding: 1rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem; justify-content: flex-end; }
        .cancel-offer-btn { background: #9ca3af; color: white; border: none; padding: 0.5rem 1rem; border-radius: 2rem; cursor: pointer; }
        .submit-offer-btn { background: #8b5cf6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 2rem; cursor: pointer; }
        .submit-offer-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ai-chat-body { flex: 1; padding: 1rem; overflow-y: auto; min-height: 150px; }
        .ai-welcome { color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem; }
        .ai-examples { font-size: 0.7rem; color: #9ca3af; margin-bottom: 1rem; }
        .ai-answer { display: flex; gap: 0.75rem; margin-top: 1rem; }
        .ai-avatar { width: 32px; height: 32px; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
        .ai-message { background: #f3f4f6; padding: 0.75rem; border-radius: 1rem; font-size: 0.875rem; line-height: 1.4; flex: 1; white-space: pre-line; }
        .ai-chat-footer { padding: 1rem; border-top: 1px solid #e5e7eb; }
        .ai-question-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; font-size: 0.875rem; resize: none; margin-bottom: 0.5rem; }
        .ai-send-btn { width: 100%; padding: 0.5rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; font-weight: 500; }
        .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 640px) {
          .product-details { padding: 1rem 0; }
          .main-image { height: min(78vw, 320px); border-radius: 0.75rem; }
          .thumbnail-strip { flex-wrap: nowrap; overflow-x: auto; padding-bottom: .25rem; }
          .thumbnail { flex: 0 0 64px; width: 64px; height: 64px; }
          .product-info h1 { font-size: 1.5rem; }
          .product-actions { flex-wrap: wrap; gap: .75rem; }
          .add-to-cart-btn, .make-offer-btn { flex: 1 1 calc(50% - .375rem); min-height: 44px; }
          .favorite-btn, .ai-chat-btn { min-width: 44px; min-height: 44px; }
          .tabs-header { flex-wrap: nowrap; overflow-x: auto; }
          .tab-btn { flex: 0 0 auto; padding: .875rem 1rem; }
          .tabs-content { padding: 1rem; }
          .spec-item { flex-direction: column; gap: .25rem; }
          .spec-label { width: auto; }
          .offer-container, .ai-chat-container { width: calc(100% - 2rem); max-height: calc(100dvh - 2rem); }
        }
      `}</style>
    </div>
  );
};

export default ProductDetailsPage;

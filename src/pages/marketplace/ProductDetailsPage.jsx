import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StarIcon, HeartIcon, TruckIcon, ShieldCheckIcon, ArrowPathIcon, XMarkIcon, FlagIcon } from '@heroicons/react/24/outline';
import useCart from '../../hooks/useCart';
import useFavorites from '../../hooks/useFavorites';
import useAuth from '../../hooks/useAuth';
import { getProduct } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import { getImageUrl } from '../../utils/imageUtils';

const ProductDetailsPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [showGallery, setShowGallery] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState(null);
  
  // Offer modal state (for Joutiya products)
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('misleading');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  
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

  const fetchProduct = useCallback(async () => {
    const response = await getProduct(id);
    return response.data.product;
  }, [id]);

  const fetchReviews = useCallback(async () => {
    const response = await api.get(`/products/${id}/reviews`);
    return response.data.reviews || [];
  }, [id]);

  const checkPurchaseStatus = useCallback(async () => {
    const response = await api.get(`/orders`);
    const orders = response.data.orders || [];
    return orders.some(order =>
      order.status === 'delivered' &&
      order.items?.some(item => item.product_id === parseInt(id, 10))
    );
  }, [id]);

  useEffect(() => {
    let isCurrent = true;

    const loadProductDetails = async () => {
      const [productResult, reviewsResult, purchaseResult] = await Promise.allSettled([
        fetchProduct(),
        fetchReviews(),
        isAuthenticated ? checkPurchaseStatus() : Promise.resolve(false)
      ]);

      if (!isCurrent) return;

      if (productResult.status === 'fulfilled') {
        const nextProduct = productResult.value;
        setProduct(nextProduct);
        setActiveMediaId((currentMediaId) => {
          if (nextProduct.media?.some((media) => media.id === currentMediaId)) return currentMediaId;
          return (nextProduct.media?.find((media) => media.is_primary) || nextProduct.media?.[0])?.id || null;
        });
        setQuantity(1);
      } else {
        console.error('Error fetching product:', productResult.reason);
        toast.error(t('productDetails.notFound'));
      }

      if (reviewsResult.status === 'fulfilled') {
        const nextReviews = reviewsResult.value;
        setReviews(nextReviews);
        setHasReviewed(isAuthenticated && nextReviews.some((review) => review.user_id === user?.id));
      } else {
        console.error('Error fetching reviews:', reviewsResult.reason);
      }

      if (purchaseResult.status === 'fulfilled') {
        setHasPurchased(purchaseResult.value);
      } else {
        console.error('Error checking purchase status:', purchaseResult.reason);
        setHasPurchased(false);
      }

      setLoading(false);
    };

    void loadProductDetails();

    return () => {
      isCurrent = false;
    };
  }, [checkPurchaseStatus, fetchProduct, fetchReviews, isAuthenticated, t, user?.id]);

  const submitReview = async () => {
    if (!reviewRating) {
      toast.error(t('productDetails.reviewRating'));
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/products/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success(t('productDetails.reviewSent'));
      setReviewRating(0);
      setReviewComment('');
      const nextReviews = await fetchReviews();
      setReviews(nextReviews);
      setHasReviewed(true);
      const nextProduct = await fetchProduct();
      setProduct(nextProduct);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.error || t('productDetails.reviewFailed'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error(t('productDetails.signInCart'));
      return;
    }
    if (Number(product.seller_id) === Number(user?.id)) {
      toast.error(t('products.ownListing'));
      return;
    }
    if (Number(product.stock) < 1) {
      toast.error(t('products.outOfStock'));
      return;
    }
    addToCart(product, quantity, 'product');
  };

  const handleMakeOffer = () => {
    if (!isAuthenticated) {
      toast.error(t('productDetails.signInOffer'));
      return;
    }
    if (Number(product.seller_id) === Number(user?.id)) {
      toast.error(t('products.ownListing'));
      return;
    }
    setOfferAmount('');
    setOfferMessage('');
    setShowOfferModal(true);
  };

  const submitOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error(t('productDetails.offerAmount'));
      return;
    }
    if (parseFloat(offerAmount) > product.price) {
      toast.error(t('productDetails.offerTooHigh', { price: product.price }));
      return;
    }
    setSubmittingOffer(true);
    try {
      await api.post(`/products/${id}/offers`, {
        amount: parseFloat(offerAmount),
        message: offerMessage
      });
      toast.success(t('productDetails.offerSent', { amount: offerAmount }));
      setShowOfferModal(false);
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error(error.response?.data?.error || t('productDetails.offerFailed'));
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error(t('productDetails.signInFavorite'));
      return;
    }
    if (isFavorite(product.id, 'product')) {
      await removeFromFavorites(product.id, 'product');
    } else {
      await addToFavorites(product, 'product');
    }
  };

  const submitReport = async () => {
    if (!isAuthenticated) return toast.error(t('productDetails.reportSignIn'));
    if (reportDetails.trim().length < 10) return toast.error(t('productDetails.reportDetails'));
    setSubmittingReport(true);
    try {
      await api.post(`/products/${id}/reports`, { reason: reportReason, details: reportDetails.trim() });
      toast.success(t('productDetails.reportThanks'));
      setShowReportModal(false);
      setReportDetails('');
    } catch (error) {
      toast.error(error.response?.data?.error || t('productDetails.reportFailed'));
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>{t('productDetails.loading')}</p></div>;
  if (!product) return <div className="container text-center py-16"><p>{t('productDetails.notFound')}</p><Link to="/products" className="btn btn-primary">{t('productDetails.back')}</Link></div>;

  const media = product.media || [];
  const primaryMedia = media.find((item) => item.id === activeMediaId) || media.find((item) => item.is_primary) || media[0];
  const averageRating = product.rating || 0;
  const totalReviews = product.reviews_count || 0;
  const isJoutiya = product.condition === 'joutiya';
  const stock = Number(product.stock) || 0;
  const productPrice = Number(product.price || 0);
  const categoryLabel = product.category ? t(`productForm.categoryOptions.${product.category}`, { defaultValue: product.category }) : null;
  const canOpenGallery = media.length > 0 && primaryMedia?.media_type !== 'video';
  const conditionLabel = t(`productForm.conditionOptions.${product.condition || 'new'}`);
  const isFav = isAuthenticated && isFavorite(product.id, 'product');
  const isOwnListing = Number(product.seller_id) === Number(user?.id);
  const isUnavailable = stock < 1 || isOwnListing;
  const formatAmount = (amount) => new Intl.NumberFormat(
    i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA',
    { maximumFractionDigits: 2 }
  ).format(Number(amount || 0));

  return (
    <div className="product-details">
      <div className="container">
        <nav className="product-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">{t('productDetails.home')}</Link>
          <span aria-hidden="true">/</span>
          <Link to="/products">{t('productDetails.products')}</Link>
          {categoryLabel && <><span aria-hidden="true">/</span><span>{categoryLabel}</span></>}
        </nav>
        <div className="product-grid">
          <div className="product-image-section">
            <div
              className={`main-image ${canOpenGallery ? 'main-image-interactive' : ''}`}
              role={canOpenGallery ? 'button' : undefined}
              tabIndex={canOpenGallery ? 0 : undefined}
              aria-label={canOpenGallery ? t('productDetails.openGallery', { title: product.title }) : undefined}
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
                    aria-label={t('productDetails.showMedia', { count: index + 1, title: product.title })}
                    aria-pressed={primaryMedia?.id === mediaItem.id}
                    onClick={() => setActiveMediaId(mediaItem.id)}
                  >
                    {mediaItem.media_type === 'video' ? <div className="video-thumb">{t('productDetails.video')}</div> : <MarketplaceImage source={mediaItem.media_url} alt="" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            {/* Condition Badge */}
            <div className="product-condition-badge">
              {product.condition === 'used_as_new' && <span className="badge used">{t('productForm.conditionOptions.used_as_new')}</span>}
              {product.condition === 'joutiya' && <span className="badge joutiya">{t('productForm.conditionOptions.joutiya')}</span>}
              {(!product.condition || product.condition === 'new') && <span className="badge new">{t('productForm.conditionOptions.new')}</span>}
            </div>
            <h1>{product.title}</h1>
            <div className="product-meta">
              <div className="product-rating">
                <StarIcon className="star-icon" />
                <span>{averageRating}</span>
                <span className="review-count">({t('productDetails.reviews', { count: totalReviews })})</span>
              </div>
              <div className="product-seller">
                {t('productDetails.soldBy')} <Link to={`/profile/${product.seller_id}`} className="seller-link">{product.seller_name || t('products.unknownSeller')}</Link>
              </div>
            </div>
            <div className="product-purchase-panel">
              <div className="product-price"><span className="price-label">{t('products.price')}</span><span className="current-price">{formatAmount(productPrice)} MAD</span>{product.old_price && <span className="old-price">{formatAmount(product.old_price)} MAD</span>}</div>
              <div className="cod-price-breakdown" aria-label={t('products.codBreakdown')}>
                <span><span>{t('products.itemPrice')}</span><strong>{formatAmount(productPrice)} MAD</strong></span>
                <span><span>{t('products.delivery')}</span><strong>{t('products.deliveryQuotedAfterOrder')}</strong></span>
                {!isJoutiya && <span className="cod-total"><span>{t('products.codTotal')}</span><strong>{t('products.itemPlusDelivery', { item: `${formatAmount(productPrice)} MAD` })}</strong></span>}
              </div>
              <div className="product-stock" aria-live="polite">
                {stock > 0 ? <span className="in-stock">{stock <= 5 ? t('products.stockLow', { count: stock }) : t('products.stockAvailable', { count: stock })}</span> : <span className="out-of-stock">{t('products.outOfStock')}</span>}
              </div>
              {!isJoutiya && (
                <div className="product-quantity">
                  <span className="quantity-label">{t('productDetails.quantity')}</span>
                  <div className="quantity-selector" role="group" aria-label={t('productDetails.selectQuantity')}>
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label={t('productDetails.decrease')}>-</button>
                    <output aria-live="polite">{quantity}</output>
                    <button type="button" onClick={() => setQuantity(Math.min(stock, quantity + 1))} disabled={quantity >= stock} aria-label={t('productDetails.increase')}>+</button>
                  </div>
                </div>
              )}
              <div className="product-actions">
                {isJoutiya ? (
                  <button className="make-offer-btn" onClick={handleMakeOffer} disabled={isUnavailable}>{stock < 1 ? t('products.outOfStock') : isOwnListing ? t('products.yourListing') : t('products.makeOffer')}</button>
                ) : (
                  <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={isUnavailable}>{stock < 1 ? t('products.outOfStock') : isOwnListing ? t('products.yourListing') : t('products.addToCart')}</button>
                )}
                <button type="button" className="favorite-btn" onClick={handleFavorite} aria-label={isFav ? t('productDetails.favoriteRemove') : t('productDetails.favoriteAdd')} aria-pressed={isFav}><HeartIcon className={`heart-icon ${isFav ? 'text-red-500 fill-current' : ''}`} /></button>
              </div>
              <p className="purchase-note">{isJoutiya ? t('products.offerDeliveryNote') : t('products.itemPayNote', { item: `${formatAmount(productPrice)} MAD` })}</p>
              {!isOwnListing && <button type="button" className="report-listing-btn" onClick={() => isAuthenticated ? setShowReportModal(true) : toast.error(t('productDetails.reportSignIn'))}><FlagIcon aria-hidden="true" /> {t('productDetails.report.title')}</button>}
              <div className="product-shipping">
                {product.origin_city && <div className="shipping-item"><TruckIcon className="shipping-icon" /><span>{t('productDetails.shipping.shipsFrom', { city: product.origin_city })}</span></div>}
                <div className="shipping-item"><ArrowPathIcon className="shipping-icon" /><span>{t('productDetails.shipping.prepares', { time: Number(product.preparation_days || 1) === 0 ? t('productDetails.shipping.sameDay') : t('productDetails.shipping.days', { count: Number(product.preparation_days || 1) }) })}</span></div>
                <div className="shipping-item"><TruckIcon className="shipping-icon" /><span>{t('products.deliveryCheckoutNote')}</span></div>
                <div className="shipping-item"><ShieldCheckIcon className="shipping-icon" /><span>{t('products.codProtectionNote')}</span></div>
                <div className="shipping-item"><ArrowPathIcon className="shipping-icon" /><span>{t('products.orderTrackingNote')}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mobile-purchase-bar" aria-label={t('products.purchaseActions')}>
          <div>
            <span>{isJoutiya ? t('products.askingPrice') : t('products.codTotal')}</span>
            <strong>{isJoutiya ? `${formatAmount(productPrice)} MAD` : t('products.itemPlusDelivery', { item: `${formatAmount(productPrice)} MAD` })}</strong>
          </div>
          {isJoutiya ? (
            <button type="button" onClick={handleMakeOffer} disabled={isUnavailable}>{stock < 1 ? t('products.outOfStock') : isOwnListing ? t('products.yourListing') : t('products.makeOffer')}</button>
          ) : (
            <button type="button" onClick={handleAddToCart} disabled={isUnavailable}>{stock < 1 ? t('products.outOfStock') : isOwnListing ? t('products.yourListing') : t('products.addToCart')}</button>
          )}
        </div>

        <div className="product-tabs">
          <div className="tabs-header" role="tablist" aria-label={t('productDetails.productInformation')}>
            <button type="button" id="description-tab" role="tab" aria-selected={activeTab === 'description'} aria-controls="description-panel" className={`tab-btn ${activeTab==='description'?'active':''}`} onClick={()=>setActiveTab('description')}>{t('productDetails.tabs.description')}</button>
            <button type="button" id="specifications-tab" role="tab" aria-selected={activeTab === 'specifications'} aria-controls="specifications-panel" className={`tab-btn ${activeTab==='specifications'?'active':''}`} onClick={()=>setActiveTab('specifications')}>{t('productDetails.tabs.specifications')}</button>
            <button type="button" id="reviews-tab" role="tab" aria-selected={activeTab === 'reviews'} aria-controls="reviews-panel" className={`tab-btn ${activeTab==='reviews'?'active':''}`} onClick={()=>setActiveTab('reviews')}>{t('productDetails.tabs.reviews', { count: totalReviews })}</button>
          </div>
          <div className="tabs-content" role="tabpanel" tabIndex={0} id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`}>
            {activeTab==='description' && <p>{product.description || t('productDetails.noDescription')}</p>}
            {activeTab==='specifications' && (
              <div className="specs-list">
                <div className="spec-item"><span className="spec-label">{t('productDetails.shipping.category')}</span><span className="spec-value">{categoryLabel || t('products.notSpecified')}</span></div>
                <div className="spec-item"><span className="spec-label">{t('productDetails.shipping.condition')}</span><span className="spec-value">
                  {conditionLabel}
                </span></div>
                <div className="spec-item"><span className="spec-label">{t('productDetails.shipping.availability')}</span><span className="spec-value">{stock > 0 ? t('productDetails.shipping.unitsAvailable', { count: stock }) : t('products.outOfStock')}</span></div>
                <div className="spec-item"><span className="spec-label">{t('productDetails.shipping.sold')}</span><span className="spec-value">{t('productDetails.shipping.units', { count: product.sold || 0 })}</span></div>
                <div className="spec-item"><span className="spec-label">{t('productDetails.shipping.dispatch')}</span><span className="spec-value">{product.origin_city || t('productDetails.shipping.sellerLocation')} · {t('productDetails.shipping.prepares', { time: Number(product.preparation_days || 1) === 0 ? t('productDetails.shipping.sameDay') : t('productDetails.shipping.days', { count: Number(product.preparation_days || 1) }) })}</span></div>
                <div className="spec-item"><span className="spec-label">{t('productDetails.shipping.deliveryPlan')}</span><span className="spec-value">{t('productDetails.shipping.deliveryPlanValue')}</span></div>
              </div>
            )}
            {activeTab==='reviews' && (
              <div className="reviews-section">
                {isAuthenticated && hasPurchased && !hasReviewed && (
                  <div className="write-review">
                    <h3>{t('productDetails.review.write')}</h3>
                    <div className="rating-input">
                      <label>{t('productDetails.review.rating')}</label>
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
                      <label>{t('productDetails.review.comment')}</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder={t('productDetails.review.commentPlaceholder')}
                        rows="4"
                      />
                    </div>
                    <button onClick={submitReview} disabled={submittingReview} className="submit-review-btn">
                      {submittingReview ? t('productDetails.review.submitting') : t('productDetails.review.submit')}
                    </button>
                  </div>
                )}
                
                {isAuthenticated && hasPurchased && hasReviewed && (
                  <div className="already-reviewed">
                    <p>✅ {t('productDetails.review.already')}</p>
                  </div>
                )}
                
                {isAuthenticated && !hasPurchased && (
                  <div className="review-notice">
                    <p>📝 {t('productDetails.review.eligibility')}</p>
                  </div>
                )}
                
                {!isAuthenticated && (
                  <div className="review-notice">
                    <p>{t('productDetails.review.signIn')}</p>
                  </div>
                )}

                <div className="reviews-list">
                  <h3>{t('productDetails.review.customer')}</h3>
                  {reviews.length === 0 ? (
                    <p className="no-reviews">{t('productDetails.review.empty')}</p>
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
                          <span className="review-date">{new Date(review.created_at).toLocaleDateString(i18n.language)}</span>
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
              <h3 id="offer-modal-title">{t('productDetails.offer.title')}</h3>
              <button type="button" onClick={() => setShowOfferModal(false)} className="close-offer-btn" aria-label={t('productDetails.offer.close')}><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="offer-body">
              <p>{t('productDetails.offer.product')} <strong>{product.title}</strong></p>
              <p>{t('productDetails.offer.originalPrice')} <strong>{product.price} MAD</strong></p>
              <div className="offer-field">
                <label htmlFor="offer-amount">{t('productDetails.offer.amount')}</label>
                <input
                  id="offer-amount"
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder={t('productDetails.offer.amountPlaceholder')}
                  min="1"
                  step="0.01"
                  max={product.price}
                />
              </div>
              <div className="offer-field">
                <label htmlFor="offer-message">{t('productDetails.offer.message')}</label>
                <textarea
                  id="offer-message"
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder={t('productDetails.offer.messagePlaceholder')}
                  rows="3"
                />
              </div>
            </div>
            <div className="offer-footer">
              <button type="button" onClick={() => setShowOfferModal(false)} className="cancel-offer-btn">{t('productDetails.offer.cancel')}</button>
              <button type="button" onClick={submitOffer} disabled={submittingOffer} className="submit-offer-btn">
                {submittingOffer ? t('productDetails.offer.sending') : t('productDetails.offer.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="offer-modal" onClick={() => setShowReportModal(false)}>
          <div className="offer-container report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-listing-title" onClick={(event) => event.stopPropagation()}>
            <div className="offer-header"><h3 id="report-listing-title">{t('productDetails.report.title')}</h3><button type="button" onClick={() => setShowReportModal(false)} className="close-offer-btn" aria-label={t('productDetails.report.close')}><XMarkIcon className="w-5 h-5" /></button></div>
            <div className="offer-body"><p>{t('productDetails.report.lead')}</p><div className="offer-field"><label htmlFor="report-reason">{t('productDetails.report.reason')}</label><select id="report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)}>{['scam', 'prohibited', 'misleading', 'counterfeit', 'other'].map((reason) => <option key={reason} value={reason}>{t(`productDetails.report.reasons.${reason}`)}</option>)}</select></div><div className="offer-field"><label htmlFor="report-details">{t('productDetails.report.details')}</label><textarea id="report-details" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength="1000" rows="4" placeholder={t('productDetails.report.detailsPlaceholder')} /></div></div>
            <div className="offer-footer"><button type="button" onClick={() => setShowReportModal(false)} className="cancel-offer-btn">{t('productDetails.report.cancel')}</button><button type="button" onClick={submitReport} disabled={submittingReport} className="submit-offer-btn">{submittingReport ? t('productDetails.report.submitting') : t('productDetails.report.submit')}</button></div>
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
        .cod-price-breakdown { display: grid; gap: 0.4rem; margin-top: 0.9rem; padding: 0.8rem; border: 1px solid #d9edf3; border-radius: 0.75rem; background: #f4fbfd; color: #425466; font-size: 0.82rem; }
        .cod-price-breakdown > span { display: flex; justify-content: space-between; gap: 1rem; }
        .cod-price-breakdown strong { color: #173f4c; }
        .cod-price-breakdown .cod-total { margin-top: 0.2rem; padding-top: 0.55rem; border-top: 1px solid #cfe6ed; color: #173f4c; font-weight: 800; }
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
        .report-listing-btn { display:inline-flex;align-items:center;gap:.38rem;margin-top:.85rem;padding:0;border:0;background:none;color:#5c6c7b;font:inherit;font-size:.82rem;cursor:pointer;text-decoration:underline; }.report-listing-btn svg { width:1rem; }.report-listing-btn:hover { color:#b42318; }.report-dialog select { width:100%;padding:.65rem;border:1px solid #d3dee6;border-radius:.5rem;background:#fff;font:inherit; }
        .shipping-item { display: flex; align-items: flex-start; gap: 0.55rem; font-size: 0.8rem; color: #4b5563; line-height: 1.4; }
        .shipping-icon { flex: 0 0 auto; width: 1rem; height: 1rem; margin-top: 0.05rem; color: #216275; }
        .mobile-purchase-bar { display: none; }
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
          .product-details { padding: 1rem 0 5.5rem; }
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
          .mobile-purchase-bar { position: fixed; z-index: 100; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.7rem max(1rem, env(safe-area-inset-right)) calc(0.7rem + env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); border-top: 1px solid #dbe7eb; background: rgba(255,255,255,0.97); box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.12); }
          .mobile-purchase-bar div { display: grid; gap: 0.12rem; min-width: 0; }
          .mobile-purchase-bar span { color: #52616b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
          .mobile-purchase-bar strong { color: #111827; font-size: 1rem; white-space: nowrap; }
          .mobile-purchase-bar button { flex: 0 0 auto; min-height: 44px; padding: 0.65rem 1rem; border: 0; border-radius: 999px; background: #111827; color: white; font-weight: 800; cursor: pointer; }
          .mobile-purchase-bar button:disabled { cursor: not-allowed; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ProductDetailsPage;

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StarIcon, ArrowDownTrayIcon, ShieldCheckIcon, DocumentIcon, CheckCircleIcon, EnvelopeIcon, PhoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { getDigitalProduct } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import { getImageUrl } from '../../utils/imageUtils';

const DigitalDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState({ phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchProduct();
    if (isAuthenticated) {
      checkCanDownload();
    }
  }, [id, isAuthenticated]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await getDigitalProduct(id);
      setProduct(response.data.product);
    } catch {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const checkCanDownload = async () => {
    try {
      const res = await api.get(`/digital/${id}/can-download`);
      setCanDownload(res.data.canDownload);
    } catch (error) {
      console.error('Error checking download status:', error);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestFormData.phone && !requestFormData.email) {
      toast.error('Please provide at least phone or email');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/digital/${id}/request`, {
        phone: requestFormData.phone,
        email: requestFormData.email
      });
      if (res.data.success) {
        toast.success('Request sent! The seller will contact you soon.');
        setShowRequestForm(false);
        setRequestFormData({ phone: '', email: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    window.open(`/api/digital/${id}/download`, '_blank');
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading product...</p></div>;
  if (!product) return <div className="container text-center py-16"><p>Product not found</p><Link to="/digital" className="btn btn-primary">Back</Link></div>;

  const primaryMedia = product.media?.find(m => m.is_primary) || product.media?.[0];

  return (
    <div className="digital-details">
      <div className="container">
        <div className="digital-grid">
          <div className="digital-main">
            <h1>{product.title}</h1>
            <div className="digital-meta">
              <div className="product-rating"><StarIcon className="star-icon" /><span>{product.rating || 0}</span><span className="review-count">({product.reviews_count || 0} reviews)</span></div>
              <div className="product-downloads"><span>📥 {product.downloads || 0} downloads</span></div>
            </div>

            <div className="seller-info">
              <div className="seller-avatar">{product.seller_name?.charAt(0) || 'S'}</div>
              <div>
                <h3>
                  <Link to={`/profile/${product.seller_id}`} className="seller-link">
                    {product.seller_name}
                  </Link>
                </h3>
                <p>Seller</p>
              </div>
            </div>

            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            <div className="product-details-info">
              <h3>Product Details</h3>
              <ul>
                <li><DocumentIcon className="detail-icon" /> File Type: {product.file_type || 'Digital download'}</li>
                <li><ArrowDownTrayIcon className="detail-icon" /> File Size: {product.file_size || 'Not specified'}</li>
                <li><ShieldCheckIcon className="detail-icon" /> Secure instant download after seller confirmation</li>
              </ul>
            </div>
          </div>

          <div className="digital-sidebar">
            <div className="sidebar-card">
              <div className="product-image-large" onClick={() => product.media?.length && setShowGallery(true)}>
                {primaryMedia ? (
                  primaryMedia.media_type === 'video' ? (
                   <video src={getImageUrl(primaryMedia.media_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />                  ) : (
                    <MarketplaceImage source={primaryMedia.media_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />                  )
                ) : (
                  <span style={{ fontSize: '3rem' }}>{product.image || '💻'}</span>
                )}
                {product.media?.length > 1 && <div className="gallery-badge">{product.media.length} items</div>}
              </div>
              <div className="product-price-section">
                <span className="current-price">{product.price} MAD</span>
                {product.old_price && <span className="old-price">{product.old_price} MAD</span>}
              </div>

              {!isAuthenticated ? (
                <button className="purchase-btn" onClick={() => navigate('/login')}>Login to Request</button>
              ) : canDownload ? (
                <button className="download-btn" onClick={handleDownload}>
                  <ArrowDownTrayIcon className="w-4 h-4" /> Download Now
                </button>
              ) : (
                <>
                  <button className="request-btn" onClick={() => setShowRequestForm(true)}>
                    <EnvelopeIcon className="w-4 h-4" /> Contact Seller & Get File
                  </button>
                  <div className="info-text">* After contacting and paying the seller, you will receive download access here.</div>
                </>
              )}

              {/* Animated Request Form Modal */}
              {showRequestForm && (
                <div className="modal-overlay" onClick={() => setShowRequestForm(false)}>
                  <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                    <h3>Contact Seller</h3>
                    <p>Leave your contact info. The seller will reach out to finalize payment and deliver the file.</p>
                    <form onSubmit={handleRequestSubmit}>
                      <div className="form-group">
                        <label><PhoneIcon className="inline-icon" /> Phone Number</label>
                        <input
                          type="tel"
                          placeholder="e.g., 06XXXXXXXX"
                          value={requestFormData.phone}
                          onChange={(e) => setRequestFormData({...requestFormData, phone: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label><EnvelopeIcon className="inline-icon" /> Email Address</label>
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={requestFormData.email}
                          onChange={(e) => setRequestFormData({...requestFormData, email: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="modal-actions">
                        <button type="button" onClick={() => setShowRequestForm(false)} className="cancel-btn">Cancel</button>
                        <button type="submit" disabled={submitting} className="submit-btn">
                          {submitting ? 'Sending...' : <><PaperAirplaneIcon className="w-4 h-4" /> Send Request</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="guarantee">
                <ShieldCheckIcon className="guarantee-icon" />
                <span>Your contact info is shared only with the seller for transaction purposes.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showGallery && (
        <MediaGallery
           media={product.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}          onClose={() => setShowGallery(false)}
        />
      )}
      <style>{`
        .digital-details { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .digital-grid { display: grid; grid-template-columns: 1fr 350px; gap: 2rem; }
        @media (max-width: 768px) { .digital-grid { grid-template-columns: 1fr; } }
        .digital-main h1 { font-size: 1.75rem; margin-bottom: 1rem; }
        .digital-meta { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .product-rating, .product-downloads { display: flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: #6b7280; }
        .star-icon { width: 1rem; height: 1rem; color: #f59e0b; fill: #f59e0b; }
        .seller-info { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 1rem; margin-bottom: 2rem; }
        .seller-avatar { width: 3rem; height: 3rem; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.25rem; }
        .seller-link { color: #1a1a1a; text-decoration: none; }
        .seller-link:hover { color: #87CEEB; text-decoration: underline; }
        .product-description { margin-bottom: 2rem; }
        .product-details-info ul { list-style: none; padding: 0; }
        .product-details-info li { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.875rem; color: #4b5563; }
        .detail-icon { width: 1rem; height: 1rem; color: #87CEEB; }
        .sidebar-card { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: sticky; top: 100px; }
        .product-image-large { height: 150px; background: #f3f4f6; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 1rem; cursor: pointer; position: relative; }
        .gallery-badge { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .product-price-section { margin-bottom: 1rem; }
        .current-price { font-size: 1.5rem; font-weight: bold; }
        .old-price { font-size: 0.875rem; color: #9ca3af; text-decoration: line-through; margin-left: 0.5rem; }
        .request-btn, .purchase-btn, .download-btn { width: 100%; padding: 0.75rem; border: none; border-radius: 2rem; cursor: pointer; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .request-btn { background: #87CEEB; color: #1a1a1a; }
        .purchase-btn { background: #1a1a1a; color: white; }
        .download-btn { background: #10b981; color: white; }
        .info-text { font-size: 0.7rem; color: #6b7280; text-align: center; margin-top: -0.5rem; margin-bottom: 1rem; }
        .guarantee { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; color: #6b7280; text-align: center; justify-content: center; margin-top: 1rem; }
        .guarantee-icon { width: 1rem; height: 1rem; }
        /* Modal styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease-out; }
        .modal-container { background: white; border-radius: 1rem; padding: 2rem; max-width: 400px; width: 90%; animation: slideUp 0.3s ease-out; }
        .modal-container h3 { margin-bottom: 0.5rem; }
        .modal-container p { font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
        .inline-icon { width: 1rem; height: 1rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem; }
        .cancel-btn { padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; }
        .submit-btn { padding: 0.5rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default DigitalDetailsPage;

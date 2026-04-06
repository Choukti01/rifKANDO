import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StarIcon, CloudArrowDownIcon, DocumentTextIcon, ShieldCheckIcon, ArrowPathIcon, CheckCircleIcon, HomeIcon, FolderIcon } from '@heroicons/react/24/outline';
import { getDigitalProduct, purchaseDigitalProduct } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const DigitalDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [purchaseData, setPurchaseData] = useState(null);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await getDigitalProduct(id);
      setProduct(response.data.product);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to purchase this item');
      navigate('/login');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmPurchase = async () => {
    setPurchasing(true);
    setShowConfirmModal(false);
    
    try {
      const response = await purchaseDigitalProduct(id);
      
      if (response.data.success) {
        setPurchaseComplete(true);
        setPurchaseData(response.data.purchase);
        toast.success('Purchase successful!');
        
        setTimeout(() => {
          navigate('/my-purchases');
        }, 2000);
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to complete purchase';
      toast.error(message);
      setPurchasing(false);
    }
  };

  // Get file type display name
  const getFileTypeDisplay = (type) => {
    const types = {
      url: 'Direct Download',
      google_drive: 'Google Drive',
      dropbox: 'Dropbox',
      multiple: 'Multiple Files'
    };
    return types[type] || 'Digital File';
  };

  // Get file type icon
  const getFileTypeIcon = (type) => {
    switch(type) {
      case 'google_drive':
        return '📁';
      case 'dropbox':
        return '📦';
      case 'multiple':
        return '📚';
      default:
        return '💻';
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container text-center py-16">
        <p>Product not found</p>
        <Link to="/digital" className="btn btn-primary mt-4">Back to Digital Products</Link>
      </div>
    );
  }

  const truncatedTitle = product.title.length > 30 ? product.title.substring(0, 30) + '...' : product.title;

  return (
    <div className="digital-details-page">
      <div className="container">
        {/* Professional Breadcrumb */}
        <nav className="breadcrumb-nav">
          <Link to="/" className="breadcrumb-link">
            <HomeIcon className="breadcrumb-icon" />
            Home
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/digital" className="breadcrumb-link">Digital Products</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{truncatedTitle}</span>
        </nav>

        {/* Purchase Success Message */}
        {purchaseComplete && (
          <div className="success-message">
            <CheckCircleIcon className="success-icon" />
            <div>
              <h3>Purchase Successful!</h3>
              <p>Your order has been processed. Redirecting to your purchases...</p>
            </div>
          </div>
        )}

        <div className="digital-details-grid">
          <div className="product-main">
            <h1>{product.title}</h1>
            
            <div className="seller-info">
              <div className="seller-avatar">
                {product.seller_name?.charAt(0) || 'S'}
              </div>
              <div>
                <h3>{product.seller_name || 'Digital Creator'}</h3>
                <div className="seller-rating">
                  <StarIcon className="star-icon" />
                  <span>{product.rating || 0}</span>
                  <span className="review-count">({product.reviews_count || 0} reviews)</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Description</h2>
              <p>{product.description}</p>
            </div>

            <div className="section">
              <h2>Product Details</h2>
              <div className="details-list">
                <div className="detail-item">
                  <DocumentTextIcon className="detail-icon" />
                  <span>Delivery Method: {getFileTypeDisplay(product.file_type)}</span>
                </div>
                {product.file_size && (
                  <div className="detail-item">
                    <CloudArrowDownIcon className="detail-icon" />
                    <span>File Size: {product.file_size}</span>
                  </div>
                )}
                {product.download_limit > 0 && (
                  <div className="detail-item">
                    <ShieldCheckIcon className="detail-icon" />
                    <span>Download Limit: {product.download_limit} times</span>
                  </div>
                )}
                <div className="detail-item">
                  <ShieldCheckIcon className="detail-icon" />
                  <span>Secure payment guaranteed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="product-sidebar">
            <div className="purchase-card">
              <div className="product-icon">
                {product.image || getFileTypeIcon(product.file_type)}
              </div>
              <div className="price-section">
                <span className="current-price">{product.price} MAD</span>
                {product.old_price && (
                  <span className="old-price">{product.old_price} MAD</span>
                )}
              </div>
              
              <button 
                className="purchase-btn" 
                onClick={handlePurchaseClick}
                disabled={purchasing}
              >
                {purchasing ? 'Processing...' : 'Buy Now'}
              </button>

              <div className="delivery-info">
                <p className="delivery-title">Delivery Information</p>
                <p className="delivery-text">
                  {product.file_type === 'multiple' 
                    ? 'You will receive access to all files immediately after purchase.'
                    : 'You will receive a download link immediately after purchase.'}
                </p>
              </div>

              <div className="features-list">
                <div className="feature">
                  <ShieldCheckIcon className="feature-icon" />
                  <span>Secure payment</span>
                </div>
                <div className="feature">
                  <ArrowPathIcon className="feature-icon" />
                  <span>30-day refund policy</span>
                </div>
                <div className="feature">
                  <CloudArrowDownIcon className="feature-icon" />
                  <span>Instant delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Purchase</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-product">
                <div className="confirm-icon">{product.image || '💻'}</div>
                <div className="confirm-details">
                  <h4>{product.title}</h4>
                  <p>{product.price} MAD</p>
                </div>
              </div>
              <div className="confirm-total">
                <span>Total:</span>
                <strong>{product.price} MAD</strong>
              </div>
              <p className="confirm-note">
                {product.file_type === 'multiple' 
                  ? 'You will get access to all files immediately after purchase.'
                  : 'You will be able to download this file immediately after purchase.'}
              </p>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                <button className="confirm-btn" onClick={confirmPurchase}>Confirm Purchase</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .digital-details-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
        /* Professional Breadcrumb */
        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding: 0.75rem 0;
          font-size: 0.875rem;
        }
        .breadcrumb-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #6b7280;
          text-decoration: none;
          transition: color 0.2s;
        }
        .breadcrumb-link:hover {
          color: #87CEEB;
        }
        .breadcrumb-icon {
          width: 1rem;
          height: 1rem;
        }
        .breadcrumb-separator {
          color: #d1d5db;
        }
        .breadcrumb-current {
          color: #1a1a1a;
          font-weight: 500;
        }
        .success-message {
          background: #d1fae5;
          border-radius: 1rem;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .success-icon {
          width: 2rem;
          height: 2rem;
          color: #10b981;
        }
        .success-message h3 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .success-message p {
          font-size: 0.875rem;
          color: #065f46;
        }
        .digital-details-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .digital-details-grid {
            grid-template-columns: 1fr;
          }
        }
        .product-main {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .product-main h1 {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
        }
        .seller-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 1rem;
          margin-bottom: 2rem;
        }
        .seller-avatar {
          width: 56px;
          height: 56px;
          background: #87CEEB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
        }
        .seller-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #f59e0b;
        }
        .star-icon {
          width: 1rem;
          height: 1rem;
          fill: #f59e0b;
        }
        .section {
          margin-bottom: 2rem;
        }
        .section h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }
        .section p {
          color: #4b5563;
          line-height: 1.6;
        }
        .details-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #4b5563;
        }
        .detail-icon {
          width: 1rem;
          height: 1rem;
          color: #87CEEB;
        }
        .product-sidebar {
          position: sticky;
          top: 100px;
        }
        .purchase-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-align: center;
        }
        .product-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .price-section {
          margin-bottom: 1.5rem;
        }
        .current-price {
          font-size: 1.75rem;
          font-weight: bold;
          color: #1a1a1a;
        }
        .old-price {
          font-size: 0.875rem;
          color: #9ca3af;
          text-decoration: line-through;
          margin-left: 0.5rem;
        }
        .purchase-btn {
          width: 100%;
          padding: 0.875rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        .purchase-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .delivery-info {
          background: #f9fafb;
          border-radius: 0.75rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
        }
        .delivery-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }
        .delivery-text {
          font-size: 0.7rem;
          color: #6b7280;
          margin: 0;
        }
        .features-list {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }
        .feature {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .feature-icon {
          width: 1rem;
          height: 1rem;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 1rem;
          width: 450px;
          max-width: 90%;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h3 {
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .modal-body {
          padding: 1.5rem;
        }
        .confirm-product {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }
        .confirm-icon {
          font-size: 2.5rem;
        }
        .confirm-details h4 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .confirm-total {
          display: flex;
          justify-content: space-between;
          padding: 1rem 0;
          border-top: 1px solid #e5e7eb;
          margin-bottom: 1rem;
        }
        .confirm-note {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
        }
        .cancel-btn {
          flex: 1;
          padding: 0.625rem;
          background: #e5e7eb;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .confirm-btn {
          flex: 1;
          padding: 0.625rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default DigitalDetailsPage;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CloudArrowDownIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getMyPurchases } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const MyPurchasesPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases();
    }
  }, [isAuthenticated]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await getMyPurchases();
      console.log('Purchases:', response.data);
      setPurchases(response.data.purchases || []);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      toast.error('Failed to load your purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (purchase) => {
    if (purchase.download_url) {
      window.open(purchase.download_url, '_blank');
      toast.success('Download started!');
    } else {
      toast.error('No download link available');
    }
  };

  const getFileTypeIcon = (fileType) => {
    switch(fileType) {
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
        <p>Loading your purchases...</p>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="empty-state-container">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>No purchases yet</h2>
          <p>You haven't purchased any digital products yet</p>
          <Link to="/digital" className="browse-btn">Browse Digital Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="my-purchases-page">
      <div className="container">
        <div className="page-header">
          <h1>My Purchases</h1>
          <p>Manage and download your digital products</p>
        </div>

        <div className="purchases-grid">
          {purchases.map(purchase => (
            <div key={purchase.id} className="purchase-card">
              <div className="card-header">
                <div className="product-icon">
                  {purchase.image || getFileTypeIcon(purchase.file_type)}
                </div>
                <div className="order-status">
                  <CheckCircleIcon className="status-icon" />
                  <span>Completed</span>
                </div>
              </div>
              
              <div className="card-body">
                <h3>{purchase.title}</h3>
                <div className="order-details">
                  <div className="detail-row">
                    <span className="detail-label">Order Number:</span>
                    <span className="detail-value">{purchase.order_number}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Purchase Date:</span>
                    <span className="detail-value">{new Date(purchase.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value price">{purchase.price} MAD</span>
                  </div>
                </div>
              </div>
              
              <div className="card-footer">
                {purchase.download_url ? (
                  <button 
                    onClick={() => handleDownload(purchase)} 
                    className="download-btn"
                  >
                    <CloudArrowDownIcon className="btn-icon" />
                    Download Now
                  </button>
                ) : (
                  <button className="download-btn disabled" disabled>
                    <DocumentTextIcon className="btn-icon" />
                    No File Available
                  </button>
                )}
                {purchase.file_type === 'google_drive' && (
                  <div className="file-info">
                    <span>📁 Google Drive File</span>
                  </div>
                )}
                {purchase.file_type === 'dropbox' && (
                  <div className="file-info">
                    <span>📦 Dropbox File</span>
                  </div>
                )}
                {purchase.download_limit > 0 && (
                  <div className="file-info">
                    <ClockIcon className="info-icon" />
                    <span>Download limit: {purchase.download_limit} times</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .my-purchases-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .page-header h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }
        .page-header p {
          color: #6b7280;
        }
        .purchases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }
        .purchase-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .purchase-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, rgba(135,206,235,0.1) 0%, #ffffff 100%);
          border-bottom: 1px solid #e5e7eb;
        }
        .product-icon {
          font-size: 2rem;
        }
        .order-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: #d1fae5;
          padding: 0.25rem 0.5rem;
          border-radius: 2rem;
          font-size: 0.7rem;
          font-weight: 500;
          color: #065f46;
        }
        .status-icon {
          width: 0.875rem;
          height: 0.875rem;
        }
        .card-body {
          padding: 1.25rem;
        }
        .card-body h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }
        .order-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }
        .detail-label {
          color: #6b7280;
        }
        .detail-value {
          color: #374151;
          font-weight: 500;
        }
        .detail-value.price {
          font-weight: 600;
          color: #1a1a1a;
        }
        .card-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .download-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .download-btn:hover {
          background: #2c2c2c;
        }
        .download-btn.disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
        }
        .btn-icon {
          width: 1rem;
          height: 1rem;
        }
        .file-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          margin-top: 0.5rem;
          font-size: 0.7rem;
          color: #6b7280;
        }
        .info-icon {
          width: 0.75rem;
          height: 0.75rem;
        }
        .empty-state-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .empty-state h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          color: #6b7280;
          margin-bottom: 2rem;
        }
        .browse-btn {
          display: inline-block;
          padding: 0.625rem 1.5rem;
          background: #1a1a1a;
          color: white;
          text-decoration: none;
          border-radius: 2rem;
          font-size: 0.875rem;
        }
        @media (max-width: 768px) {
          .purchases-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MyPurchasesPage;
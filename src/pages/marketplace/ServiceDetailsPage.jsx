import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StarIcon, ClockIcon, ArrowPathIcon, CheckBadgeIcon, PlayIcon } from '@heroicons/react/24/outline';
import { getService, orderService } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import { getImageUrl } from '../../utils/imageUtils';

const ServiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [requirements, setRequirements] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let isCurrent = true;

    const loadService = async () => {
      try {
        const response = await getService(id);
        if (!isCurrent) return;

        const serviceData = response.data.service;
        setService(serviceData);
        setSelectedPackage(serviceData.packages?.[0] || {
          id: 'default',
          name: 'Standard Service',
          price: serviceData.price,
          delivery_time: serviceData.delivery_time || 'As agreed',
          revisions: serviceData.revisions || 0
        });
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching service:', error);
          toast.error('Failed to load service');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadService();

    return () => {
      isCurrent = false;
    };
  }, [id]);

  const handleOrder = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to order');
      navigate('/login');
      return;
    }
    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }
    setOrdering(true);
    try {
      const response = await orderService(id, {
        package_name: selectedPackage.name,
        price: selectedPackage.price,
        requirements: requirements
      });
      if (response.data.success) {
        toast.success('Order placed successfully!');
        navigate('/orders');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading service...</p></div>;
  if (!service) return <div className="container text-center py-16"><p>Service not found</p><Link to="/services" className="btn btn-primary">Back</Link></div>;

  const primaryMedia = service.media?.find(m => m.is_primary) || service.media?.[0];
  const hasPackages = service.packages && service.packages.length > 0;

  return (
    <div className="service-details">
      <div className="container">
        <div className="service-grid">
          <div className="service-main">
            <h1>{service.title}</h1>
            <div className="service-meta">
              <div className="service-rating"><StarIcon className="star-icon" /><span>{service.rating || 0}</span><span className="review-count">({service.reviews_count || 0} reviews)</span></div>
              <div className="service-orders"><span>📦 {service.orders_count || 0} orders</span></div>
            </div>

            <div className="provider-info">
              <div className="provider-avatar">{service.provider_name?.charAt(0) || 'P'}</div>
              <div>
                <h3>
                  <Link to={`/profile/${service.provider_id}`} className="provider-link">
                    {service.provider_name}
                  </Link>
                </h3>
                <p>Service Provider</p>
              </div>
            </div>

            <div className="service-description">
              <h3>About this service</h3>
              <p>{service.description}</p>
            </div>

            {/* Packages section – only show if there are packages */}
            {hasPackages && (
              <div className="service-packages">
                <h3>Available Packages</h3>
                <div className="packages-grid">
                  {service.packages.map(pkg => (
                    <div 
                      key={pkg.id} 
                      className={`package-card ${selectedPackage?.id === pkg.id ? 'selected' : ''}`}
                      onClick={() => setSelectedPackage(pkg)}
                    >
                      <h4>{pkg.name}</h4>
                      <div className="package-price">{pkg.price} MAD</div>
                      <div className="package-details">
                        {pkg.delivery_time && <span>⏱️ Delivery: {pkg.delivery_time}</span>}
                        {pkg.revisions && <span>🔄 {pkg.revisions} revisions</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="requirements-input">
              <label>Your requirements / details</label>
              <textarea 
                rows="4" 
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Describe what you need..."
                className="form-input"
              />
            </div>
          </div>

          <div className="service-sidebar">
            <div className="sidebar-card">
              <div className="service-image-large" onClick={() => service.media?.length && setShowGallery(true)}>
                {primaryMedia ? (
                  primaryMedia.media_type === 'video' ? (
                    <video src={getImageUrl(primaryMedia.media_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <MarketplaceImage source={primaryMedia.media_url} alt={service.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                ) : (
                  <span style={{ fontSize: '3rem' }}>🛠️</span>
                )}
                {service.media?.length > 1 && <div className="gallery-badge">{service.media.length} items</div>}
              </div>
              <div className="service-price-section">
                <span className="current-price">{selectedPackage ? selectedPackage.price : service.price} MAD</span>
                {service.old_price && <span className="old-price">{service.old_price} MAD</span>}
              </div>
              <button className="order-btn" onClick={handleOrder} disabled={ordering}>
                {ordering ? 'Placing Order...' : 'Order Now'}
              </button>
              <div className="service-features">
                <div className="feature-item"><ClockIcon className="feature-icon" /><span>Delivery: {selectedPackage?.delivery_time || service.delivery_time || 'As per agreement'}</span></div>
                <div className="feature-item"><ArrowPathIcon className="feature-icon" /><span>{selectedPackage?.revisions || service.revisions || 0} revisions included</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showGallery && (
        <MediaGallery
          media={service.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}
          onClose={() => setShowGallery(false)}
        />
      )}
      <style>{`
        .service-details { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .service-grid { display: grid; grid-template-columns: 1fr 350px; gap: 2rem; }
        @media (max-width: 768px) { .service-grid { grid-template-columns: 1fr; } }
        .service-main h1 { font-size: 1.75rem; margin-bottom: 1rem; }
        .service-meta { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .service-rating, .service-orders { display: flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: #6b7280; }
        .star-icon { width: 1rem; height: 1rem; color: #f59e0b; fill: #f59e0b; }
        .provider-info { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 1rem; margin-bottom: 2rem; }
        .provider-avatar { width: 3rem; height: 3rem; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.25rem; }
        .provider-link { color: #1a1a1a; text-decoration: none; }
        .provider-link:hover { color: #87CEEB; text-decoration: underline; }
        .service-description { margin-bottom: 2rem; }
        .service-description h3 { margin-bottom: 0.5rem; }
        .service-packages { margin-top: 1rem; margin-bottom: 1rem; }
        .packages-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .package-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; cursor: pointer; transition: all 0.2s; }
        .package-card.selected { border-color: #87CEEB; background: #f0f9ff; }
        .package-card h4 { font-size: 1rem; margin-bottom: 0.5rem; }
        .package-price { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; }
        .package-details { font-size: 0.7rem; color: #6b7280; display: flex; flex-direction: column; gap: 0.25rem; }
        .requirements-input { margin-top: 1rem; }
        .requirements-input label { display: block; font-weight: 500; margin-bottom: 0.5rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
        .sidebar-card { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: sticky; top: 100px; }
        .service-image-large { height: 150px; background: #f3f4f6; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 1rem; cursor: pointer; position: relative; }
        .gallery-badge { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .service-price-section { margin-bottom: 1rem; }
        .current-price { font-size: 1.5rem; font-weight: bold; }
        .old-price { font-size: 0.875rem; color: #9ca3af; text-decoration: line-through; margin-left: 0.5rem; }
        .order-btn { width: 100%; padding: 0.75rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; font-weight: 600; margin-bottom: 1rem; }
        .order-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .service-features { border-top: 1px solid #e5e7eb; padding-top: 1rem; }
        .feature-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; color: #6b7280; }
        .feature-icon { width: 1rem; height: 1rem; }
      `}</style>
    </div>
  );
};

export default ServiceDetailsPage;

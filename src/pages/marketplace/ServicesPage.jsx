import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getServices } from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import { getImageUrl } from '../../utils/imageUtils';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import VerifiedBadge from '../../components/common/VerifiedBadge';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryService, setGalleryService] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await getServices();
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading services...</p>
      </div>
    );
  }

  return (
    <div className="services-page">
      <div className="container">
        <div className="services-header">
          <h1>Services</h1>
          <p>Professional services from trusted providers</p>
        </div>

        <div className="services-grid">
          {services.length === 0 ? (
            <p className="text-center col-span-full">No services found</p>
          ) : (
            services.map(service => {
              const primaryMedia = service.media?.find(m => m.is_primary) || service.media?.[0];
              return (
                <div key={service.id} className="service-card">
                  <div 
                    className="service-image" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (service.media?.length) setGalleryService(service);
                    }}
                    style={{ cursor: service.media?.length ? 'pointer' : 'default' }}
                    role={service.media?.length ? 'button' : undefined}
                    tabIndex={service.media?.length ? 0 : undefined}
                    aria-label={service.media?.length ? `View media for ${service.title}` : undefined}
                    onKeyDown={(event) => {
                      if (service.media?.length && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        setGalleryService(service);
                      }
                    }}
                  >
                    {primaryMedia ? (
                      <>
                        {primaryMedia.media_type === 'video' && <div className="video-badge">🎬 Video</div>}
                        <MarketplaceImage source={primaryMedia.media_url} alt={service.title} />
                        {service.media.length > 1 && (
                          <div className="media-count">{service.media.length} items</div>
                        )}
                      </>
                    ) : (
                      <div className="image-placeholder">🛠️</div>
                    )}
                  </div>
                  <Link to={`/service/${service.id}`}>
                    <h3>{service.title}</h3>
                  </Link>
                  <p className="provider-name">
                    by <Link to={`/profile/${service.provider_id}`} className="provider-link">
                      {service.provider_name || 'Unknown Provider'}
                    </Link>
                    {service.provider_verified === 1 && <VerifiedBadge size="small" />}
                  </p>
                  <div className="service-meta">
                    <span>⭐ {service.rating || 0}</span>
                    <span>📦 {service.orders_count || 0} orders</span>
                  </div>
                  <div className="service-price">
                    <span className="current-price">{service.price} MAD</span>
                    {service.old_price && <span className="old-price">{service.old_price} MAD</span>}
                  </div>
                  <Link to={`/service/${service.id}`} className="listing-card-action">View service</Link>
                </div>
              );
            })
          )}
        </div>
      </div>

      {galleryService && (
        <MediaGallery
          media={galleryService.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}
          onClose={() => setGalleryService(null)}
        />
      )}

      <style>{`
        .services-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .services-header { text-align: center; margin-bottom: 2rem; }
        .services-header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .services-header p { color: #6b7280; }
        .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
        .service-card { display: flex; flex-direction: column; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .service-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .service-image { height: 180px; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; }
        .service-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .video-badge { position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .media-count { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .service-card h3 { font-size: 1rem; font-weight: 600; margin: 0.75rem 1rem 0.25rem; color: #1a1a1a; }
        .service-card a { text-decoration: none; }
        .provider-name { font-size: 0.75rem; color: #6b7280; margin: 0 1rem 0.5rem; }
        .provider-link { color: #87CEEB; text-decoration: none; }
        .provider-link:hover { text-decoration: underline; }
        .service-meta { display: flex; gap: 1rem; margin: 0 1rem 0.5rem; font-size: 0.7rem; color: #6b7280; }
        .service-price { margin: 0 1rem 0.75rem; display: flex; gap: 0.5rem; align-items: baseline; }
        .current-price { font-weight: 700; font-size: 1rem; }
        .old-price { font-size: 0.75rem; color: #9ca3af; text-decoration: line-through; }
      `}</style>
    </div>
  );
};

export default ServicesPage;

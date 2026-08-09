import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { getBookings } from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import { getImageUrl } from '../../utils/imageUtils';
import LoadMoreButton from '../../components/common/LoadMoreButton';




const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [galleryBooking, setGalleryBooking] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'consultation', name: 'Consultations' },
    { id: 'training', name: 'Training' },
    { id: 'classes', name: 'Classes' },
    { id: 'events', name: 'Events' },
  ];

  const fetchBookings = useCallback(async ({ page = 1, append = false, category = 'all' } = {}) => {
    try {
      if (append) setLoadingMore(true);

      const response = await getBookings({
        page,
        limit: 12,
        ...(category !== 'all' ? { category } : {}),
      });
      const nextBookings = response.data.bookings || [];
      setBookings((currentBookings) => (append ? [...currentBookings, ...nextBookings] : nextBookings));
      setPagination(response.data.pagination || { page: 1, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCategoryChange = (category) => {
    if (category === selectedCategory) return;

    setSelectedCategory(category);
    setLoading(true);
    fetchBookings({ category });
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="bookings-page">
      <div className="container">
        <div className="bookings-header">
          <h1>Bookings</h1>
          <p>Book appointments, consultations, and classes with professionals</p>
        </div>

        <div className="bookings-categories">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="bookings-grid">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <p>No bookings available</p>
            </div>
          ) : (
            bookings.map(booking => {
              const primaryMedia = booking.media?.find(m => m.is_primary) || booking.media?.[0];
              return (
                <div key={booking.id} className="booking-card">
                  <div 
                    className="booking-image" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (booking.media?.length) setGalleryBooking(booking);
                    }}
                  >
                    {primaryMedia ? (
                      <>
                        {primaryMedia.media_type === 'video' && <div className="video-badge">🎬 Video</div>}
                        <MarketplaceImage source={primaryMedia.media_url} alt={booking.title} />
                        {booking.media.length > 1 && <div className="media-count">{booking.media.length} items</div>}
                      </>
                    ) : (
                      <div className="image-placeholder">{booking.image || ''}</div>
                    )}
                  </div>
                  <div className="booking-content">
                    <Link to={`/booking/${booking.id}`}>
                      <h3>{booking.title}</h3>
                    </Link>
                    <p>
                      by <Link to={`/profile/${booking.provider_id}`} className="provider-link">{booking.provider_name}</Link>
                    </p>
                    <div className="booking-details">
                      <div className="booking-rating">
                        <StarIcon className="star-icon" />
                        <span>{booking.rating || 0}</span>
                      </div>
                      <div className="booking-duration">
                        <ClockIcon className="clock-icon" />
                        <span>{booking.duration || 60} min</span>
                      </div>
                      <div className="booking-location">
                        <MapPinIcon className="map-icon" />
                        <span>{booking.location_type === 'online' ? 'Online' : 'In Person'}</span>
                      </div>
                    </div>
                    <div className="booking-footer">
                      <span className="booking-price">{booking.price} MAD</span>
                      <Link to={`/booking/${booking.id}`} className="booking-btn">Book Now</Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <LoadMoreButton
          hasMore={pagination.page < pagination.totalPages}
          isLoading={loadingMore}
          onLoadMore={() => fetchBookings({ page: pagination.page + 1, append: true, category: selectedCategory })}
          itemLabel="bookings"
        />
      </div>

      {galleryBooking && (
        <MediaGallery
          media={galleryBooking.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}
          onClose={() => setGalleryBooking(null)}
        />
      )}

      <style>{`
        .bookings-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .bookings-header { text-align: center; margin-bottom: 2rem; }
        .bookings-header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .bookings-categories { display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .cat-btn { padding: 0.5rem 1.5rem; border-radius: 2rem; border: 1px solid #e5e7eb; background: white; cursor: pointer; }
        .cat-btn.active { background: #87CEEB; border-color: #87CEEB; color: #1a1a1a; }
        .bookings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .booking-card { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .booking-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .booking-image { height: 160px; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; }
        .booking-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .video-badge { position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .media-count { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; z-index: 1; }
        .booking-content { padding: 1rem; }
        .booking-content h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; color: #1a1a1a; }
        .booking-content a { text-decoration: none; }
        .booking-content p { font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; }
        .provider-link { color: #87CEEB; text-decoration: none; }
        .provider-link:hover { text-decoration: underline; }
        .booking-details { display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.7rem; color: #6b7280; flex-wrap: wrap; }
        .star-icon, .clock-icon, .map-icon { width: 0.875rem; height: 0.875rem; }
        .star-icon { color: #f59e0b; fill: #f59e0b; }
        .booking-footer { display: flex; justify-content: space-between; align-items: center; }
        .booking-price { font-weight: 700; color: #1a1a1a; }
        .booking-btn { padding: 0.375rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; font-size: 0.75rem; cursor: pointer; text-decoration: none; display: inline-block; }
        .empty-state { text-align: center; padding: 3rem; grid-column: 1 / -1; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
      `}</style>
    </div>
  );
};

export default BookingsPage;

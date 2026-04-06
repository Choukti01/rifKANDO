import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, CalendarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { getBookings } from '../../services/api';
import toast from 'react-hot-toast';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'consultation', name: 'Consultations' },
    { id: 'training', name: 'Training' },
    { id: 'classes', name: 'Classes' },
    { id: 'events', name: 'Events' },
  ];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getBookings();
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = selectedCategory === 'all' 
    ? bookings 
    : bookings.filter(b => b.category === selectedCategory);

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
              onClick={() => setSelectedCategory(cat.id)}
              className={`cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="bookings-grid">
          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>No bookings available</p>
            </div>
          ) : (
            filteredBookings.map(booking => (
              <Link key={booking.id} to={`/booking/${booking.id}`} className="booking-card">
                <div className="booking-image">
                  {booking.image || '📅'}
                </div>
                <div className="booking-content">
                  <h3>{booking.title}</h3>
                  <p>by {booking.provider_name}</p>
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
                    <button className="booking-btn">Book Now</button>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <style>{`
        .bookings-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .bookings-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .bookings-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .bookings-categories {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .cat-btn {
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
        }
        .cat-btn.active {
          background: #87CEEB;
          border-color: #87CEEB;
          color: #1a1a1a;
        }
        .bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .booking-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          transition: all 0.3s;
        }
        .booking-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .booking-image {
          height: 160px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .booking-content {
          padding: 1rem;
        }
        .booking-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .booking-content p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .booking-details {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.7rem;
          color: #6b7280;
          flex-wrap: wrap;
        }
        .star-icon, .clock-icon, .map-icon {
          width: 0.875rem;
          height: 0.875rem;
        }
        .star-icon {
          color: #f59e0b;
          fill: #f59e0b;
        }
        .booking-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .booking-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .booking-btn {
          padding: 0.375rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          grid-column: 1 / -1;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default BookingsPage;
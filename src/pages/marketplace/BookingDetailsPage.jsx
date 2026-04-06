import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StarIcon, CalendarIcon, ClockIcon, MapPinIcon, UserIcon, CheckCircleIcon, HomeIcon } from '@heroicons/react/24/outline';
import { getBooking, bookAppointment } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const BookingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingAppointment, setBookingAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await getBooking(id);
      setBooking(response.data.booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to book an appointment');
      navigate('/login');
      return;
    }
    setShowBookingForm(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }

    setBookingAppointment(true);
    try {
      const response = await bookAppointment(id, {
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        notes: notes
      });
      
      if (response.data.success) {
        setBookingComplete(true);
        toast.success('Appointment booked successfully!');
        setTimeout(() => {
          navigate('/my-appointments');
        }, 2000);
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to book appointment';
      toast.error(message);
    } finally {
      setBookingAppointment(false);
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading booking details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container text-center py-16">
        <p>Booking not found</p>
        <Link to="/bookings" className="btn btn-primary mt-4">Back to Bookings</Link>
      </div>
    );
  }

  const truncatedTitle = booking.title.length > 30 ? booking.title.substring(0, 30) + '...' : booking.title;

  return (
    <div className="booking-details-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb-nav">
          <Link to="/" className="breadcrumb-link">
            <HomeIcon className="breadcrumb-icon" />
            Home
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/bookings" className="breadcrumb-link">Bookings</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{truncatedTitle}</span>
        </nav>

        {/* Booking Success Message */}
        {bookingComplete && (
          <div className="success-message">
            <CheckCircleIcon className="success-icon" />
            <div>
              <h3>Booking Confirmed!</h3>
              <p>Your appointment has been booked. Check your appointments page for details.</p>
            </div>
          </div>
        )}

        <div className="booking-details-grid">
          <div className="booking-main">
            <h1>{booking.title}</h1>
            
            <div className="provider-info">
              <div className="provider-avatar">
                {booking.provider_name?.charAt(0) || 'P'}
              </div>
              <div>
                <h3>{booking.provider_name || 'Service Provider'}</h3>
                <div className="provider-rating">
                  <StarIcon className="star-icon" />
                  <span>{booking.rating || 0}</span>
                  <span className="review-count">({booking.reviews_count || 0} reviews)</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>About This Service</h2>
              <p>{booking.description}</p>
            </div>

            <div className="section">
              <h2>Service Details</h2>
              <div className="details-list">
                <div className="detail-item">
                  <ClockIcon className="detail-icon" />
                  <span>Duration: {booking.duration || 60} minutes</span>
                </div>
                <div className="detail-item">
                  <MapPinIcon className="detail-icon" />
                  <span>Location: {booking.location_type === 'online' ? 'Online (Video Call)' : booking.location || 'In Person'}</span>
                </div>
                {booking.max_participants > 1 && (
                  <div className="detail-item">
                    <UserIcon className="detail-icon" />
                    <span>Max {booking.max_participants} participants</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="booking-sidebar">
            <div className="booking-card">
              <div className="booking-icon">
                {booking.image || '📅'}
              </div>
              <div className="price-section">
                <span className="current-price">{booking.price} MAD</span>
                {booking.old_price && (
                  <span className="old-price">{booking.old_price} MAD</span>
                )}
              </div>
              
              {!showBookingForm ? (
                <button className="book-btn" onClick={handleBookClick}>
                  Book Appointment
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Booking Form */}
        {showBookingForm && (
          <div className="booking-form-section">
            <h2>Book Your Appointment</h2>
            <div className="booking-form">
              <div className="form-group">
                <label>Select Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label>Select Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Additional Notes (Optional)</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Any special requests or information for the provider..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button 
                  className="confirm-book-btn" 
                  onClick={handleConfirmBooking}
                  disabled={bookingAppointment}
                >
                  {bookingAppointment ? 'Processing...' : 'Confirm Booking'}
                </button>
                <button 
                  className="cancel-book-btn" 
                  onClick={() => setShowBookingForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .booking-details-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
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
        .booking-details-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .booking-details-grid {
            grid-template-columns: 1fr;
          }
        }
        .booking-main {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .booking-main h1 {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
        }
        .provider-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 1rem;
          margin-bottom: 2rem;
        }
        .provider-avatar {
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
        .booking-sidebar {
          position: sticky;
          top: 100px;
        }
        .booking-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-align: center;
        }
        .booking-icon {
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
        .book-btn {
          width: 100%;
          padding: 0.875rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .booking-form-section {
          margin-top: 2rem;
          padding: 2rem;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .booking-form-section h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }
        .booking-form {
          max-width: 500px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .confirm-book-btn {
          padding: 0.625rem 1.5rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .cancel-book-btn {
          padding: 0.625rem 1.5rem;
          background: #e5e7eb;
          color: #374151;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default BookingDetailsPage;
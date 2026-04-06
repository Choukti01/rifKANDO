import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getMyBookings, deleteBooking } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const BookingsDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [stats, setStats] = useState({
    totalBookings: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getMyBookings();
      const bookingsData = response.data.bookings || [];
      setBookings(bookingsData);
      
      const totalAppointments = bookingsData.reduce((sum, b) => sum + (b.appointments_count || 0), 0);
      const totalRevenue = bookingsData.reduce((sum, b) => sum + ((b.price || 0) * (b.appointments_count || 0)), 0);
      const avgRating = bookingsData.length > 0 
        ? bookingsData.reduce((sum, b) => sum + (b.rating || 0), 0) / bookingsData.length 
        : 0;
      
      setStats({
        totalBookings: bookingsData.length,
        totalAppointments,
        totalRevenue,
        avgRating: avgRating.toFixed(1)
      });
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await deleteBooking(bookingId);
        toast.success('Booking deleted successfully');
        fetchBookings();
      } catch (error) {
        toast.error('Failed to delete booking');
      }
    }
  };

  const handleAddNew = () => {
    navigate('/seller/dashboard/bookings/add');
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading bookings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Services</div>
          <div className="stat-value">{stats.totalBookings}</div>
          <div className="stat-change">Active listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Appointments</div>
          <div className="stat-value">{stats.totalAppointments}</div>
          <div className="stat-change">Booked appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{stats.totalRevenue.toLocaleString()} MAD</div>
          <div className="stat-change">From bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Rating</div>
          <div className="stat-value">{stats.avgRating} ★</div>
          <div className="stat-change">Client satisfaction</div>
        </div>
      </div>

      <div className="bookings-card">
        <div className="card-header">
          <h3>Your Services</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            Add Service
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>No booking services yet</p>
            <button onClick={handleAddNew} className="btn btn-primary">
              Create Your First Service
            </button>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map(booking => (
              <div key={booking.id} className="booking-item">
                <div className="booking-info">
                  <div className="booking-image-placeholder">
                    {booking.image || '📅'}
                  </div>
                  <div className="booking-details">
                    <h4>{booking.title}</h4>
                    <div className="booking-stats">
                      <span>
                        <CalendarIcon className="stat-icon" />
                        {booking.appointments_count || 0} appointments
                      </span>
                      <span>{booking.price} MAD</span>
                      <span>{booking.duration || 60} min</span>
                    </div>
                  </div>
                </div>
                <div className="booking-actions">
                  <Link to={`/booking/${booking.id}`} className="action-btn" target="_blank">
                    <EyeIcon className="w-4 h-4" />
                  </Link>
                  <Link to={`/seller/dashboard/bookings/${booking.id}/edit`} className="action-btn">
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(booking.id)} className="action-btn delete">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
        .stat-change {
          font-size: 0.75rem;
          color: #10b981;
        }
        .bookings-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .card-header h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
        }
        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .bookings-list {
          padding: 0.5rem;
        }
        .booking-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .booking-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }
        .booking-image-placeholder {
          width: 60px;
          height: 60px;
          background: #f3f4f6;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .booking-details h4 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .booking-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
          flex-wrap: wrap;
        }
        .stat-icon {
          width: 0.875rem;
          height: 0.875rem;
          margin-right: 0.25rem;
        }
        .booking-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .action-btn {
          padding: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          border-radius: 0.5rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        .action-btn:hover {
          background: #f3f4f6;
        }
        .action-btn.delete:hover {
          color: #ef4444;
        }
        .btn-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .btn-primary {
          background: #1a1a1a;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default BookingsDashboard;
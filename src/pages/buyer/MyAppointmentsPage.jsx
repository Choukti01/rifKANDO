import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon, ClockIcon, MapPinIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { getMyAppointments } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const MyAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments();
    }
  }, [isAuthenticated]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await getMyAppointments();
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load your appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircleIcon className="status-icon" />;
      case 'cancelled':
        return <XCircleIcon className="status-icon" />;
      default:
        return <ClockIcon className="status-icon" />;
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading your appointments...</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="empty-state-container">
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h2>No appointments yet</h2>
          <p>You haven't booked any appointments yet</p>
          <Link to="/bookings" className="browse-btn">Browse Services</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="my-appointments-page">
      <div className="container">
        <div className="page-header">
          <h1>My Appointments</h1>
          <p>Manage your upcoming and past appointments</p>
        </div>

        <div className="appointments-list">
          {appointments.map(appointment => (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-icon">
                {appointment.image || ''}
              </div>
              <div className="appointment-info">
                <h3>{appointment.title}</h3>
                <p>with {appointment.provider_name}</p>
                <div className="appointment-details">
                  <div className="detail">
                    <CalendarIcon className="detail-icon" />
                    <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                  </div>
                  <div className="detail">
                    <ClockIcon className="detail-icon" />
                    <span>{appointment.appointment_time} ({appointment.duration} min)</span>
                  </div>
                  <div className="detail">
                    <MapPinIcon className="detail-icon" />
                    <span>Online</span>
                  </div>
                </div>
              </div>
              <div className="appointment-status" style={{ color: getStatusColor(appointment.status) }}>
                {getStatusIcon(appointment.status)}
                <span>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .my-appointments-page {
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
        }
        .appointments-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .appointment-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .appointment-card:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .appointment-icon {
          width: 60px;
          height: 60px;
          background: #f3f4f6;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .appointment-info {
          flex: 1;
        }
        .appointment-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .appointment-info p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .appointment-details {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .detail {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          color: #6b7280;
        }
        .detail-icon {
          width: 0.875rem;
          height: 0.875rem;
        }
        .appointment-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          font-weight: 500;
          min-width: 70px;
          text-align: center;
        }
        .status-icon {
          width: 1.25rem;
          height: 1.25rem;
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
        .browse-btn {
          display: inline-block;
          padding: 0.625rem 1.5rem;
          background: #1a1a1a;
          color: white;
          text-decoration: none;
          border-radius: 2rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default MyAppointmentsPage;
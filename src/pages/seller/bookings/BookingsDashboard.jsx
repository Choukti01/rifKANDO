import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getMyBookings, deleteBooking, getProviderAppointments, updateProviderAppointment } from '../../../services/api';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MarketplaceImage from '../../../components/common/MarketplaceImage';

const BookingsDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalBookings: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    avgRating: 0
  });

  useEffect(() => {
    let isCurrent = true;

    const loadBookings = async () => {
      try {
        const [response, appointmentResponse] = await Promise.all([getMyBookings(), getProviderAppointments()]);
        if (!isCurrent) return;

        const bookingsData = response.data.bookings || [];
        const totalAppointments = bookingsData.reduce((sum, booking) => sum + (booking.appointments_count || 0), 0);
        const totalRevenue = bookingsData.reduce((sum, booking) => sum + ((booking.price || 0) * (booking.appointments_count || 0)), 0);
        const avgRating = bookingsData.length > 0
          ? bookingsData.reduce((sum, booking) => sum + (booking.rating || 0), 0) / bookingsData.length
          : 0;

        setBookings(bookingsData);
        setAppointments(appointmentResponse.data.appointments || []);
        setStats({
          totalBookings: bookingsData.length,
          totalAppointments,
          totalRevenue,
          avgRating: avgRating.toFixed(1)
        });
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to fetch bookings:', error);
          toast.error('Failed to load bookings');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadBookings();

    return () => {
      isCurrent = false;
    };
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const [response, appointmentResponse] = await Promise.all([getMyBookings(), getProviderAppointments()]);
      const bookingsData = response.data.bookings || [];
      setBookings(bookingsData);
      setAppointments(appointmentResponse.data.appointments || []);
      
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

  const handleEndItem = async (id, type) => {
    if (window.confirm('Mark this booking service as ended? It will no longer appear in marketplace listings.')) {
      try {
        await api.patch(`/${type}/${id}/status`, { status: 'ended' });
        toast.success('Service marked as ended');
        fetchBookings();
      } catch {
        toast.error('Failed to update status');
      }
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking service?')) {
      try {
        await deleteBooking(bookingId);
        toast.success('Booking deleted successfully');
        fetchBookings();
      } catch {
        toast.error('Failed to delete booking');
      }
    }
  };

  const handleAddNew = () => {
    navigate('/seller/dashboard/bookings/add');
  };

  const handleAppointmentAction = async (appointmentId, action) => {
    const labels = { confirm: 'confirm', decline: 'decline', complete: 'mark as completed', no_show: 'mark as no-show', cancel: 'cancel' };
    const results = { confirm: 'Appointment confirmed.', decline: 'Appointment declined.', complete: 'Appointment marked as completed.', no_show: 'Appointment marked as no-show.', cancel: 'Appointment cancelled.' };
    if (!window.confirm(`Do you want to ${labels[action]} this appointment?`)) return;
    try {
      await updateProviderAppointment(appointmentId, action);
      toast.success(results[action]);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to update appointment');
    }
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
        <div className="stat-card"><div className="stat-label">Total Services</div><div className="stat-value">{stats.totalBookings}</div><div className="stat-change">Active listings</div></div>
        <div className="stat-card"><div className="stat-label">Total Appointments</div><div className="stat-value">{stats.totalAppointments}</div><div className="stat-change">Booked appointments</div></div>
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value">{stats.totalRevenue.toLocaleString()} MAD</div><div className="stat-change">From bookings</div></div>
        <div className="stat-card"><div className="stat-label">Average Rating</div><div className="stat-value">{stats.avgRating} ★</div><div className="stat-change">Client satisfaction</div></div>
      </div>

      <div className="bookings-card">
        <div className="card-header">
          <h3>Your Services</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm"><PlusIcon className="w-4 h-4" />Add Service</button>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"></div><p>No booking services yet</p><button onClick={handleAddNew} className="btn btn-primary">Create Your First Service</button></div>
        ) : (
          <div className="bookings-list">
            {bookings.map(booking => {
              const primaryImage = booking.media?.find(m => m.is_primary) || booking.media?.[0];
              return (
                <div key={booking.id} className="booking-item">
                  <div className="booking-info">
                    <div className="booking-image-placeholder">
                      {primaryImage ? (
                        <MarketplaceImage source={primaryImage.media_url} alt={booking.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} />
                      ) : (
                        booking.image || ''
                      )}
                    </div>
                    <div className="booking-details">
                      <h4>{booking.title}</h4>
                      <div className="booking-stats">
                        <span><CalendarIcon className="stat-icon" />{booking.appointments_count || 0} appointments</span>
                        <span>{booking.price} MAD</span>
                        <span>{booking.duration || 60} min</span>
                      </div>
                      <div className="booking-status">
                        <span className={`status-badge ${booking.status === 'published' ? 'published' : 'ended'}`}>
                          {booking.status === 'published' ? 'Active' : 'Ended'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="booking-actions">
                    <Link to={`/booking/${booking.id}`} className="action-btn view" title="View Booking" target="_blank"><EyeIcon className="w-4 h-4" /></Link>
                    <Link to={`/seller/dashboard/bookings/${booking.id}/edit`} className="action-btn edit" title="Edit Booking"><PencilIcon className="w-4 h-4" /></Link>
                    {booking.status !== 'ended' && (
                      <button onClick={() => handleEndItem(booking.id, 'bookings')} className="action-btn end" title="Mark as Ended">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(booking.id)} className="action-btn delete" title="Delete Permanently">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <section className="provider-appointments-card">
        <div className="card-header"><div><h3>Appointment schedule</h3><p>Confirm requests and keep clients informed.</p></div></div>
        {appointments.length === 0 ? <div className="provider-empty">No appointments yet. Your live schedule will appear here.</div> : <div className="provider-appointments-list">
          {appointments.map((appointment) => <article className="provider-appointment" key={appointment.id}>
            <div><h4>{appointment.title}</h4><p>{appointment.client_name} · {appointment.appointment_date} at {appointment.appointment_time} ({appointment.provider_timezone || 'Africa/Casablanca'})</p><small>{appointment.location_type === 'in_person' ? appointment.location || 'In person' : 'Online'} · {appointment.guest_count || 1} participant{Number(appointment.guest_count) === 1 ? '' : 's'}</small></div>
            <div className="provider-appointment-actions"><span className={`appointment-state ${appointment.status}`}>{appointment.status.replace('_', ' ')}</span>{appointment.status === 'pending' && <><button onClick={() => handleAppointmentAction(appointment.id, 'confirm')}>Confirm</button><button className="quiet" onClick={() => handleAppointmentAction(appointment.id, 'decline')}>Decline</button></>}{appointment.status === 'confirmed' && <><button onClick={() => handleAppointmentAction(appointment.id, 'complete')}>Complete</button><button className="quiet" onClick={() => handleAppointmentAction(appointment.id, 'no_show')}>No show</button><button className="quiet" onClick={() => handleAppointmentAction(appointment.id, 'cancel')}>Cancel</button></>}</div>
          </article>)}
        </div>}
      </section>

      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
        .stat-value { font-size: 1.75rem; font-weight: bold; margin-bottom: 0.25rem; }
        .stat-change { font-size: 0.75rem; color: #10b981; }
        .bookings-card { background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e5e7eb; }
        .card-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }
        .empty-state { text-align: center; padding: 3rem; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
        .bookings-list { padding: 0.5rem; }
        .booking-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; gap: 1rem; }
        .booking-info { display: flex; align-items: center; gap: 1rem; flex: 1; }
        .booking-image-placeholder { width: 60px; height: 60px; background: #f3f4f6; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; overflow: hidden; }
        .booking-details h4 { font-size: 1rem; margin-bottom: 0.5rem; }
        .booking-stats { display: flex; gap: 1rem; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .stat-icon { width: 0.875rem; height: 0.875rem; margin-right: 0.25rem; }
        .status-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
        .status-badge.published { background: #d1fae5; color: #065f46; }
        .status-badge.ended { background: #fee2e2; color: #991b1b; }
        .booking-actions { display: flex; gap: 0.5rem; align-items: center; }

        /* ========== MODERN ACTION BUTTONS ========== */
        .action-buttons, .product-actions, .course-actions, .service-actions, .digital-actions, .booking-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .action-btn {
          position: relative;
          padding: 0;
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .action-btn svg {
          width: 18px;
          height: 18px;
          transition: transform 0.2s ease;
          position: relative;
          z-index: 2;
        }

        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #f1f5f9;
          border-radius: 12px;
          transform: scale(0.8);
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 1;
        }

        .action-btn:hover::before {
          transform: scale(1);
          opacity: 1;
        }

        .action-btn:hover svg {
          transform: translateY(-2px);
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        /* View button (eye) - Sky Blue */
        .action-btn.view {
          color: #0ea5e9;
        }

        .action-btn.view::before {
          background: #e0f2fe;
        }

        /* Edit button (pencil) - Amber */
        .action-btn.edit {
          color: #f59e0b;
        }

        .action-btn.edit::before {
          background: #fef3c7;
        }

        /* End button (X) - Orange */
        .action-btn.end {
          color: #ea580c;
        }

        .action-btn.end::before {
          background: #ffedd5;
        }

        /* Delete button (trash) - Rose/Red */
        .action-btn.delete {
          color: #e11d48;
        }

        .action-btn.delete::before {
          background: #ffe4e6;
        }

        /* Tooltip on hover */
        .action-btn {
          position: relative;
        }

        .action-btn::after {
          content: attr(title);
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
          pointer-events: none;
          z-index: 10;
        }

        .action-btn:hover::after {
          opacity: 1;
          visibility: visible;
          bottom: -28px;
        }

        .btn-sm { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-primary { background: #1a1a1a; color: white; }
        .provider-appointments-card { margin-top: 2rem; background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .card-header p { margin: .25rem 0 0; color: #64748b; font-size: .8rem; }
        .provider-empty { padding: 1.5rem; color: #64748b; font-size: .9rem; }
        .provider-appointment { display:flex; justify-content:space-between; gap:1rem; padding:1rem 1.25rem; border-top:1px solid #e5e7eb; }
        .provider-appointment h4 { margin:0 0 .35rem; color:#15363f; }.provider-appointment p,.provider-appointment small{margin:0;color:#64748b;font-size:.8rem}.provider-appointment small{display:block;margin-top:.35rem}.provider-appointment-actions{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:.45rem}.provider-appointment-actions button{border:0;border-radius:.45rem;background:#216275;color:#fff;padding:.45rem .65rem;font-size:.75rem;cursor:pointer}.provider-appointment-actions button.quiet{background:#edf4f5;color:#216275}.appointment-state{text-transform:capitalize;font-size:.75rem;font-weight:700;border-radius:999px;padding:.3rem .55rem;background:#eaf0f2;color:#537078}.appointment-state.pending{background:#fff4d9;color:#935b00}.appointment-state.confirmed{background:#dff5ea;color:#13704d}.appointment-state.cancelled,.appointment-state.declined,.appointment-state.no_show{background:#fbe6e6;color:#a23838}@media(max-width:680px){.provider-appointment{display:block}.provider-appointment-actions{justify-content:flex-start;margin-top:.75rem}}
      `}</style>
    </div>
  );
};

export default BookingsDashboard;

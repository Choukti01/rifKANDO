import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cancelAppointment, getBookingAvailability, getMyAppointments, rescheduleAppointment } from '../../services/api';
import useAuth from '../../hooks/useAuth';

const statusLabel = (status) => status.replace('_', ' ');
const TODAY = new Date().toISOString().slice(0, 10);

const MyAppointmentsPage = () => {
  const { isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [reschedule, setReschedule] = useState(null);
  const loadAppointments = async () => {
    const response = await getMyAppointments();
    setAppointments(response.data.appointments || []);
  };

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let current = true;
    getMyAppointments()
      .then((response) => current && setAppointments(response.data.appointments || []))
      .catch(() => current && toast.error('Unable to load your appointments.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [isAuthenticated]);

  const cancel = async (appointment) => {
    if (!window.confirm(`Cancel your appointment for ${appointment.title}?`)) return;
    setCancelling(appointment.id);
    try {
      await cancelAppointment(appointment.id);
      await loadAppointments();
      toast.success('Appointment cancelled.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to cancel this appointment.');
    } finally { setCancelling(null); }
  };
  const openReschedule = (appointment) => setReschedule({ appointment, date: '', slots: [], selectedSlot: null, loading: false, saving: false });
  const loadRescheduleAvailability = async (appointment, date) => {
    if (!date) {
      setReschedule((current) => ({ ...current, date: '', slots: [], selectedSlot: null, loading: false }));
      return;
    }
    setReschedule((current) => ({ ...current, date, slots: [], selectedSlot: null, loading: true }));
    try {
      const response = await getBookingAvailability(appointment.booking_id, date);
      setReschedule((current) => current?.appointment.id === appointment.id ? { ...current, slots: response.data.availability.slots || [], loading: false } : current);
    } catch (error) {
      setReschedule((current) => current?.appointment.id === appointment.id ? { ...current, loading: false } : current);
      toast.error(error.response?.data?.error || 'Unable to load available times.');
    }
  };
  const saveReschedule = async () => {
    if (!reschedule?.selectedSlot) return;
    setReschedule((current) => ({ ...current, saving: true }));
    try {
      await rescheduleAppointment(reschedule.appointment.id, { appointment_date: reschedule.date, appointment_time: reschedule.selectedSlot.startTime });
      await loadAppointments();
      setReschedule(null);
      toast.success('Appointment rescheduled.');
    } catch (error) {
      setReschedule((current) => ({ ...current, saving: false }));
      toast.error(error.response?.data?.error || 'That time is no longer available.');
    }
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner" /><p>Loading your appointments...</p></div>;

  return <main className="my-appointments-page"><div className="container">
    <header className="appointments-header"><p>MY SCHEDULE</p><h1>Appointments</h1><span>Manage upcoming sessions and view your appointment history.</span></header>
    {appointments.length === 0 ? <section className="appointments-empty"><h2>No appointments yet</h2><p>When you reserve a provider's available time, it will appear here.</p><Link to="/bookings">Browse booking services</Link></section> : <section className="appointments-list">
      {appointments.map((appointment) => <article className="appointment-card" key={appointment.id}>
        <div className="appointment-date"><strong>{appointment.appointment_date}</strong><span>{appointment.provider_timezone || appointment.booking_timezone || 'Africa/Casablanca'}</span></div>
        <div className="appointment-main"><h2><Link to={`/booking/${appointment.booking_id}`}>{appointment.title}</Link></h2><p>with {appointment.provider_name}</p><div className="appointment-meta"><span><ClockIcon />{appointment.appointment_time} | {appointment.duration} min</span><span><MapPinIcon />{appointment.location_type === 'in_person' ? appointment.location || 'In person' : 'Online'}</span><span><CalendarIcon />{appointment.guest_count || 1} participant{Number(appointment.guest_count) === 1 ? '' : 's'}</span></div>{appointment.notes && <p className="appointment-notes">Your note: {appointment.notes}</p>}</div>
        <div className="appointment-actions"><span className={`appointment-status ${appointment.status}`}>{statusLabel(appointment.status)}</span>{['pending', 'confirmed'].includes(appointment.status) && <><button onClick={() => openReschedule(appointment)}>Reschedule</button><button onClick={() => cancel(appointment)} disabled={cancelling === appointment.id}>{cancelling === appointment.id ? 'Cancelling...' : 'Cancel appointment'}</button></>}</div>
        {reschedule?.appointment.id === appointment.id && <div className="reschedule-panel"><strong>Choose a new time</strong><input type="date" min={TODAY} value={reschedule.date} onChange={(event) => loadRescheduleAvailability(appointment, event.target.value)} />{reschedule.loading ? <span>Checking availability...</span> : reschedule.date && <div className="reschedule-slots">{reschedule.slots.length ? reschedule.slots.map((slot) => <button className={reschedule.selectedSlot?.startAt === slot.startAt ? 'selected' : ''} key={slot.startAt} onClick={() => setReschedule((current) => ({ ...current, selectedSlot: slot }))}>{slot.startTime}</button>) : <span>No available times for this date.</span>}</div>}<div><button className="reschedule-save" disabled={!reschedule.selectedSlot || reschedule.saving} onClick={saveReschedule}>{reschedule.saving ? 'Saving...' : 'Confirm new time'}</button><button onClick={() => setReschedule(null)}>Close</button></div></div>}
      </article>)}
    </section>}
    <style>{`
      .my-appointments-page{min-height:70vh;background:#f6fafb;padding:2.5rem 0 4rem}.appointments-header{text-align:center;margin:0 auto 2rem;max-width:600px}.appointments-header p{margin:0;color:#216275;font-size:.75rem;font-weight:800;letter-spacing:.12em}.appointments-header h1{margin:.35rem 0;font-size:2rem;color:#17363f}.appointments-header span{color:#607980}.appointments-list{max-width:960px;margin:0 auto;display:grid;gap:1rem}.appointment-card{display:grid;grid-template-columns:140px minmax(0,1fr) auto;gap:1rem;align-items:center;padding:1.2rem;background:#fff;border:1px solid #e0ecef;border-radius:1rem;box-shadow:0 8px 24px rgba(15,47,57,.05)}.appointment-date{display:grid;gap:.3rem;padding-right:1rem;border-right:1px solid #e3edef}.appointment-date strong{color:#17363f;font-size:.9rem}.appointment-date span{color:#638089;font-size:.72rem}.appointment-main h2{margin:0;font-size:1rem}.appointment-main h2 a{color:#163841;text-decoration:none}.appointment-main>p{margin:.3rem 0;color:#607980;font-size:.85rem}.appointment-meta{display:flex;flex-wrap:wrap;gap:.65rem;color:#58747c;font-size:.75rem}.appointment-meta span{display:flex;align-items:center;gap:.25rem}.appointment-meta svg{width:15px;color:#216275}.appointment-notes{margin:.65rem 0 0!important;padding:.5rem .65rem;background:#f6fafb;border-radius:.45rem;color:#5d747a!important;font-size:.75rem!important}.appointment-actions{display:grid;justify-items:end;gap:.65rem}.appointment-status{text-transform:capitalize;border-radius:999px;padding:.35rem .65rem;background:#eaf0f2;color:#607980;font-size:.75rem;font-weight:700}.appointment-status.pending{background:#fff3d7;color:#925e00}.appointment-status.confirmed{background:#dff5ea;color:#16704e}.appointment-status.cancelled,.appointment-status.declined,.appointment-status.no_show{background:#fbe6e6;color:#a33838}.appointment-actions button,.reschedule-panel button{border:1px solid #bcd4da;border-radius:.5rem;padding:.45rem .6rem;background:#fff;color:#216275;font-weight:700;font-size:.75rem;cursor:pointer}.reschedule-panel{grid-column:1/-1;display:grid;gap:.65rem;padding:.9rem;border-top:1px solid #e1ecef;background:#f7fbfc}.reschedule-panel>strong{color:#173b44;font-size:.85rem}.reschedule-panel input{max-width:220px;border:1px solid #cbdde1;border-radius:.45rem;padding:.45rem}.reschedule-slots{display:flex;flex-wrap:wrap;gap:.45rem}.reschedule-slots button.selected,.reschedule-save{background:#216275!important;color:#fff!important;border-color:#216275!important}.appointments-empty{margin:0 auto;max-width:540px;padding:2rem;text-align:center;background:#fff;border:1px solid #e0ecef;border-radius:1rem}.appointments-empty h2{color:#183841}.appointments-empty p{color:#607980}.appointments-empty a{display:inline-block;margin-top:.5rem;padding:.7rem 1rem;border-radius:.6rem;background:#216275;color:#fff;text-decoration:none;font-weight:700}@media(max-width:720px){.appointment-card{grid-template-columns:1fr}.appointment-date{border-right:0;border-bottom:1px solid #e3edef;padding:0 0 .75rem}.appointment-actions{justify-items:start}.my-appointments-page{padding-top:1.5rem}}
    `}</style>
  </div></main>;
};

export default MyAppointmentsPage;

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarIcon, CheckCircleIcon, ClockIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { bookAppointment, getBooking, getBookingAvailability } from '../../services/api';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import useAuth from '../../hooks/useAuth';

const TODAY = new Date().toISOString().slice(0, 10);
const MAX_SCHEDULING_DATE = (days) => new Date(new Date(`${TODAY}T12:00:00Z`).getTime() + (days * 86_400_000)).toISOString().slice(0, 10);
const idempotencyKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `booking-${TODAY}-${Math.random().toString(36).slice(2)}`);

const BookingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [booking, setBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availability, setAvailability] = useState({ slots: [], loading: false, reason: null });
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const requestKey = useRef(null);

  useEffect(() => {
    let current = true;
    getBooking(id).then((response) => current && setBooking(response.data.booking)).catch(() => {
      if (current) toast.error('Booking service could not be loaded.');
    });
    return () => { current = false; };
  }, [id]);

  useEffect(() => {
    if (!selectedDate || !booking) return undefined;
    let current = true;
    getBookingAvailability(booking.id, selectedDate).then((response) => {
      if (current) setAvailability({ ...response.data.availability, loading: false });
    }).catch((error) => {
      if (current) {
        setAvailability({ slots: [], loading: false, reason: null });
        toast.error(error.response?.data?.error || 'Unable to load available times.');
      }
    });
    return () => { current = false; };
  }, [booking, selectedDate]);

  const startBooking = () => {
    if (!isAuthenticated) { toast.error('Sign in to reserve a time.'); navigate('/login'); return; }
    setShowScheduler(true);
  };
  const submit = async () => {
    if (!selectedDate || !selectedSlot) { toast.error('Choose an available time first.'); return; }
    setSubmitting(true);
    try {
      const key = requestKey.current || idempotencyKey();
      requestKey.current = key;
      const response = await bookAppointment(booking.id, {
        appointment_date: selectedDate, appointment_time: selectedSlot.startTime, guest_count: Number(guestCount), notes, idempotency_key: key,
      });
      setCompleted(true);
      toast.success(response.data.appointment.status === 'pending' ? 'Booking request sent.' : 'Appointment confirmed.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'This time is no longer available. Choose another slot.');
      setSelectedSlot(null);
    } finally { setSubmitting(false); }
  };

  if (!booking) return <div className="container text-center py-16"><div className="spinner" /><p>Loading booking service...</p></div>;
  const primaryMedia = booking.media?.find((item) => item.is_primary) || booking.media?.[0];
  const maxDate = MAX_SCHEDULING_DATE(booking.booking_window_days || 60);
  const noSlotsText = availability.reason === 'outside_booking_window' ? 'Choose a date within the booking window.' : availability.reason === 'provider_unavailable' ? 'The provider is unavailable on this date.' : availability.reason === 'daily_limit_reached' ? 'This date is fully booked.' : 'No times are available for this date.';

  return <main className="booking-details-page"><div className="container">
    <nav className="booking-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/bookings">Bookings</Link><span>/</span><span>{booking.title}</span></nav>
    {completed && <section className="booking-success"><CheckCircleIcon /><div><h2>{booking.confirmation_mode === 'request' ? 'Request sent' : 'Appointment confirmed'}</h2><p>{booking.confirmation_mode === 'request' ? 'The provider will review your request. You can follow its status in My Appointments.' : 'Your reservation is saved. You can manage it in My Appointments.'}</p><Link className="booking-primary" to="/my-appointments">View my appointments</Link></div></section>}
    <div className="booking-layout"><section className="booking-content"><button className="booking-cover" type="button" onClick={() => primaryMedia && setShowGallery(true)} aria-label="View service media"><MarketplaceImage source={primaryMedia?.media_url} alt={booking.title} /></button><p className="booking-category">{booking.category || 'Appointment'}</p><h1>{booking.title}</h1><div className="booking-provider"><div>{booking.provider_name?.slice(0, 1) || 'P'}</div><p>Provided by <Link to={`/profile/${booking.provider_id}`}>{booking.provider_name || 'Service provider'}</Link></p></div><section className="booking-description"><h2>About this service</h2><p>{booking.description}</p></section><section className="booking-facts"><div><ClockIcon /><span><strong>{booking.duration} minutes</strong> per appointment</span></div><div><MapPinIcon /><span><strong>{booking.location_type === 'in_person' ? booking.location || 'In person' : 'Online'}</strong> {booking.location_type === 'in_person' ? '' : 'meeting'}</span></div><div><UserIcon /><span><strong>Up to {booking.max_participants || 1}</strong> participant{Number(booking.max_participants) === 1 ? '' : 's'}</span></div></section></section>
      <aside className="booking-panel"><div className="booking-price"><span>From</span><strong>{Number(booking.price || 0).toLocaleString()} MAD</strong><small>per appointment</small></div><div className="booking-policy"><CalendarIcon /><div><strong>{booking.confirmation_mode === 'request' ? 'Provider approval required' : 'Instant confirmation'}</strong><span>Times are shown in {booking.timezone || 'Africa/Casablanca'}.</span></div></div><div className="booking-policy"><ClockIcon /><div><strong>Cancellation policy</strong><span>Cancel at least {booking.cancellation_notice_hours ?? 24} hours before the appointment.</span></div></div>{!showScheduler && !completed && <button className="booking-primary booking-reserve" onClick={startBooking}>Choose an available time</button>}
        {showScheduler && !completed && <div className="booking-scheduler"><h2>Choose your time</h2><label>Date<input type="date" min={TODAY} max={maxDate} value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedSlot(null); setAvailability({ slots: [], loading: true, reason: null }); }} /></label>{selectedDate && <><p className="booking-timezone">Provider time zone: {availability.timeZone || booking.timezone}</p>{availability.loading ? <p>Checking availability...</p> : availability.slots.length ? <div className="booking-slots">{availability.slots.map((slot) => <button type="button" key={slot.startAt} className={selectedSlot?.startAt === slot.startAt ? 'selected' : ''} onClick={() => { setSelectedSlot(slot); setGuestCount((count) => Math.min(count, slot.remainingCapacity)); }}>{slot.startTime}<small>{slot.remainingCapacity} place{slot.remainingCapacity === 1 ? '' : 's'} left</small></button>)}</div> : <p className="booking-empty-slots">{noSlotsText}</p>}</>}{selectedSlot && <><label>Participants<input type="number" min="1" max={selectedSlot.remainingCapacity} value={guestCount} onChange={(event) => setGuestCount(Math.max(1, Math.min(selectedSlot.remainingCapacity, Number(event.target.value))))} /></label><label>Note for the provider <textarea maxLength="1000" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" /></label><button className="booking-primary" disabled={submitting} onClick={submit}>{submitting ? 'Reserving...' : booking.confirmation_mode === 'request' ? 'Send booking request' : 'Confirm appointment'}</button></>}</div>}</aside>
    </div>{showGallery && <MediaGallery media={(booking.media || []).map((item) => ({ url: item.media_url, type: item.media_type }))} onClose={() => setShowGallery(false)} />}
  </div><style>{`
    .booking-details-page{background:#f6fafb;padding:2rem 0 4rem;min-height:70vh}.booking-breadcrumb{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;font-size:.85rem;color:#5b727a}.booking-breadcrumb a{color:#216275;text-decoration:none}.booking-layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:2rem;align-items:start}.booking-content,.booking-panel,.booking-success{background:#fff;border:1px solid #e1ecef;border-radius:1.25rem;box-shadow:0 10px 25px rgba(16,47,58,.05)}.booking-content{padding:1.5rem}.booking-cover{height:300px;width:100%;padding:0;border:0;border-radius:.9rem;overflow:hidden;background:#eaf4f6;cursor:pointer}.booking-cover img{width:100%;height:100%;object-fit:cover}.booking-category{color:#216275;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:1.3rem 0 .35rem}.booking-content h1{margin:0;color:#122f38;font-size:2rem}.booking-provider{display:flex;align-items:center;gap:.65rem;margin:1rem 0;color:#597179}.booking-provider>div{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#dceff3;color:#216275;font-weight:800}.booking-provider p{margin:0}.booking-provider a{color:#216275;font-weight:700;text-decoration:none}.booking-description{border-top:1px solid #e7eff1;padding-top:1rem;color:#425b63;line-height:1.7}.booking-description h2{font-size:1.1rem;color:#15363f}.booking-facts{display:flex;flex-wrap:wrap;gap:1rem;margin-top:1.25rem}.booking-facts div{display:flex;gap:.5rem;align-items:center;font-size:.85rem;color:#547078}.booking-facts svg,.booking-policy svg{width:20px;color:#216275}.booking-panel{position:sticky;top:1rem;padding:1.35rem}.booking-price{display:flex;align-items:baseline;gap:.45rem;border-bottom:1px solid #e5eef0;padding-bottom:1rem;margin-bottom:1rem}.booking-price span,.booking-price small{color:#617b82;font-size:.8rem}.booking-price strong{font-size:1.5rem;color:#112f38}.booking-policy{display:flex;gap:.65rem;padding:.7rem 0;font-size:.8rem;color:#607980}.booking-policy div{display:grid;gap:.15rem}.booking-policy strong{color:#23424b}.booking-primary{display:inline-flex;justify-content:center;align-items:center;border:0;border-radius:.65rem;padding:.8rem 1rem;background:#216275;color:#fff;text-decoration:none;font-weight:700;cursor:pointer}.booking-primary:disabled{opacity:.65;cursor:wait}.booking-reserve{width:100%;margin-top:1rem}.booking-scheduler{display:grid;gap:.75rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid #e5eef0}.booking-scheduler h2{font-size:1.05rem;margin:0;color:#15363f}.booking-scheduler label{display:grid;gap:.35rem;color:#36555e;font-size:.82rem;font-weight:700}.booking-scheduler input,.booking-scheduler textarea{border:1px solid #c9dde1;border-radius:.55rem;padding:.65rem;font:inherit}.booking-scheduler textarea{min-height:75px;resize:vertical}.booking-timezone{margin:0;color:#607980;font-size:.75rem}.booking-slots{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem}.booking-slots button{display:grid;gap:.15rem;border:1px solid #cce0e5;border-radius:.55rem;padding:.55rem;background:#fff;color:#15363f;font-weight:700;cursor:pointer}.booking-slots button.selected{border-color:#216275;background:#e5f3f6;color:#154d5c}.booking-slots small{font-size:.68rem;font-weight:500;color:#5f777f}.booking-empty-slots{margin:0;border-radius:.5rem;padding:.65rem;background:#fff4e5;color:#8c5900;font-size:.82rem}.booking-success{display:flex;gap:1rem;padding:1.25rem;margin-bottom:1.5rem;background:#f3fbf8}.booking-success>svg{width:32px;color:#16845b;flex:none}.booking-success h2{margin:0 0 .25rem;color:#15583f;font-size:1.1rem}.booking-success p{margin:0 0 .75rem;color:#44645a;font-size:.9rem}@media(max-width:850px){.booking-layout{grid-template-columns:1fr}.booking-panel{position:static}}@media(max-width:560px){.booking-details-page{padding-top:1rem}.booking-content{padding:1rem}.booking-cover{height:210px}.booking-content h1{font-size:1.55rem}.booking-slots{grid-template-columns:1fr}.booking-success{align-items:flex-start}}
  `}</style></main>;
};

export default BookingDetailsPage;

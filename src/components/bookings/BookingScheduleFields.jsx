import { useMemo } from 'react';
import { BOOKING_DAYS, DEFAULT_BOOKING_SCHEDULE } from './bookingSchedule';

const TODAY = new Date().toISOString().slice(0, 10);

export default function BookingScheduleFields({ value, onChange }) {
  const schedule = useMemo(() => ({ ...DEFAULT_BOOKING_SCHEDULE, ...value }), [value]);
  const update = (patch) => onChange({ ...schedule, ...patch });
  const updateWindow = (day, index, key, nextValue) => {
    const windows = [...(schedule.availability[day] || [])];
    windows[index] = { ...windows[index], [key]: nextValue };
    update({ availability: { ...schedule.availability, [day]: windows } });
  };
  const removeWindow = (day, index) => update({ availability: { ...schedule.availability, [day]: schedule.availability[day].filter((_, i) => i !== index) } });
  const addWindow = (day) => update({ availability: { ...schedule.availability, [day]: [...(schedule.availability[day] || []), { start: '09:00', end: '17:00' }] } });
  const addBlockedDate = (event) => {
    const date = event.target.value;
    if (date && !schedule.unavailable_dates.includes(date)) update({ unavailable_dates: [...schedule.unavailable_dates, date] });
    event.target.value = '';
  };

  return <section className="booking-schedule-fields" aria-labelledby="schedule-title">
    <div className="booking-schedule-heading"><div><h3 id="schedule-title">Booking schedule</h3><p>Customers can only reserve times generated from these rules.</p></div><span>Provider controls</span></div>
    <div className="booking-schedule-grid">
      <label className="form-group"><span>Time zone</span><input className="form-input" list="booking-timezones" value={schedule.timezone} onChange={(e) => update({ timezone: e.target.value })} required /><datalist id="booking-timezones"><option value="Africa/Casablanca" /><option value="Europe/Paris" /><option value="Europe/Berlin" /><option value="UTC" /></datalist></label>
      <label className="form-group"><span>Confirmation</span><select className="form-input" value={schedule.confirmation_mode} onChange={(e) => update({ confirmation_mode: e.target.value })}><option value="instant">Confirm automatically</option><option value="request">Review each request</option></select></label>
      <label className="form-group"><span>Buffer between appointments</span><input className="form-input" type="number" min="0" max="1440" value={schedule.buffer_minutes} onChange={(e) => update({ buffer_minutes: e.target.value })} /><small>Minutes</small></label>
      <label className="form-group"><span>Minimum booking notice</span><input className="form-input" type="number" min="0" max="43200" value={schedule.minimum_notice_minutes} onChange={(e) => update({ minimum_notice_minutes: e.target.value })} /><small>Minutes</small></label>
      <label className="form-group"><span>How far ahead people can book</span><input className="form-input" type="number" min="1" max="730" value={schedule.booking_window_days} onChange={(e) => update({ booking_window_days: e.target.value })} /><small>Days</small></label>
      <label className="form-group"><span>Daily appointment limit</span><input className="form-input" type="number" min="1" max="1000" value={schedule.max_bookings_per_day} placeholder="No limit" onChange={(e) => update({ max_bookings_per_day: e.target.value })} /><small>Optional</small></label>
      <label className="form-group"><span>Cancellation notice</span><input className="form-input" type="number" min="0" max="720" value={schedule.cancellation_notice_hours} onChange={(e) => update({ cancellation_notice_hours: e.target.value })} /><small>Hours before appointment</small></label>
    </div>
    <div className="booking-availability"><h4>Weekly availability</h4>{BOOKING_DAYS.map(([key, label]) => <div className="booking-day" key={key}><strong>{label}</strong><div>{(schedule.availability[key] || []).map((window, index) => <div className="booking-window" key={`${key}-${index}`}><input aria-label={`${label} start`} type="time" value={window.start} onChange={(e) => updateWindow(key, index, 'start', e.target.value)} /><span>to</span><input aria-label={`${label} end`} type="time" value={window.end} onChange={(e) => updateWindow(key, index, 'end', e.target.value)} /><button type="button" onClick={() => removeWindow(key, index)} aria-label={`Remove ${label} window`}>Remove</button></div>)}</div><button className="booking-add-window" type="button" onClick={() => addWindow(key)}>Add time</button></div>)}</div>
    <div className="booking-blocked-dates"><h4>Unavailable dates</h4><p>Use this for holidays, travel, or fully booked dates.</p><input type="date" min={TODAY} onChange={addBlockedDate} /> <div>{schedule.unavailable_dates.map((date) => <button type="button" key={date} onClick={() => update({ unavailable_dates: schedule.unavailable_dates.filter((item) => item !== date) })}>{date} ×</button>)}</div></div>
    <style>{`
      .booking-schedule-fields{margin:1.75rem 0;padding:1.25rem;border:1px solid #d8e7eb;border-radius:1rem;background:#f7fbfc}.booking-schedule-heading{display:flex;justify-content:space-between;gap:1rem;margin-bottom:1rem}.booking-schedule-heading h3,.booking-availability h4,.booking-blocked-dates h4{margin:0;color:#102f3a}.booking-schedule-heading p,.booking-blocked-dates p{margin:.3rem 0 0;color:#54727b;font-size:.85rem}.booking-schedule-heading span{color:#216275;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.booking-schedule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem 1rem}.booking-schedule-grid .form-group{margin:0}.booking-schedule-grid small{display:block;margin-top:.25rem;color:#607980}.booking-availability,.booking-blocked-dates{margin-top:1.25rem;padding-top:1rem;border-top:1px solid #d8e7eb}.booking-day{display:grid;grid-template-columns:95px 1fr auto;gap:.6rem;align-items:start;padding:.5rem 0;border-bottom:1px solid #e4eef0}.booking-day strong{font-size:.85rem;padding-top:.45rem}.booking-window{display:flex;align-items:center;gap:.45rem;margin-bottom:.4rem}.booking-window input{min-width:0;border:1px solid #c5d7dc;border-radius:.45rem;padding:.4rem}.booking-window button,.booking-add-window,.booking-blocked-dates button{border:0;background:transparent;color:#216275;cursor:pointer;font-size:.8rem;font-weight:600}.booking-add-window{padding:.35rem .5rem;border:1px solid #bcd5dc;border-radius:.45rem;background:#fff}.booking-blocked-dates input{margin:.75rem 0;padding:.5rem;border:1px solid #c5d7dc;border-radius:.45rem}.booking-blocked-dates div{display:flex;flex-wrap:wrap;gap:.4rem}.booking-blocked-dates div button{padding:.35rem .5rem;border-radius:999px;background:#e5f2f5}@media(max-width:640px){.booking-schedule-grid{grid-template-columns:1fr}.booking-schedule-heading,.booking-day{display:block}.booking-day strong{display:block;margin-bottom:.45rem}.booking-add-window{margin-top:.25rem}.booking-window{flex-wrap:wrap}}
    `}</style>
  </section>;
}

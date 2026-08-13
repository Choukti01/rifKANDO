export const BOOKING_DAYS = [
  ['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'], ['thursday', 'Thursday'],
  ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday'],
];

export const DEFAULT_BOOKING_SCHEDULE = {
  timezone: 'Africa/Casablanca', confirmation_mode: 'instant', buffer_minutes: 15, minimum_notice_minutes: 120,
  booking_window_days: 60, max_bookings_per_day: '', cancellation_notice_hours: 24,
  availability: {
    monday: [{ start: '09:00', end: '17:00' }], tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }], thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '17:00' }], saturday: [], sunday: [],
  }, unavailable_dates: [],
};

const availabilityByDay = (availability) => {
  if (!Array.isArray(availability)) return availability || DEFAULT_BOOKING_SCHEDULE.availability;
  return availability.reduce((days, window) => {
    const key = BOOKING_DAYS[Number(window.weekday)]?.[0];
    if (key) days[key] = [...(days[key] || []), { start: window.start_time, end: window.end_time }];
    return days;
  }, BOOKING_DAYS.reduce((days, [key]) => ({ ...days, [key]: [] }), {}));
};

export const normalizeBookingSchedule = (schedule = {}) => ({
  timezone: schedule.timezone || DEFAULT_BOOKING_SCHEDULE.timezone,
  confirmation_mode: schedule.confirmation_mode === 'request' ? 'request' : 'instant',
  buffer_minutes: Number(schedule.buffer_minutes || 0),
  minimum_notice_minutes: Number(schedule.minimum_notice_minutes || 0),
  booking_window_days: Number(schedule.booking_window_days || 1),
  max_bookings_per_day: schedule.max_bookings_per_day === '' || schedule.max_bookings_per_day == null ? null : Number(schedule.max_bookings_per_day),
  cancellation_notice_hours: Number(schedule.cancellation_notice_hours || 0),
  availability: availabilityByDay(schedule.availability),
  unavailable_dates: [...new Set((schedule.unavailable_dates || []).filter(Boolean))],
});

export const bookingSchedulePayload = (schedule = {}) => {
  const normalized = normalizeBookingSchedule(schedule);
  return {
    ...normalized,
    availability: BOOKING_DAYS.flatMap(([key], weekday) => (normalized.availability[key] || []).map((window) => ({ weekday, start_time: window.start, end_time: window.end }))),
  };
};

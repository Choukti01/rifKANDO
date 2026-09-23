const MAX_MONEY = 10_000_000;
const MAX_ID = 2_147_483_647;
const storageService = require('../services/storageService');

class RequestValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'RequestValidationError';
    this.statusCode = 422;
    this.isOperational = true;
    this.code = 'VALIDATION_ERROR';
    this.fields = [{ field, message }];
  }
}

const fail = (field, message) => {
  throw new RequestValidationError(field, message);
};

const isPlainObject = (value) => Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const object = (value, field = 'body') => {
  if (!isPlainObject(value)) fail(field, 'must be a JSON object.');
  return value;
};

const onlyKeys = (value, allowed, field = 'body') => {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${field}.${key}`, 'is not allowed.');
  }
};

const text = (value, field, { min = 0, max, required = false, pattern } = {}) => {
  if (value === undefined || value === null) {
    if (required) fail(field, 'is required.');
    return undefined;
  }
  if (typeof value !== 'string') fail(field, 'must be a string.');
  const normalized = value.trim();
  if (required && !normalized) fail(field, 'is required.');
  if (normalized.length < min) fail(field, `must contain at least ${min} characters.`);
  if (max !== undefined && normalized.length > max) fail(field, `must not exceed ${max} characters.`);
  if (/[\u0000-\u001F\u007F]/.test(normalized)) fail(field, 'contains invalid control characters.');
  if (pattern && normalized && !pattern.test(normalized)) fail(field, 'has an invalid format.');
  return normalized;
};

const positiveId = (value, field) => {
  if (!/^[1-9]\d*$/.test(String(value))) fail(field, 'must be a positive numeric identifier.');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_ID) fail(field, 'is outside the supported range.');
  return parsed;
};

const integer = (value, field, { min = 0, max = MAX_ID } = {}) => {
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(field, `must be an integer between ${min} and ${max}.`);
  }
  return value;
};

const money = (value, field, { min = 0, max = MAX_MONEY } = {}) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(field, 'must be a finite number.');
  if (value < min || value > max) fail(field, `must be between ${min} and ${max}.`);
  const minorUnits = value * 100;
  if (Math.abs(minorUnits - Math.round(minorUnits)) > 1e-8) fail(field, 'must have no more than two decimal places.');
  return value;
};

const enumValue = (value, field, values) => {
  if (!values.includes(value)) fail(field, `must be one of: ${values.join(', ')}.`);
  return value;
};

const email = (value, field) => text(value, field, {
  required: true,
  max: 254,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
}).toLowerCase();

const optionalText = (value, field, max) => text(value, field, { max }) || '';

const validate = (validator) => (req, res, next) => {
  try {
    const result = validator(req) || {};
    if (result.body) req.body = result.body;
    if (result.params) Object.assign(req.params, result.params);
    if (result.query) Object.assign(req.query, result.query);
    return next();
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return res.status(422).json({
        error: 'Invalid request.',
        code: error.code,
        fields: error.fields,
        requestId: req.requestId,
      });
    }
    return next(error);
  }
};

const validateIdParams = (...names) => validate((req) => ({
  params: Object.fromEntries(names.map((name) => [name, positiveId(req.params[name], `params.${name}`)])),
}));

const validateCheckout = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['shippingAddress', 'paymentMethod', 'notes', 'items', 'total']);
  const address = object(body.shippingAddress, 'shippingAddress');
  onlyKeys(address, ['fullName', 'email', 'phone', 'address', 'city', 'postalCode'], 'shippingAddress');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 25) {
    fail('items', 'must contain between 1 and 25 items.');
  }

  const items = body.items.map((item, index) => {
    object(item, `items.${index}`);
    onlyKeys(item, ['id', 'quantity', 'title', 'price', 'type'], `items.${index}`);
    return {
      id: positiveId(item.id, `items.${index}.id`),
      quantity: integer(item.quantity, `items.${index}.quantity`, { min: 1, max: 1_000 }),
    };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    fail('items', 'must not contain duplicate product IDs.');
  }

  return {
    body: {
      shippingAddress: {
        fullName: text(address.fullName, 'shippingAddress.fullName', { required: true, min: 2, max: 120 }),
        email: email(address.email, 'shippingAddress.email'),
        phone: text(address.phone, 'shippingAddress.phone', { required: true, min: 5, max: 32, pattern: /^[+()\-\s\d]+$/ }),
        address: text(address.address, 'shippingAddress.address', { required: true, min: 5, max: 300 }),
        city: text(address.city, 'shippingAddress.city', { required: true, min: 2, max: 100 }),
        postalCode: optionalText(address.postalCode, 'shippingAddress.postalCode', 24),
      },
      // The backend must enforce the same focused launch policy as the UI.
      // CMI and wallet checkout remain implemented but cannot be selected by
      // a crafted browser request while COD is the only public payment method.
      paymentMethod: enumValue(body.paymentMethod, 'paymentMethod', ['cash']),
      notes: optionalText(body.notes, 'notes', 1_000),
      items,
      total: money(body.total, 'total', { min: 0.01 }),
    },
  };
});

const validateWithdrawal = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['amount', 'method', 'bankDetails']);
  const bankDetails = object(body.bankDetails, 'bankDetails');
  onlyKeys(bankDetails, ['bank', 'account_name', 'account_number', 'rib'], 'bankDetails');
  return {
    body: {
      amount: money(body.amount, 'amount', { min: 100 }),
      method: enumValue(body.method, 'method', ['bank_transfer']),
      bankDetails: {
        bank: text(bankDetails.bank, 'bankDetails.bank', { required: true, min: 2, max: 120 }),
        account_name: text(bankDetails.account_name, 'bankDetails.account_name', { required: true, min: 2, max: 120 }),
        account_number: text(bankDetails.account_number, 'bankDetails.account_number', { required: true, min: 4, max: 64 }),
        rib: optionalText(bankDetails.rib, 'bankDetails.rib', 64),
      },
    },
  };
});

const validateWithdrawalDecision = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['action', 'notes', 'providerReference']);
  const action = enumValue(body.action, 'action', ['approve', 'reject']);
  const providerReference = optionalText(body.providerReference, 'providerReference', 256);
  if (action === 'approve' && !providerReference) fail('providerReference', 'is required when approving a withdrawal.');
  return { body: { action, notes: optionalText(body.notes, 'notes', 1_000), providerReference } };
});

const validateRefundRequest = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['reason']);
  return { body: { reason: text(body.reason, 'reason', { required: true, min: 3, max: 1_000 }) } };
});

const validateRefundCompletion = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['providerReference', 'notes']);
  return {
    body: {
      providerReference: optionalText(body.providerReference, 'providerReference', 256),
      notes: optionalText(body.notes, 'notes', 1_000),
    },
  };
});

const validateOrderStatus = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['status']);
  return { body: { status: enumValue(body.status, 'status', ['processing', 'shipped', 'delivered', 'cancelled']) } };
});

const validateCodSellerAction = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['action', 'carrierName', 'trackingNumber', 'note']);
  const action = enumValue(body.action, 'action', ['confirm', 'request_handoff', 'dispatch', 'cancel']);
  const carrierName = optionalText(body.carrierName, 'carrierName', 120);
  const trackingNumber = optionalText(body.trackingNumber, 'trackingNumber', 128);
  if (action === 'dispatch') {
    if (!carrierName) fail('carrierName', 'is required when dispatching a COD order.');
    if (!trackingNumber) fail('trackingNumber', 'is required when dispatching a COD order.');
  }
  return { body: { action, carrierName, trackingNumber, note: optionalText(body.note, 'note', 1_000) } };
});

const validateCodPartnerPickup = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['carrierName', 'trackingNumber', 'note']);
  return {
    body: {
      carrierName: text(body.carrierName, 'carrierName', { required: true, min: 2, max: 120 }),
      trackingNumber: text(body.trackingNumber, 'trackingNumber', { required: true, min: 2, max: 128 }),
      note: optionalText(body.note, 'note', 1_000),
    },
  };
});

const validateCodCollection = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['carrierReference', 'collectedAmount', 'carrierDeliveryFee', 'carrierReturnFee', 'note']);
  return {
    body: {
      carrierReference: text(body.carrierReference, 'carrierReference', { required: true, min: 2, max: 256 }),
      collectedAmount: money(body.collectedAmount, 'collectedAmount', { min: 0.01 }),
      carrierDeliveryFee: body.carrierDeliveryFee === undefined
        ? 0
        : money(body.carrierDeliveryFee, 'carrierDeliveryFee', { min: 0 }),
      carrierReturnFee: body.carrierReturnFee === undefined
        ? 0
        : money(body.carrierReturnFee, 'carrierReturnFee', { min: 0 }),
      note: optionalText(body.note, 'note', 1_000),
    },
  };
});

const validateCodSettlement = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['settlementReference', 'remittedAmount', 'note']);
  return {
    body: {
      settlementReference: text(body.settlementReference, 'settlementReference', { required: true, min: 2, max: 256 }),
      remittedAmount: money(body.remittedAmount, 'remittedAmount', { min: 0 }),
      note: optionalText(body.note, 'note', 1_000),
    },
  };
});

const validateCodException = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['status', 'note']);
  return {
    body: {
      status: enumValue(body.status, 'status', ['refused', 'returned']),
      note: text(body.note, 'note', { required: true, min: 3, max: 1_000 }),
    },
  };
});

const validateCodCommissionPayment = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['paymentReference', 'note']);
  return {
    body: {
      paymentReference: text(body.paymentReference, 'paymentReference', { required: true, min: 2, max: 256 }),
      note: optionalText(body.note, 'note', 1_000),
    },
  };
});

const validateCodDeliveryConfirmation = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['note']);
  return { body: { note: optionalText(body.note, 'note', 1_000) } };
});

const validateCodSellerPayout = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['payoutReference', 'note']);
  return {
    body: {
      payoutReference: text(body.payoutReference, 'payoutReference', { required: true, min: 2, max: 256 }),
      note: optionalText(body.note, 'note', 1_000),
    },
  };
});

const validateCmiInitiation = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['orderId']);
  return { body: { orderId: positiveId(body.orderId, 'orderId') } };
});

const validateOffer = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['amount', 'message']);
  return {
    body: {
      amount: money(body.amount, 'amount', { min: 0.01 }),
      message: optionalText(body.message, 'message', 1_000),
    },
  };
});

const validateOfferResponse = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['action']);
  return { body: { action: enumValue(body.action, 'action', ['accept', 'reject']) } };
});

const validateCartItem = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['product_id', 'quantity']);
  return {
    body: {
      product_id: positiveId(body.product_id, 'product_id'),
      quantity: integer(body.quantity, 'quantity', { min: 1, max: 1_000 }),
    },
  };
});

const validateCartQuantity = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['quantity']);
  return { body: { quantity: integer(body.quantity, 'quantity', { min: 1, max: 1_000 }) } };
});

const optionalMoney = (value, field, options = {}) => {
  if (value === undefined || value === null || value === '') return undefined;
  return money(value, field, options);
};

const publicMedia = (value, field = 'media', maxItems = 10) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maxItems) fail(field, `must contain at most ${maxItems} uploaded images.`);
  return value.map((item, index) => {
    object(item, `${field}.${index}`);
    onlyKeys(item, ['url', 'type', 'order', 'isPrimary'], `${field}.${index}`);
    const url = text(item.url, `${field}.${index}.url`, { required: true, max: 2_048 });
    if (item.type !== 'image' || !storageService.publicKeyFromUrl(url)) {
      fail(`${field}.${index}`, 'must reference an uploaded public image.');
    }
    return { url, type: 'image' };
  });
};

const productPayload = (body, { partial }) => {
  object(body);
  onlyKeys(body, ['title', 'description', 'price', 'old_price', 'delivery_fee', 'category', 'stock', 'media', 'condition']);
  const required = !partial;
  const result = {
    title: text(body.title, 'title', { required, min: 2, max: 160 }),
    description: text(body.description, 'description', { required, min: 10, max: 5_000 }),
    price: required ? money(body.price, 'price', { min: 0.01 }) : optionalMoney(body.price, 'price', { min: 0.01 }),
    old_price: optionalMoney(body.old_price, 'old_price', { min: 0.01 }),
    delivery_fee: required ? money(body.delivery_fee, 'delivery_fee', { min: 0, max: 10_000 }) : optionalMoney(body.delivery_fee, 'delivery_fee', { min: 0, max: 10_000 }),
    category: text(body.category, 'category', { required, min: 2, max: 64 }),
    stock: body.stock === undefined ? undefined : integer(body.stock, 'stock', { min: 0, max: 1_000_000 }),
    media: publicMedia(body.media),
    // Keep this in sync with the storefront and seller listing forms.  The
    // public product state is `used_as_new`, not the legacy `used` value.
    condition: body.condition === undefined ? undefined : enumValue(body.condition, 'condition', ['new', 'used_as_new', 'joutiya']),
  };
  if (required && result.stock === undefined) fail('stock', 'is required.');
  if (required && result.condition === undefined) fail('condition', 'is required.');
  if (result.old_price !== undefined && result.price !== undefined && result.old_price < result.price) {
    fail('old_price', 'must not be lower than price.');
  }
  const sanitized = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  if (partial && Object.keys(sanitized).length === 0) fail('body', 'must include at least one editable field.');
  return sanitized;
};

const validateProductCreate = validate((req) => ({ body: productPayload(req.body, { partial: false }) }));
const validateProductUpdate = validate((req) => ({ body: productPayload(req.body, { partial: true }) }));

const optionalInteger = (value, field, options) => (value === undefined || value === null || value === '')
  ? undefined
  : integer(value, field, options);

const jsonTextList = (value, field, { maxItems = 50, itemMax = 300 } = {}) => {
  if (value === undefined || value === null || value === '') return undefined;
  let parsed;
  try {
    parsed = Array.isArray(value) ? value : JSON.parse(value);
  } catch (_) {
    fail(field, 'must be a JSON array.');
  }
  if (!Array.isArray(parsed) || parsed.length > maxItems) fail(field, `must contain at most ${maxItems} entries.`);
  return JSON.stringify(parsed.map((item, index) => text(item, `${field}.${index}`, { required: true, max: itemMax })));
};

const catalogPayload = (body, { partial, fields, allowed }) => {
  object(body);
  onlyKeys(body, ['title', 'description', 'price', 'old_price', 'category', 'media', ...allowed]);
  const required = !partial;
  const result = {
    title: text(body.title, 'title', { required, min: 2, max: 160 }),
    description: text(body.description, 'description', { required, min: 10, max: 5_000 }),
    price: required ? money(body.price, 'price', { min: 0.01 }) : optionalMoney(body.price, 'price', { min: 0.01 }),
    old_price: optionalMoney(body.old_price, 'old_price', { min: 0.01 }),
    category: text(body.category, 'category', { required, min: 2, max: 64 }),
    media: publicMedia(body.media),
    ...fields(body, required),
  };
  if (result.old_price !== undefined && result.price !== undefined && result.old_price < result.price) {
    fail('old_price', 'must not be lower than price.');
  }
  const sanitized = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  if (partial && Object.keys(sanitized).length === 0) fail('body', 'must include at least one editable field.');
  return sanitized;
};

const coursePayload = (body, partial) => catalogPayload(body, {
  partial,
  allowed: ['level', 'duration', 'what_you_learn'],
  fields: (value, required) => ({
    level: value.level === undefined ? (required ? enumValue(value.level, 'level', ['beginner', 'intermediate', 'advanced']) : undefined) : enumValue(value.level, 'level', ['beginner', 'intermediate', 'advanced']),
    duration: value.duration === undefined ? (required ? 0 : undefined) : integer(value.duration, 'duration', { min: 0, max: 10_000 }),
    what_you_learn: jsonTextList(value.what_you_learn, 'what_you_learn', { maxItems: 50, itemMax: 300 }) || (required ? '[]' : undefined),
  }),
});

const servicePayload = (body, partial) => catalogPayload(body, {
  partial,
  allowed: ['delivery_time', 'revisions', 'image'],
  fields: (value, required) => ({
    delivery_time: value.delivery_time === undefined ? (required ? '' : undefined) : text(value.delivery_time, 'delivery_time', { max: 100 }),
    revisions: value.revisions === undefined ? (required ? 0 : undefined) : integer(value.revisions, 'revisions', { min: 0, max: 100 }),
    image: value.image === undefined ? (required ? '' : undefined) : text(value.image, 'image', { max: 64 }),
  }),
});

const bookingPayload = (body, partial) => catalogPayload(body, {
  partial,
  allowed: [
    'duration', 'location_type', 'location', 'max_participants', 'available_days', 'image',
    'timezone', 'availability', 'unavailable_dates', 'buffer_minutes', 'minimum_notice_minutes',
    'booking_window_days', 'max_bookings_per_day', 'cancellation_notice_hours', 'confirmation_mode',
  ],
  fields: (value, required) => {
    const locationType = value.location_type === undefined
      ? (required ? 'online' : undefined)
      : enumValue(value.location_type, 'location_type', ['online', 'in_person']);
    const location = value.location === undefined
      ? (required ? '' : undefined)
      : text(value.location, 'location', { max: 300 });
    if (locationType === 'in_person' && required && (!location || location.length < 4)) {
      fail('location', 'is required for an in-person booking.');
    }
    return {
      duration: value.duration === undefined ? (required ? 60 : undefined) : integer(value.duration, 'duration', { min: 5, max: 1_440 }),
      location_type: locationType,
      location,
      max_participants: value.max_participants === undefined ? (required ? 1 : undefined) : integer(value.max_participants, 'max_participants', { min: 1, max: 10_000 }),
      available_days: jsonTextList(value.available_days, 'available_days', { maxItems: 31, itemMax: 20 }) || (required ? '[]' : undefined),
      image: value.image === undefined ? (required ? '' : undefined) : text(value.image, 'image', { max: 64 }),
      timezone: value.timezone === undefined ? (required ? 'Africa/Casablanca' : undefined) : bookingTimeZone(value.timezone),
      availability: value.availability === undefined ? (required ? defaultBookingAvailability() : undefined) : bookingAvailability(value.availability),
      unavailable_dates: value.unavailable_dates === undefined ? (required ? [] : undefined) : bookingUnavailableDates(value.unavailable_dates),
      buffer_minutes: value.buffer_minutes === undefined ? (required ? 0 : undefined) : integer(value.buffer_minutes, 'buffer_minutes', { min: 0, max: 240 }),
      minimum_notice_minutes: value.minimum_notice_minutes === undefined ? (required ? 60 : undefined) : integer(value.minimum_notice_minutes, 'minimum_notice_minutes', { min: 0, max: 43_200 }),
      booking_window_days: value.booking_window_days === undefined ? (required ? 60 : undefined) : integer(value.booking_window_days, 'booking_window_days', { min: 1, max: 365 }),
      max_bookings_per_day: value.max_bookings_per_day === undefined
        ? (required ? null : undefined)
        : (value.max_bookings_per_day === null ? null : integer(value.max_bookings_per_day, 'max_bookings_per_day', { min: 1, max: 10_000 })),
      cancellation_notice_hours: value.cancellation_notice_hours === undefined ? (required ? 24 : undefined) : integer(value.cancellation_notice_hours, 'cancellation_notice_hours', { min: 0, max: 720 }),
      confirmation_mode: value.confirmation_mode === undefined ? (required ? 'instant' : undefined) : enumValue(value.confirmation_mode, 'confirmation_mode', ['instant', 'request']),
    };
  },
});

const bookingTimeZone = (value) => {
  const timeZone = text(value, 'timezone', { required: true, max: 64 });
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format();
  } catch (_) {
    fail('timezone', 'must be a valid IANA time zone.');
  }
  return timeZone;
};

const bookingClockTime = (value, field) => text(value, field, { required: true, pattern: /^([01]\d|2[0-3]):[0-5]\d$/ });

const bookingDate = (value, field) => {
  const date = text(value, field, { required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ });
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail(field, 'must be a valid date.');
  return date;
};

const defaultBookingAvailability = () => [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: '09:00', end_time: '17:00' }));

const bookingAvailability = (value) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 28) {
    fail('availability', 'must contain between 1 and 28 weekly availability windows.');
  }
  const windows = value.map((window, index) => {
    object(window, `availability.${index}`);
    onlyKeys(window, ['weekday', 'start_time', 'end_time'], `availability.${index}`);
    const startTime = bookingClockTime(window.start_time, `availability.${index}.start_time`);
    const endTime = bookingClockTime(window.end_time, `availability.${index}.end_time`);
    if (endTime <= startTime) fail(`availability.${index}.end_time`, 'must be after start_time.');
    return {
      weekday: integer(window.weekday, `availability.${index}.weekday`, { min: 0, max: 6 }),
      start_time: startTime,
      end_time: endTime,
    };
  });
  const ordered = [...windows].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.weekday === current.weekday && previous.end_time > current.start_time) {
      fail('availability', 'weekly availability windows cannot overlap.');
    }
  }
  return ordered;
};

const bookingUnavailableDates = (value) => {
  if (!Array.isArray(value) || value.length > 90) fail('unavailable_dates', 'must contain at most 90 blocked dates.');
  const dates = value.map((date, index) => bookingDate(date, `unavailable_dates.${index}`));
  if (new Set(dates).size !== dates.length) fail('unavailable_dates', 'must not contain duplicate dates.');
  return dates.sort();
};

const digitalPayload = (body, partial) => catalogPayload(body, {
  partial,
  allowed: ['file_type', 'file_url', 'upload_receipt', 'download_limit', 'image'],
  fields: (value, required) => {
    const fileUrl = value.file_url === undefined ? undefined : text(value.file_url, 'file_url', { required: true, max: 1_024 });
    if (fileUrl && !storageService.keyFromReference(fileUrl, 'private')) fail('file_url', 'must reference an uploaded private file.');
    if (required && !fileUrl) fail('file_url', 'is required.');
    const uploadReceipt = value.upload_receipt === undefined
      ? undefined
      : text(value.upload_receipt, 'upload_receipt', { required: true, min: 32, max: 4_096, pattern: /^[A-Za-z0-9._-]+$/ });
    if (fileUrl && !uploadReceipt) fail('upload_receipt', 'is required when adding or replacing a file.');
    if (uploadReceipt && !fileUrl) fail('file_url', 'is required when providing an upload receipt.');
    return {
      file_type: value.file_type === undefined ? undefined : enumValue(value.file_type, 'file_type', ['file']),
      file_url: fileUrl,
      upload_receipt: uploadReceipt,
      download_limit: optionalInteger(value.download_limit, 'download_limit', { min: 0, max: 10_000 }),
      image: value.image === undefined ? (required ? '' : undefined) : text(value.image, 'image', { max: 64 }),
    };
  },
});

const validateCourseCreate = validate((req) => ({ body: coursePayload(req.body, false) }));
const validateCourseUpdate = validate((req) => ({ body: coursePayload(req.body, true) }));
const validateServiceCreate = validate((req) => ({ body: servicePayload(req.body, false) }));
const validateServiceUpdate = validate((req) => ({ body: servicePayload(req.body, true) }));
const validateBookingCreate = validate((req) => ({ body: bookingPayload(req.body, false) }));
const validateBookingUpdate = validate((req) => ({ body: bookingPayload(req.body, true) }));
const validateBookingStatus = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['status']);
  return { body: { status: enumValue(body.status, 'status', ['published', 'paused', 'ended']) } };
});
const validateBookingAvailabilityQuery = validate((req) => {
  const query = req.query || {};
  onlyKeys(query, ['date']);
  return { query: { date: bookingDate(query.date, 'query.date') } };
});
const validateAppointmentCreate = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['appointment_date', 'appointment_time', 'guest_count', 'notes', 'idempotency_key']);
  return {
    body: {
      appointment_date: bookingDate(body.appointment_date, 'appointment_date'),
      appointment_time: bookingClockTime(body.appointment_time, 'appointment_time'),
      guest_count: body.guest_count === undefined ? 1 : integer(body.guest_count, 'guest_count', { min: 1, max: 10_000 }),
      notes: optionalText(body.notes, 'notes', 1_000),
      idempotency_key: body.idempotency_key === undefined || body.idempotency_key === ''
        ? ''
        : text(body.idempotency_key, 'idempotency_key', { min: 16, max: 128, pattern: /^[A-Za-z0-9:_-]+$/ }),
    },
  };
});
const validateAppointmentCancellation = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['reason']);
  return { body: { reason: optionalText(body.reason, 'reason', 1_000) } };
});
const validateAppointmentReschedule = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['appointment_date', 'appointment_time']);
  return {
    body: {
      appointment_date: bookingDate(body.appointment_date, 'appointment_date'),
      appointment_time: bookingClockTime(body.appointment_time, 'appointment_time'),
    },
  };
});
const validateAppointmentProviderAction = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['action', 'reason']);
  return {
    body: {
      action: enumValue(body.action, 'action', ['confirm', 'decline', 'complete', 'no_show', 'cancel']),
      reason: optionalText(body.reason, 'reason', 1_000),
    },
  };
});
const validateDigitalCreate = validate((req) => ({ body: digitalPayload(req.body, false) }));
const validateDigitalUpdate = validate((req) => ({ body: digitalPayload(req.body, true) }));
const validateDigitalAccessRequest = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['message']);
  return { body: { message: optionalText(body.message, 'message', 1_000) } };
});
const validateDigitalAccessDecision = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['action', 'reason']);
  return {
    body: {
      action: enumValue(body.action, 'action', ['grant', 'decline']),
      reason: optionalText(body.reason, 'reason', 1_000),
    },
  };
});

const finditRequestPayload = (body) => {
  object(body);
  onlyKeys(body, ['title', 'description', 'category', 'city', 'preferred_condition', 'budget_max', 'expires_in_days', 'media']);
  return {
    title: text(body.title, 'title', { required: true, min: 3, max: 160 }),
    description: text(body.description, 'description', { required: true, min: 10, max: 2_000 }),
    category: text(body.category, 'category', { required: true, min: 2, max: 64 }),
    city: text(body.city, 'city', { required: true, min: 2, max: 100 }),
    preferred_condition: enumValue(body.preferred_condition, 'preferred_condition', ['any', 'new', 'used']),
    budget_max: money(body.budget_max, 'budget_max', { min: 0, max: MAX_MONEY }),
    expires_in_days: integer(body.expires_in_days, 'expires_in_days', { min: 1, max: 14 }),
    media: publicMedia(body.media || [], 'media', 3),
  };
};

const finditOfferPayload = (body, partial) => {
  object(body);
  onlyKeys(body, ['title', 'description', 'price', 'delivery_fee', 'condition', 'estimated_delivery_days']);
  const result = {
    title: body.title === undefined ? undefined : text(body.title, 'title', { required: true, min: 3, max: 160 }),
    description: body.description === undefined ? undefined : text(body.description, 'description', { required: true, min: 10, max: 2_000 }),
    price: body.price === undefined ? undefined : money(body.price, 'price', { min: 0.01 }),
    delivery_fee: body.delivery_fee === undefined ? undefined : money(body.delivery_fee, 'delivery_fee', { min: 0 }),
    condition: body.condition === undefined ? undefined : enumValue(body.condition, 'condition', ['new', 'used', 'refurbished']),
    estimated_delivery_days: body.estimated_delivery_days === undefined ? undefined : integer(body.estimated_delivery_days, 'estimated_delivery_days', { min: 1, max: 60 }),
  };
  if (!partial) {
    for (const [field, value] of Object.entries(result)) {
      if (value === undefined) fail(field, 'is required.');
    }
  }
  const sanitized = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  if (partial && Object.keys(sanitized).length === 0) fail('body', 'must include at least one editable field.');
  return sanitized;
};

const shippingAddressPayload = (value, field = 'shippingAddress') => {
  const address = object(value, field);
  onlyKeys(address, ['fullName', 'email', 'phone', 'address', 'city', 'postalCode'], field);
  return {
    fullName: text(address.fullName, `${field}.fullName`, { required: true, min: 2, max: 120 }),
    email: email(address.email, `${field}.email`),
    phone: text(address.phone, `${field}.phone`, { required: true, min: 5, max: 32, pattern: /^[+()\-\s\d]+$/ }),
    address: text(address.address, `${field}.address`, { required: true, min: 5, max: 300 }),
    city: text(address.city, `${field}.city`, { required: true, min: 2, max: 100 }),
    postalCode: optionalText(address.postalCode, `${field}.postalCode`, 24),
  };
};

const validateFinditRequestCreate = validate((req) => ({ body: finditRequestPayload(req.body) }));
const validateFinditOfferCreate = validate((req) => ({ body: finditOfferPayload(req.body, false) }));
const validateFinditOfferUpdate = validate((req) => ({ body: finditOfferPayload(req.body, true) }));
const validateFinditCheckout = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['shippingAddress', 'notes']);
  return {
    body: {
      shippingAddress: shippingAddressPayload(body.shippingAddress),
      notes: optionalText(body.notes, 'notes', 1_000),
    },
  };
});

const lessonPayload = (body, partial) => {
  object(body);
  onlyKeys(body, ['title', 'description', 'duration', 'order', 'is_preview', 'video_url']);
  const required = !partial;
  const result = {
    title: text(body.title, 'title', { required, min: 2, max: 200 }),
    description: body.description === undefined ? (required ? '' : undefined) : text(body.description, 'description', { max: 5_000 }),
    duration: body.duration === undefined ? (required ? 0 : undefined) : integer(body.duration, 'duration', { min: 0, max: 1_440 }),
    order: body.order === undefined ? (required ? 0 : undefined) : integer(body.order, 'order', { min: 0, max: 10_000 }),
    is_preview: body.is_preview === undefined ? (required ? false : undefined) : (() => {
      if (typeof body.is_preview !== 'boolean') fail('is_preview', 'must be a boolean.');
      return body.is_preview;
    })(),
    video_url: body.video_url === undefined ? undefined : text(body.video_url, 'video_url', { max: 2_048 }),
  };
  const sanitized = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  if (partial && Object.keys(sanitized).length === 0) fail('body', 'must include at least one editable field.');
  return sanitized;
};

const validateLessonCreate = validate((req) => ({ body: lessonPayload(req.body, false) }));
const validateLessonUpdate = validate((req) => ({ body: lessonPayload(req.body, true) }));
const validateLessonProgress = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['completed']);
  if (typeof body.completed !== 'boolean') fail('completed', 'must be a boolean.');
  return { body: { completed: body.completed } };
});

const packagePayload = (body, partial) => {
  object(body);
  onlyKeys(body, ['name', 'price', 'delivery_time', 'revisions', 'features']);
  const required = !partial;
  const result = {
    name: text(body.name, 'name', { required, min: 2, max: 120 }),
    price: required ? money(body.price, 'price', { min: 0.01 }) : optionalMoney(body.price, 'price', { min: 0.01 }),
    delivery_time: body.delivery_time === undefined ? (required ? '' : undefined) : text(body.delivery_time, 'delivery_time', { max: 100 }),
    revisions: body.revisions === undefined ? (required ? 0 : undefined) : integer(body.revisions, 'revisions', { min: 0, max: 100 }),
    features: body.features === undefined ? (required ? '' : undefined) : text(body.features, 'features', { max: 5_000 }),
  };
  const sanitized = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  if (partial && Object.keys(sanitized).length === 0) fail('body', 'must include at least one editable field.');
  return sanitized;
};

const validatePackageCreate = validate((req) => ({ body: packagePayload(req.body, false) }));
const validatePackageUpdate = validate((req) => ({ body: packagePayload(req.body, true) }));

const validateProfileUpdate = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['name', 'phone', 'bio', 'city', 'country']);
  const result = {
    name: body.name === undefined ? undefined : text(body.name, 'name', { min: 2, max: 120 }),
    phone: body.phone === undefined ? undefined : text(body.phone, 'phone', { max: 32, pattern: /^[+()\-\s\d]*$/ }),
    bio: body.bio === undefined ? undefined : text(body.bio, 'bio', { max: 2_000 }),
    city: body.city === undefined ? undefined : text(body.city, 'city', { min: 2, max: 100 }),
    country: body.country === undefined ? undefined : text(body.country, 'country', { min: 2, max: 100 }),
  };
  const sanitized = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  if (Object.keys(sanitized).length === 0) fail('body', 'must include at least one editable field.');
  return { body: sanitized };
});

const validatePasswordChange = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['currentPassword', 'newPassword']);
  const currentPassword = text(body.currentPassword, 'currentPassword', { required: true, min: 1, max: 256 });
  const newPassword = text(body.newPassword, 'newPassword', { required: true, min: 12, max: 256 });
  if (currentPassword === newPassword) fail('newPassword', 'must be different from the current password.');
  return { body: { currentPassword, newPassword } };
});

const validateSellerType = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['sellerType']);
  // New sellers can only enter the operational Products + COD workspace. The
  // other seller models remain retained for their later rollout.
  return { body: { sellerType: enumValue(body.sellerType, 'sellerType', ['product']) } };
});

const validateProductReview = validate((req) => {
  const body = object(req.body);
  onlyKeys(body, ['rating', 'comment']);
  return {
    body: {
      rating: integer(body.rating, 'rating', { min: 1, max: 5 }),
      comment: optionalText(body.comment, 'comment', 2_000),
    },
  };
});

const validateProductQuery = validate((req) => {
  const query = req.query || {};
  const parseQueryInteger = (name, fallback, min, max) => {
    if (query[name] === undefined || query[name] === '') return fallback;
    if (!/^[1-9]\d*$/.test(String(query[name]))) fail(`query.${name}`, 'must be a positive integer.');
    const value = Number(query[name]);
    if (value < min || value > max) fail(`query.${name}`, `must be between ${min} and ${max}.`);
    return value;
  };
  const parseQueryMoney = (name) => {
    if (query[name] === undefined || query[name] === '') return undefined;
    const value = Number(query[name]);
    return money(value, `query.${name}`);
  };
  const minPrice = parseQueryMoney('minPrice');
  const maxPrice = parseQueryMoney('maxPrice');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    fail('query.minPrice', 'must not exceed maxPrice.');
  }
  return {
    query: {
      page: parseQueryInteger('page', 1, 1, 100_000),
      limit: parseQueryInteger('limit', 20, 1, 100),
      search: optionalText(query.search, 'query.search', 120),
      category: optionalText(query.category, 'query.category', 64),
      minPrice,
      maxPrice,
      minRating: query.minRating === undefined || query.minRating === '' ? undefined : money(Number(query.minRating), 'query.minRating', { min: 0, max: 5 }),
      sortBy: query.sortBy === undefined || query.sortBy === '' ? 'newest' : enumValue(query.sortBy, 'query.sortBy', ['newest', 'price_asc', 'price_desc', 'rating', 'popular']),
      condition: query.condition === undefined || query.condition === '' ? '' : enumValue(query.condition, 'query.condition', ['new', 'used_as_new', 'joutiya']),
    },
  };
});

module.exports = {
  RequestValidationError,
  validateIdParams,
  validateCheckout,
  validateWithdrawal,
  validateWithdrawalDecision,
  validateRefundRequest,
  validateRefundCompletion,
  validateOrderStatus,
  validateCodSellerAction,
  validateCodPartnerPickup,
  validateCodCollection,
  validateCodSettlement,
  validateCodException,
  validateCodCommissionPayment,
  validateCodDeliveryConfirmation,
  validateCodSellerPayout,
  validateCmiInitiation,
  validateOffer,
  validateOfferResponse,
  validateCartItem,
  validateCartQuantity,
  validateProductCreate,
  validateProductUpdate,
  validateProfileUpdate,
  validatePasswordChange,
  validateSellerType,
  validateProductReview,
  validateCourseCreate,
  validateCourseUpdate,
  validateServiceCreate,
  validateServiceUpdate,
  validateBookingCreate,
  validateBookingUpdate,
  validateBookingStatus,
  validateBookingAvailabilityQuery,
  validateAppointmentCreate,
  validateAppointmentCancellation,
  validateAppointmentReschedule,
  validateAppointmentProviderAction,
  validateDigitalCreate,
  validateDigitalUpdate,
  validateDigitalAccessRequest,
  validateDigitalAccessDecision,
  validateFinditRequestCreate,
  validateFinditOfferCreate,
  validateFinditOfferUpdate,
  validateFinditCheckout,
  validateLessonCreate,
  validateLessonUpdate,
  validateLessonProgress,
  validatePackageCreate,
  validatePackageUpdate,
  validateProductQuery,
};

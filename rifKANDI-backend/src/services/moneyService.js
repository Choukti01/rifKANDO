const MINOR_UNITS_PER_MAD = 100;
const MAX_MINOR_UNITS = 1_000_000_000;

const assertMinor = (value, { allowZero = false, allowNegative = false } = {}) => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > MAX_MINOR_UNITS) {
    throw new Error('Invalid monetary amount.');
  }
  if (
    (!allowNegative && !allowZero && amount <= 0) ||
    (!allowNegative && allowZero && amount < 0) ||
    (allowNegative && !allowZero && amount === 0)
  ) {
    throw new Error('Amount must be greater than zero.');
  }
  return amount;
};

const toMinor = (value, options = {}) => {
  // Browser arithmetic can turn a valid amount such as 0.30 into
  // 0.30000000000000004. Normalize that transport artifact once at the API
  // boundary; all persisted and calculated values remain integers afterwards.
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid monetary amount.');
    const minor = Math.round(value * MINOR_UNITS_PER_MAD);
    if (Math.abs(value - (minor / MINOR_UNITS_PER_MAD)) > 1e-9) {
      throw new Error('Monetary amounts must have no more than two decimal places.');
    }
    return assertMinor(minor, options);
  }
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Monetary amounts must have no more than two decimal places.');
  }

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholePart, decimalPart = ''] = unsigned.split('.');
  const whole = Number(wholePart);
  const fractional = Number(decimalPart.padEnd(2, '0'));
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fractional)) {
    throw new Error('Invalid monetary amount.');
  }
  const minor = whole * MINOR_UNITS_PER_MAD + fractional;
  return assertMinor(negative ? -minor : minor, options);
};

const fromMinor = (value) => assertMinor(value, { allowZero: true, allowNegative: true }) / MINOR_UNITS_PER_MAD;

const formatMinor = (value) => {
  const minor = assertMinor(value, { allowZero: true, allowNegative: true });
  const sign = minor < 0 ? '-' : '';
  const absolute = Math.abs(minor);
  return `${sign}${Math.floor(absolute / MINOR_UNITS_PER_MAD)}.${String(absolute % MINOR_UNITS_PER_MAD).padStart(2, '0')}`;
};

const legacyToMinor = (value, options = {}) => toMinor(value, { allowZero: true, allowNegative: true, ...options });

module.exports = {
  MINOR_UNITS_PER_MAD,
  MAX_MINOR_UNITS,
  assertMinor,
  toMinor,
  fromMinor,
  formatMinor,
  legacyToMinor,
};

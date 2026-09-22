const MARKETPLACE_TIME_ZONE = 'Africa/Casablanca';
const OPEN_HOUR = 10;
const CLOSE_HOUR = 22;

const moroccoHour = (date = new Date()) => Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: MARKETPLACE_TIME_ZONE,
  hour: '2-digit', hourCycle: 'h23',
}).formatToParts(date).find((part) => part.type === 'hour')?.value);

const isMarketplaceOpen = (date = new Date()) => {
  const hour = moroccoHour(date);
  return Number.isInteger(hour) && hour >= OPEN_HOUR && hour < CLOSE_HOUR;
};

const marketplaceOperatingHours = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || isMarketplaceOpen()) return next();
  res.set('Retry-After', String(60 * 30));
  return res.status(503).json({
    error: 'rifKANDO marketplace is closed. We are open daily from 10:00 to 22:00 Morocco time.',
    code: 'MARKETPLACE_CLOSED',
    hours: { timeZone: MARKETPLACE_TIME_ZONE, opensAt: '10:00', closesAt: '22:00' },
  });
};

module.exports = { marketplaceOperatingHours, isMarketplaceOpen, MARKETPLACE_TIME_ZONE, OPEN_HOUR, CLOSE_HOUR };

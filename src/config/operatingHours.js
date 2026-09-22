// Temporary marketplace schedule uses the owner's chosen fixed UTC clock.
export const MARKETPLACE_TIME_ZONE = 'UTC';
export const MARKETPLACE_OPEN_HOUR = 10;
export const MARKETPLACE_CLOSE_HOUR = 22;

const partsFor = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
    timeZone: MARKETPLACE_TIME_ZONE,
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
);

export const getMarketplaceHours = (date = new Date()) => {
  const parts = partsFor(date);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const isOpen = hour >= MARKETPLACE_OPEN_HOUR && hour < MARKETPLACE_CLOSE_HOUR;
  const nextChangeMinutes = isOpen
    ? ((MARKETPLACE_CLOSE_HOUR - hour) * 60) - minute
    : (hour < MARKETPLACE_OPEN_HOUR
      ? ((MARKETPLACE_OPEN_HOUR - hour) * 60) - minute
      : ((24 - hour + MARKETPLACE_OPEN_HOUR) * 60) - minute);

  return { isOpen, hour, minute, nextChangeMinutes: Math.max(nextChangeMinutes, 1) };
};

export const formatMoroccoTime = (date = new Date()) => new Intl.DateTimeFormat('en-GB', {
  timeZone: MARKETPLACE_TIME_ZONE,
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(date);

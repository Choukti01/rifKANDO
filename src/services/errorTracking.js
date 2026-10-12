import { API_ORIGIN } from '../config/apiUrl';

const reportedFingerprints = new Set();

const asErrorDetails = (value) => {
  if (value instanceof Error) {
    return { errorName: value.name || 'Error', message: value.message || 'Unexpected client error' };
  }
  if (typeof value === 'string') return { errorName: 'Error', message: value };
  return { errorName: 'UnhandledRejection', message: 'An unhandled browser promise rejection occurred.' };
};

const reportClientError = async (value, route = window.location.pathname) => {
  const details = asErrorDetails(value);
  const fingerprint = `${details.errorName}:${details.message}:${route}`.slice(0, 900);
  if (reportedFingerprints.has(fingerprint)) return;
  if (reportedFingerprints.size >= 200) reportedFingerprints.clear();
  reportedFingerprints.add(fingerprint);

  try {
    await fetch(`${API_ORIGIN}/api/error-tracking/client-events`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorName: details.errorName,
        message: details.message,
        route: String(route || '/').split('?')[0],
      }),
    });
  } catch {
    // Telemetry is deliberately best-effort and can never affect the visitor.
  }
};

const installClientErrorTracking = () => {
  window.addEventListener('error', (event) => {
    void reportClientError(event.error || event.message, window.location.pathname);
  });
  window.addEventListener('unhandledrejection', (event) => {
    void reportClientError(event.reason, window.location.pathname);
  });
};

export { installClientErrorTracking, reportClientError };

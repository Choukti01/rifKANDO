const filenameFromDisposition = (value, fallback) => {
  if (!value) return fallback;
  const extended = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (extended) {
    try { return decodeURIComponent(extended[1]); } catch { return fallback; }
  }
  const basic = value.match(/filename="?([^";]+)"?/i);
  return basic?.[1]?.trim() || fallback;
};

export const downloadBlobResponse = (response, fallbackFilename = 'download') => {
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFromDisposition(response.headers?.['content-disposition'], fallbackFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

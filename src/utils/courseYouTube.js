// Never use a seller-supplied URL directly as an iframe source.
export function courseYouTubeEmbedUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  let id;
  if (url.hostname === 'youtu.be' && parts.length === 1) id = parts[0];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (parts.length === 2 && ['embed', 'shorts'].includes(parts[0])) id = parts[1];
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

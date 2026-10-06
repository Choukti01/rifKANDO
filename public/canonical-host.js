(() => {
  // Keep one browser origin for sessions, OAuth, uploads, and embedded
  // browser views. This is deliberately a fixed hostname, not user input.
  if (window.location.hostname !== 'rifkando.com') return;

  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.protocol = 'https:';
  canonicalUrl.hostname = 'www.rifkando.com';
  window.location.replace(canonicalUrl.href);
})();

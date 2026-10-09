import { useEffect } from 'react';
import { DEFAULT_SEO_IMAGE, SEO_ORIGIN } from './seoConfig';

const normalisePath = (value = '/') => {
  const path = String(value || '/').startsWith('/') ? String(value) : `/${value}`;
  return path === '/' ? path : path.replace(/\/+$/, '');
};

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
};

const upsertLink = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
};

const SeoHead = ({
  title,
  description,
  path = '/',
  image = DEFAULT_SEO_IMAGE,
  type = 'website',
  noIndex = false,
  jsonLd,
}) => {
  useEffect(() => {
    const canonicalPath = normalisePath(path);
    const canonical = `${SEO_ORIGIN}${canonicalPath}`;
    const safeTitle = String(title || 'rifKANDO | Marketplace from Morocco');
    const safeDescription = String(description || 'Discover products and FINDit requests on rifKANDO.');

    document.title = safeTitle;
    document.documentElement.lang = 'en';
    upsertMeta('meta[name="description"]', { name: 'description', content: safeDescription });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noIndex ? 'noindex,follow' : 'index,follow,max-image-preview:large' });
    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonical });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: safeTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: safeDescription });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: safeTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: safeDescription });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });

    const schemaId = 'rifkando-page-schema';
    let schema = document.getElementById(schemaId);
    if (jsonLd) {
      if (!schema) {
        schema = document.createElement('script');
        schema.id = schemaId;
        schema.type = 'application/ld+json';
        document.head.appendChild(schema);
      }
      // `textContent` prevents listing text from being interpreted as HTML.
      schema.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
    } else {
      schema?.remove();
    }
  }, [description, image, jsonLd, noIndex, path, title, type]);

  return null;
};

export default SeoHead;

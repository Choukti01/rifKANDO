import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, AcademicCapIcon, WrenchScrewdriverIcon, ComputerDesktopIcon, MagnifyingGlassIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { getProducts, getFinditRequests } from '/src/services/api';
import MediaGallery from '../../components/MediaGallery';
import { getImageUrl } from '../../utils/imageUtils';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import ServiceUnavailableState from '../../components/common/ServiceUnavailableState';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryItem, setGalleryItem] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [productDataAvailable, setProductDataAvailable] = useState(true);
  const [finditDataAvailable, setFinditDataAvailable] = useState(true);
  const [stats, setStats] = useState({
    productsCount: 0,
    finditRequestsCount: 0
  });

  useEffect(() => {
    let isCurrent = true;

    const loadHomeData = async () => {
      setLoading(true);
      const [productsResult, finditResult] = await Promise.allSettled([
        getProducts(),
        getFinditRequests({ limit: 1 })
      ]);

      if (!isCurrent) return;

      const productDataLoaded = productsResult.status === 'fulfilled';
      const finditDataLoaded = finditResult.status === 'fulfilled';
      const products = productDataLoaded ? productsResult.value.data.products || [] : [];
      const productsTotal = productDataLoaded
        ? Number(productsResult.value.data.pagination?.total ?? products.length)
        : 0;
      const finditTotal = finditDataLoaded
        ? Number(finditResult.value.data.pagination?.total || finditResult.value.data.requests?.length || 0)
        : 0;

      setProductDataAvailable(productDataLoaded);
      setFinditDataAvailable(finditDataLoaded);
      setStats({
        productsCount: productsTotal,
        finditRequestsCount: finditTotal
      });

      setFeaturedItems([
        ...products.slice(0, 8).map(item => ({ ...item, type: 'product' })),
      ]);
      setLoading(false);
    };

    void loadHomeData();

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  const retryHomeData = () => setReloadKey((current) => current + 1);
  const hasUnavailableLiveData = !productDataAvailable || !finditDataAvailable;

  const categories = [
    { name: t('nav.products'), icon: ShoppingBagIcon, path: '/products', color: 'var(--color-brand-blue)', count: stats.productsCount, available: productDataAvailable },
    { name: t('nav.courses'), icon: AcademicCapIcon, path: '/courses', color: '#64748b', underDevelopment: true },
    { name: t('nav.services'), icon: WrenchScrewdriverIcon, path: '/services', color: '#64748b', underDevelopment: true },
    { name: t('nav.digital'), icon: ComputerDesktopIcon, path: '/digital', color: '#64748b', underDevelopment: true },
    { name: t('findit.navigation'), icon: MagnifyingGlassIcon, path: '/findit', color: 'var(--color-brand-blue)', count: stats.finditRequestsCount, countLabel: t('availability.openRequests'), available: finditDataAvailable },
  ];

  const getItemUrl = (item) => {
    switch(item.type) {
      case 'product': return `/product/${item.id}`;
      case 'course': return `/course/${item.id}`;
      case 'service': return `/service/${item.id}`;
      case 'digital': return `/digital/${item.id}`;
      default: return '#';
    }
  };

  // ✅ FIXED: use getImageUrl
  const getItemImage = (item) => {
    const media = item.media;
    if (media && media.length > 0) {
      const primaryMedia = media.find(m => m.is_primary) || media[0];
      return getImageUrl(primaryMedia.media_url);
    }
    const icons = {
      product: '📦',
      course: '📚',
      service: '🔧',
      digital: '💾',
      booking: '📅'
    };
    return icons[item.type] || '🛒';
  };

  const hasMedia = (item) => {
    return item.media && item.media.length > 0;
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-title-leading">{t('home.headlineLead')}</span>{' '}
              <span className="hero-title-accent">{t('home.headlineAccent')}</span>
            </h1>
            <p className="hero-description">
              {t('home.valueStatement')}
            </p>
            <div className="hero-buttons">
              <Link to="/products" className="btn btn-primary btn-large">{t('home.startShopping')}</Link>
              <Link to="/choose-seller-type" className="btn btn-outline btn-large">{t('home.becomeSeller')}</Link>
            </div>
          </div>
        </div>
      </section>

      {hasUnavailableLiveData && (
        <section className="section home-service-status">
          <div className="container"><ServiceUnavailableState compact onRetry={retryHomeData} /></div>
        </section>
      )}

      {/* Categories Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">
            {t('home.explore')} <span>{t('home.categories')}</span>
          </h2>
          <div className="categories-grid">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.name} to={cat.path} className="category-card">
                  <div className="category-icon" style={{ backgroundColor: cat.color }}>
                    <Icon className="category-icon-svg" />
                  </div>
                  <h3 className="category-name">{cat.name}</h3>
                  <p className={`category-count ${cat.underDevelopment ? 'category-count-coming' : ''}`}>
                    {cat.underDevelopment ? t('launch.shortLabel') : cat.available === false ? t('availability.liveData') : `${cat.count.toLocaleString()} ${cat.countLabel || (cat.count === 1 ? t('availability.item') : t('availability.items'))}`}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="section bg-gray-50">
        <div className="container">
          <div className="featured-header">
            <h2 className="featured-title">{t('home.featured')}</h2>
            <Link to="/products" className="view-all-link">
              {t('home.viewAll')} <ArrowRightIcon className="view-all-icon" />
            </Link>
          </div>
          {productDataAvailable ? (
            <div className="featured-grid">
              {featuredItems.map(item => {
              const itemImage = getItemImage(item);
              const isImageUrl = typeof itemImage === 'string' && itemImage.startsWith('http');
              const itemHasMedia = hasMedia(item);
              
              return (
                <div key={`${item.type}-${item.id}`} className="card">
                  <div 
                    className="card-image" 
                    onClick={() => itemHasMedia && setGalleryItem(item)}
                    style={{ cursor: itemHasMedia ? 'pointer' : 'default' }}
                  >
                    {isImageUrl ? (
                      <MarketplaceImage
                        source={itemImage}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '3rem' }}>{itemImage}</span>
                    )}
                  </div>
                  <div className="card-content">
                    <div className="card-type-badge">
                      {item.type}
                    </div>
                    <h3 className="card-title">{item.title}</h3>
                    <p className="card-seller">
                      {item.seller_name || item.provider_name || item.instructor_name || 'Seller'}
                    </p>
                    <div className="card-price-row">
                      <div>
                        <span className="card-price">{item.price} MAD</span>
                        {item.old_price && (
                          <span className="card-old-price">{item.old_price} MAD</span>
                        )}
                      </div>
                      <div className="card-rating">
                        ★ {item.rating || 0}
                      </div>
                    </div>
                    <Link to={getItemUrl(item)} className="btn btn-primary btn-sm btn-block">View Details</Link>
                  </div>
                </div>
              );
              })}
            </div>
          ) : <ServiceUnavailableState compact onRetry={retryHomeData} />}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{productDataAvailable ? stats.productsCount : '—'}</div>
              <div className="stat-label">{productDataAvailable ? t('availability.productsAvailable') : t('availability.liveData')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">COD</div>
              <div className="stat-label">Payment at Delivery</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{finditDataAvailable ? stats.finditRequestsCount : '—'}</div>
              <div className="stat-label">{finditDataAvailable ? t('availability.openRequests') : t('availability.liveData')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">2</div>
              <div className="stat-label">Active Marketplace Sections</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container text-center">
          <h2 className="cta-title">{t('home.ready')}</h2>
          <p className="cta-description">{t('home.join')}</p>
          <Link to="/choose-seller-type" className="cta-button">{t('home.becomeSeller')}</Link>
        </div>
      </section>

      {/* ✅ FIXED: gallery modal uses getImageUrl */}
      {galleryItem && (
        <MediaGallery
          media={galleryItem.media.map(m => ({ 
            url: getImageUrl(m.media_url), 
            type: m.media_type 
          }))}
          onClose={() => setGalleryItem(null)}
        />
      )}

      <style>{`
        /* your existing styles – unchanged */
        .home-page { min-height: calc(100vh - 80px); }
        .hero-section { background: linear-gradient(135deg, rgba(135,206,235,0.08) 0%, #ffffff 100%); padding: 5rem 0; }
        .hero-content { text-align: center; max-width: 800px; margin: 0 auto; }
        .hero-title { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
        .brand-wordmark { color: #111827; letter-spacing: -0.055em; white-space: nowrap; }
        .brand-wordmark span { color: var(--color-primary); }
        .brand-wordmark--hero { display: inline-block; }
        @media (min-width: 768px) { .hero-title { font-size: 3.5rem; } }
        .hero-title { color: var(--color-black); letter-spacing: -0.045em; }
        .hero-title-leading { color: var(--color-black); }
        .hero-title-accent { position: relative; display: inline-block; color: var(--color-primary); }
        .hero-title-accent::after { content: ''; position: absolute; right: 0; bottom: -0.12em; left: 0; height: 0.12em; border-radius: var(--radius-full); background: var(--color-primary); opacity: 0.75; }
        .hero-description { max-width: 46rem; margin: 0 auto 2rem; font-size: 1.125rem; color: #475569; line-height: 1.7; }
        .hero-buttons { display: flex; gap: 1rem; justify-content: center; }
        .btn-large { padding: 0.875rem 2rem; font-size: 1rem; }
        .categories-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 1.5rem; }
        @media (min-width:640px){.categories-grid{grid-template-columns:repeat(3,1fr)}}
        @media (min-width:768px){.categories-grid{grid-template-columns:repeat(4,1fr)}}
        @media (min-width:1024px){.categories-grid{grid-template-columns:repeat(5,1fr)}}
        .category-card { background: white; padding: 1.5rem; text-align: center; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.3s ease; text-decoration: none; display: block; }
        .category-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .category-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .category-icon-svg { width: 32px; height: 32px; color: white; }
        .category-name { font-weight: 600; margin-bottom: 0.25rem; color: #1a1a1a; }
        .category-count { font-size: 0.875rem; color: #6b7280; }
        .category-count-coming { color: #64748b; font-weight: 700; }
        .bg-gray-50 { background-color: #f9fafb; }
        .featured-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .featured-title { font-size: 1.75rem; font-weight: 700; }
        .view-all-link { display: flex; align-items: center; gap: 0.5rem; color: #87CEEB; text-decoration: none; transition: gap 0.2s; }
        .view-all-link:hover { gap: 0.75rem; }
        .view-all-icon { width: 1rem; height: 1rem; }
        .featured-grid { display: grid; grid-template-columns: repeat(1,1fr); gap: 1.5rem; }
        @media (min-width:640px){.featured-grid{grid-template-columns:repeat(2,1fr)}}
        @media (min-width:1024px){.featured-grid{grid-template-columns:repeat(4,1fr)}}
        .card { background: white; border-radius: 1rem; overflow: hidden; transition: all 0.3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-decoration: none; display: block; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .card-image { height: 180px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .card-image img { width: 100%; height: 100%; object-fit: cover; }
        .card-type-badge { display: inline-block; padding: 0.25rem 0.5rem; background: #87CEEB20; color: #87CEEB; border-radius: 0.5rem; font-size: 0.7rem; font-weight: 500; margin-bottom: 0.5rem; text-transform: capitalize; }
        .card-content { padding: 1rem; }
        .card-title { font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem; color: #1a1a1a; }
        .card-seller { font-size: 0.7rem; color: #6b7280; margin-bottom: 0.5rem; }
        .card-price-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .card-price { font-size: 1.125rem; font-weight: 700; color: #1a1a1a; }
        .card-old-price { font-size: 0.75rem; color: #9ca3af; text-decoration: line-through; margin-left: 0.5rem; }
        .card-rating { font-size: 0.75rem; color: #f59e0b; }
        .btn-sm { padding: 0.5rem 1rem; font-size: 0.75rem; }
        .btn-block { width: 100%; }
        .stats-section { padding: 3rem 0; background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%); color: white; }
        .stats-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 2rem; text-align: center; }
        @media (min-width:768px){.stats-grid{grid-template-columns:repeat(4,1fr)}}
        .stat-number { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .stat-label { font-size: 0.875rem; color: #9ca3af; }
        .cta-section { background: #87CEEB; padding: 4rem 0; text-align: center; }
        .cta-title { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; color: #1a1a1a; }
        .cta-description { font-size: 1.125rem; margin-bottom: 2rem; color: #1a1a1a; }
        .cta-button { background: #1a1a1a; color: white; padding: 0.875rem 2rem; font-size: 1rem; border: none; border-radius: 2rem; cursor: pointer; transition: all 0.2s; }
        .cta-button:hover { background: #2c2c2c; transform: translateY(-2px); }
        @media (max-width: 480px) {
          .hero-section { padding: 3.5rem 0; }
          .hero-buttons { flex-direction: column; gap: 0.75rem; }
          .hero-buttons .btn { width: 100%; }
          .category-card { padding: 1.25rem 0.75rem; }
          .category-icon { width: 56px; height: 56px; margin-bottom: 0.75rem; }
          .category-icon-svg { width: 28px; height: 28px; }
          .featured-header { align-items: flex-start; gap: 0.75rem; margin-bottom: 1.25rem; }
          .view-all-link { flex: 0 0 auto; padding-top: 0.35rem; }
          .cta-section { padding: 3rem 0; }
          .cta-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;

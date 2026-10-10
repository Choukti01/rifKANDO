import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import ServiceUnavailableState from '../../components/common/ServiceUnavailableState';
import { featuredMarketplaceCities, marketplaceCities } from '../../constants/marketplaceLocations';

const ProductsPage = () => {
  const { t, i18n } = useTranslation();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState(null);
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  
  const [activeCondition, setActiveCondition] = useState(() => urlSearchParams.get('condition') || 'new');
  const [searchTerm, setSearchTerm] = useState(() => urlSearchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => urlSearchParams.get('category') || '');
  const [city, setCity] = useState(() => urlSearchParams.get('city') || '');
  const [minPrice, setMinPrice] = useState(() => urlSearchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(() => urlSearchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState(() => urlSearchParams.get('sortBy') || 'newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchInput, setSearchInput] = useState(() => urlSearchParams.get('search') || '');
  const [cityInput, setCityInput] = useState(() => urlSearchParams.get('city') || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const categories = ['electronics', 'fashion', 'handicrafts', 'books', 'home'];

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedCategory) params.append('category', selectedCategory);
    if (city) params.append('city', city);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (sortBy) params.append('sortBy', sortBy);
    params.append('page', currentPage);
    params.append('limit', 20);
    params.append('condition', activeCondition);

    const response = await api.get(`/products?${params.toString()}`);
    return response.data;
  }, [activeCondition, city, currentPage, maxPrice, minPrice, searchTerm, selectedCategory, sortBy]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeCondition !== 'new') next.set('condition', activeCondition);
    if (searchTerm) next.set('search', searchTerm);
    if (selectedCategory) next.set('category', selectedCategory);
    if (city) next.set('city', city);
    if (minPrice) next.set('minPrice', minPrice);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (sortBy !== 'newest') next.set('sortBy', sortBy);
    const current = urlSearchParams.toString();
    if (current !== next.toString()) setUrlSearchParams(next, { replace: true });
  }, [activeCondition, city, maxPrice, minPrice, searchTerm, selectedCategory, setUrlSearchParams, sortBy, urlSearchParams]);

  useEffect(() => {
    let isCurrent = true;

    const loadProducts = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchProducts();
        if (!isCurrent) return;

        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalProducts(data.pagination?.total || 0);
      } catch (error) {
        if (!isCurrent) return;

        console.error('Error fetching products:', error);
        setLoadError(error);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadProducts();

    return () => {
      isCurrent = false;
    };
  }, [fetchProducts, retryKey]);

  const handleAddToCart = (product) => {
    if (!isAuthenticated) { toast.error(t('products.signInRequired')); return; }
    if (Number(product.seller_id) === Number(user?.id)) { toast.error(t('products.ownListing')); return; }
    if (Number(product.stock) < 1) { toast.error(t('products.outOfStock')); return; }
    addToCart(product, 1, 'product');
  };

  const formatAmount = (amount) => new Intl.NumberFormat(
    i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA',
    { maximumFractionDigits: 2 }
  ).format(Number(amount || 0));

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const conditionLabels = {
    new: t('products.conditions.new'),
    used_as_new: t('products.conditions.usedAsNew'),
    joutiya: t('products.conditions.joutiya'),
  };
  const categoryLabel = (category) => t(`products.categories.${category}`);

  const hasActiveFilters = Boolean(searchTerm || selectedCategory || city || minPrice || maxPrice);
  const activeFilterCount = [searchTerm, selectedCategory, city, minPrice, maxPrice].filter(Boolean).length;

  const clearFilters = () => {
    setSearchInput('');
    setCityInput('');
    setSearchTerm('');
    setSelectedCategory('');
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const applySearch = (event) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
    setCity(cityInput.trim());
    setCurrentPage(1);
  };

  const selectCity = (nextCity) => {
    setCityInput(nextCity);
    setCity(nextCity);
    setCurrentPage(1);
  };

  if (loading) return <div className="container py-16"><LoadingSkeleton label={t('products.loading')} /></div>;

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>{t('products.title')}</h1>
          <p>{t('products.lead')}</p>
        </div>

        <div className="condition-tabs">
          <button className={`tab-btn ${activeCondition === 'new' ? 'active' : ''}`} onClick={() => { setActiveCondition('new'); setCurrentPage(1); }}>{t('products.conditions.new')}</button>
          <button className={`tab-btn ${activeCondition === 'used_as_new' ? 'active' : ''}`} onClick={() => { setActiveCondition('used_as_new'); setCurrentPage(1); }}>{t('products.conditions.usedAsNew')}</button>
          <button className={`tab-btn ${activeCondition === 'joutiya' ? 'active' : ''}`} onClick={() => { setActiveCondition('joutiya'); setCurrentPage(1); }}>{t('products.conditions.joutiya')}</button>
        </div>

        <div className="filters-bar">
          <form className="product-search-form" onSubmit={applySearch}>
            <input type="search" placeholder={t('products.searchPlaceholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="product-search-input" aria-label={t('products.search')} />
            <button type="submit" className="product-search-btn">{t('products.search')}</button>
          </form>
          <div className="filter-toolbar">
            <button type="button" className="filters-toggle" onClick={() => setShowMobileFilters((isOpen) => !isOpen)} aria-controls="product-filter-fields" aria-expanded={showMobileFilters}>
              {t('products.filters')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            {hasActiveFilters && <button type="button" className="clear-filters-btn" onClick={clearFilters}>{t('products.clearFilters')}</button>}
          </div>
          <div id="product-filter-fields" className={`filter-fields ${showMobileFilters ? 'filter-fields-open' : ''}`}>
            <div className="filters">
              <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="filter-select" aria-label={t('products.category')}>
                <option value="">{t('products.allCategories')}</option>
                {categories.map(cat => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
              </select>
              <input type="text" list="marketplace-city-options" maxLength="100" placeholder={t('products.cityPlaceholder')} value={cityInput} onChange={(e) => setCityInput(e.target.value)} className="filter-select" aria-label={t('products.city')} />
              <input type="number" min="0" placeholder={t('products.minPrice')} value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }} className="price-input" aria-label={t('products.minPrice')} />
              <input type="number" min="0" placeholder={t('products.maxPrice')} value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }} className="price-input" aria-label={t('products.maxPrice')} />
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} className="filter-select" aria-label={t('products.sort')}>
                <option value="newest">{t('products.sortNewest')}</option>
                <option value="price_asc">{t('products.sortPriceAsc')}</option>
                <option value="price_desc">{t('products.sortPriceDesc')}</option>
                <option value="rating">{t('products.sortRating')}</option>
                <option value="popular">{t('products.sortPopular')}</option>
              </select>
            </div>
          </div>
          <div className="location-shortcuts" aria-label={t('products.browseByCity')}>
            <span>{t('products.browseByCity')}</span>
            <div>
              {featuredMarketplaceCities.map((featuredCity) => (
                <button key={featuredCity} type="button" className={city === featuredCity ? 'is-active' : ''} onClick={() => selectCity(featuredCity)}>{featuredCity}</button>
              ))}
            </div>
          </div>
          <datalist id="marketplace-city-options">
            {marketplaceCities.map((marketplaceCity) => <option key={marketplaceCity} value={marketplaceCity} />)}
          </datalist>
          {hasActiveFilters && (
            <div className="active-filters" aria-label={t('products.activeFilters')}>
              {searchTerm && <button type="button" className="filter-chip" onClick={() => { setSearchInput(''); setSearchTerm(''); setCurrentPage(1); }}>{t('products.search')}: {searchTerm} <span aria-hidden="true">×</span></button>}
              {selectedCategory && <button type="button" className="filter-chip" onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}>{selectedCategory} <span aria-hidden="true">×</span></button>}
              {city && <button type="button" className="filter-chip" onClick={() => { setCityInput(''); setCity(''); setCurrentPage(1); }}>{t('products.city')}: {city} <span aria-hidden="true">×</span></button>}
              {minPrice && <button type="button" className="filter-chip" onClick={() => { setMinPrice(''); setCurrentPage(1); }}>{t('products.from')} {minPrice} MAD <span aria-hidden="true">×</span></button>}
              {maxPrice && <button type="button" className="filter-chip" onClick={() => { setMaxPrice(''); setCurrentPage(1); }}>{t('products.upTo')} {maxPrice} MAD <span aria-hidden="true">×</span></button>}
            </div>
          )}
          {!loadError && <div className="results-count" aria-live="polite">{t('products.results', { count: totalProducts, filters: hasActiveFilters ? ` ${t('products.withFilters', { count: activeFilterCount })}` : '' })}</div>}
        </div>

        {loadError ? <ServiceUnavailableState onRetry={() => setRetryKey((current) => current + 1)} /> : <div className="products-grid">
          {products.map(product => {
              const productPrice = Number(product.price || 0);
              const isOwnListing = Number(product.seller_id) === Number(user?.id);
              const outOfStock = Number(product.stock) < 1;

              return <div key={product.id} className="product-card">
                <div
                  className="product-image"
                  role={product.media?.length ? 'button' : undefined}
                  tabIndex={product.media?.length ? 0 : undefined}
                  aria-label={product.media?.length ? t('products.viewMedia', { title: product.title }) : undefined}
                  onClick={() => product.media?.length && setGalleryProduct(product)}
                  onKeyDown={(event) => {
                    if (product.media?.length && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setGalleryProduct(product);
                    }
                  }}
                >
                  {product.media && product.media.length > 0 ? (
                    <>
                      {product.media[0].media_type === 'video' && <div className="video-badge">🎬 {t('products.video')}</div>}
                      {product.media[0].media_type === 'video' ? (
                        <video src={getImageUrl(product.media[0].media_url)} muted playsInline preload="metadata" aria-label={`${product.title} video preview`} />
                      ) : (
                        <MarketplaceImage source={product.media[0].media_url} alt={product.title} />
                      )}
                      {product.media.length > 1 && <div className="media-count">{t('products.itemCount', { count: product.media.length })}</div>}
                    </>
                  ) : (
                    <div className="image-placeholder">📦</div>
                  )}
                  <div className="condition-badge">{conditionLabels[product.condition] || t('products.conditions.new')}</div>
                </div>
                <Link to={`/product/${product.id}`}><h3>{product.title}</h3></Link>
                <p>
                  {t('products.by')} <Link to={`/profile/${product.seller_id}`} className="seller-link">{product.seller_name || t('products.unknownSeller')}</Link>
                </p>
                {product.listing_city && <p className="product-location">{t('products.fromCity', { city: product.listing_city })}</p>}
                <div className="product-rating">⭐ {product.rating || 0} ({t('products.reviewCount', { count: product.review_count ?? product.reviews_count ?? 0 })})</div>
                <div className="product-price">
                  <span className="current-price">{formatAmount(productPrice)} MAD</span>
                  {product.old_price && <span className="old-price">{formatAmount(product.old_price)} MAD</span>}
                </div>
                <div className="product-cod-summary">
                  <span>{t('products.delivery')}: <strong>{t('products.deliveryQuotedAfterOrder')}</strong></span>
                  {product.condition !== 'joutiya' && <span>{t('products.codTotal')}: <strong>{t('products.itemPlusDelivery', { item: `${formatAmount(productPrice)} MAD` })}</strong></span>}
                </div>
                <div className={`product-availability ${outOfStock ? 'is-out-of-stock' : ''}`}>
                  {outOfStock ? t('products.outOfStock') : t('products.stockAvailable', { count: product.stock })}
                </div>
                {product.condition === 'joutiya' ? (
                  outOfStock ? <span className="product-btn negotiate-btn product-btn-disabled">{t('products.outOfStock')}</span> : <Link to={`/product/${product.id}`} className="product-btn negotiate-btn">{t('products.makeOffer')}</Link>
                ) : (
                  <button onClick={() => handleAddToCart(product)} className="product-btn" disabled={outOfStock || isOwnListing}>
                    {outOfStock ? t('products.outOfStock') : isOwnListing ? t('products.yourListing') : t('products.addToCart')}
                  </button>
                )}
              </div>;
          })}
        </div>}

        {!loadError && totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="page-btn">← {t('products.previous')}</button>
            <span className="page-info">{t('products.pageOf', { current: currentPage, total: totalPages })}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="page-btn">{t('products.next')} →</button>
          </div>
        )}
      </div>

      {galleryProduct && (
        <MediaGallery
          media={galleryProduct.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}
          onClose={() => setGalleryProduct(null)}
        />
      )}

      <style>{`
        /* keep your existing styles unchanged */
        .products-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .products-header { text-align: center; margin-bottom: 2rem; }
        .condition-tabs { display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
        .condition-tabs .tab-btn { padding: 0.5rem 1.5rem; background: none; border: none; font-size: 1rem; font-weight: 500; cursor: pointer; border-radius: 2rem; transition: all 0.2s; color: #6b7280; }
        .condition-tabs .tab-btn.active { background: #87CEEB; color: #1a1a1a; }
        .condition-tabs .tab-btn:hover:not(.active) { background: #f3f4f6; }
        .filters-bar { background: white; border-radius: 1rem; padding: 1rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .products-page .product-search-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .products-page .product-search-input { flex: 1; min-height: 44px; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .products-page .product-search-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.16); }
        .products-page .product-search-btn { min-height: 44px; padding: 0.75rem 1.5rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .products-page .product-search-btn:hover { background: #333; }
        .products-page .product-search-btn:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.55); outline-offset: 2px; }
        .filter-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
        .filters-toggle { display: none; min-height: 44px; padding: 0.5rem 1rem; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 0.5rem; color: #1a1a1a; font-weight: 600; cursor: pointer; }
        .clear-filters-btn { min-height: 36px; padding: 0.4rem 0.75rem; background: none; border: none; color: #4b5563; font-weight: 600; cursor: pointer; }
        .filters-toggle:focus-visible, .clear-filters-btn:focus-visible, .filter-chip:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.55); outline-offset: 2px; }
        .filters { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
        .filter-select, .price-input { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .price-input { width: 100px; }
        .filter-verified { margin-bottom: 1rem; font-size: 0.875rem; }
        .filter-verified label { display: flex; align-items: center; gap: 0.5rem; width: fit-content; cursor: pointer; }
        .active-filters { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0 0 1rem; }
        .filter-chip { display: inline-flex; min-height: 32px; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; background: rgba(135, 206, 235, 0.2); border: 1px solid rgba(95, 158, 160, 0.28); border-radius: 999px; color: #1f2937; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .filter-chip:hover { background: rgba(135, 206, 235, 0.34); }
        .location-shortcuts { align-items: center; display: flex; flex-wrap: wrap; gap: .55rem; margin: 0 0 1rem; }
        .location-shortcuts > span { color: #53657a; font-size: .78rem; font-weight: 700; }
        .location-shortcuts > div { display: flex; flex-wrap: wrap; gap: .4rem; }
        .location-shortcuts button { background: #f4f8fb; border: 1px solid #d7e4ed; border-radius: 999px; color: #355467; cursor: pointer; font-size: .75rem; font-weight: 700; min-height: 32px; padding: .3rem .6rem; }
        .location-shortcuts button:hover, .location-shortcuts button:focus-visible, .location-shortcuts button.is-active { background: rgba(74, 166, 225, .16); border-color: var(--color-brand-blue); color: var(--color-brand-ink); outline: none; }
        .results-count { font-size: 0.875rem; color: #6b7280; text-align: right; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .product-card { display: flex; flex-direction: column; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.3s; position: relative; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .product-image { height: 200px; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; }
        .product-image img, .product-image video { width: 100%; height: 100%; object-fit: cover; display:block; background:#0b1f33; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .video-badge { position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .media-count { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .condition-badge { position: absolute; top: 0.5rem; right: 0.5rem; background: #87CEEB; color: #1a1a1a; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; font-weight: 500; }
        .product-card h3 { font-size: 1rem; margin: 0.75rem 1rem 0.25rem; }
        .product-card p { font-size: 0.75rem; color: #6b7280; margin: 0 1rem 0.5rem; }
        .product-card .product-location { color: #426274; font-weight: 650; margin-top: -0.2rem; }
        .seller-link { color: #87CEEB; text-decoration: none; }
        .product-rating { font-size: 0.7rem; color: #f59e0b; margin: 0 1rem 0.5rem; }
        .product-price { margin: 0 1rem 0.5rem; display: flex; gap: 0.5rem; align-items: baseline; }
        .current-price { font-weight: 700; }
        .old-price { font-size: 0.75rem; color: #9ca3af; text-decoration: line-through; }
        .product-cod-summary { display: grid; gap: 0.25rem; margin: 0 1rem 0.5rem; padding: 0.6rem 0.7rem; border-radius: 0.6rem; background: #f4fbfd; color: #425466; font-size: 0.76rem; line-height: 1.35; }
        .product-cod-summary span:last-child { color: #153d4a; }
        .product-availability { margin: 0 1rem 0.75rem; color: #087a5c; font-size: 0.76rem; font-weight: 700; }
        .product-availability.is-out-of-stock { color: #b42318; }
        .product-btn { display: inline-flex; width: calc(100% - 2rem); min-height: 44px; margin: auto 1rem 1rem; align-items: center; justify-content: center; padding: 0.6rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; text-decoration: none; }
        .product-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .product-btn-disabled { cursor: not-allowed; opacity: 0.5; }
        .negotiate-btn { background: #f59e0b; color: white; }
        .negotiate-btn:hover { background: #d97706; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
        .page-btn { padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 0.875rem; color: #6b7280; }
        @media (max-width: 768px) {
          .condition-tabs { gap: 0.25rem; }
          .condition-tabs .tab-btn { flex: 1; min-height: 44px; padding: 0.5rem; font-size: 0.8rem; }
          .location-shortcuts { align-items: flex-start; flex-direction: column; }
          .filters-toggle { display: inline-flex; align-items: center; }
          .filter-fields { display: none; }
          .filter-fields.filter-fields-open { display: block; }
          .filters { flex-direction: column; }
          .filter-select, .price-input { width: 100%; min-height: 44px; }
          .filter-verified { margin-bottom: 0.5rem; }
          .results-count { text-align: left; }
        }
      `}</style>
    </div>
  );
};

export default ProductsPage;

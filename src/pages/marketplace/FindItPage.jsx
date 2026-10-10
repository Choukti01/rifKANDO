import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRightIcon,
  CameraIcon,
  CheckBadgeIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { getFinditRequests } from '../../services/api';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import ServiceUnavailableState from '../../components/common/ServiceUnavailableState';
import useAuth from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { featuredMarketplaceCities, marketplaceCities } from '../../constants/marketplaceLocations';

const formatExpiry = (expiresAt, language) => new Date(expiresAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : undefined, {
  month: 'short',
  day: 'numeric',
});

const formatMoney = (value) => `${Number(value || 0).toLocaleString()} MAD`;

const FindItPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, hasNextPage: false });
  const [search, setSearch] = useState(() => urlSearchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(() => urlSearchParams.get('search') || '');
  const [category, setCategory] = useState(() => urlSearchParams.get('category') || '');
  const [city, setCity] = useState(() => urlSearchParams.get('city') || '');
  const [cityInput, setCityInput] = useState(() => urlSearchParams.get('city') || '');
  const [sortBy, setSortBy] = useState(() => urlSearchParams.get('sortBy') || 'newest');

  const categories = ['Auto & Parts', 'Phones & Electronics', 'Home & Appliances', 'Tools & Equipment', 'Fashion & Accessories', 'Other'];
  const hasFilters = Boolean(search || category || city || sortBy !== 'newest');

  const requestParams = useCallback((page) => ({
    page,
    limit: 24,
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(city ? { city } : {}),
    ...(sortBy !== 'newest' ? { sortBy } : {}),
  }), [category, city, search, sortBy]);

  const fetchRequests = useCallback(async (page = 1) => {
    const response = await getFinditRequests(requestParams(page));
    return {
      requests: response.data.requests || [],
      pagination: response.data.pagination || { page, hasNextPage: false },
    };
  }, [requestParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (category) next.set('category', category);
    if (city) next.set('city', city);
    if (sortBy !== 'newest') next.set('sortBy', sortBy);
    if (next.toString() !== urlSearchParams.toString()) setUrlSearchParams(next, { replace: true });
  }, [category, city, search, setUrlSearchParams, sortBy, urlSearchParams]);

  useEffect(() => {
    let current = true;

    fetchRequests()
      .then((data) => {
        if (!current) return;
        setRequests(data.requests);
        setPagination(data.pagination);
      })
      .catch((error) => {
        if (current) {
          setRequests([]);
          setLoadError(error);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [fetchRequests, retryKey]);

  const retryFinditRequests = () => {
    setLoading(true);
    setLoadError(null);
    setRetryKey((current) => current + 1);
  };

  const loadMore = async () => {
    if (loadingMore || !pagination.hasNextPage) return;
    setLoadingMore(true);
    try {
      const data = await fetchRequests(Number(pagination.page || 1) + 1);
      setRequests((current) => {
        const seen = new Set(current.map((request) => request.id));
        return [...current, ...data.requests.filter((request) => !seen.has(request.id))];
      });
      setPagination(data.pagination);
    } catch {
      toast.error(t('findit.public.loadMoreError'));
    } finally {
      setLoadingMore(false);
    }
  };

  const dashboardPath = isAuthenticated ? '/findit/dashboard' : '/login';
  const applySearch = (event) => { event.preventDefault(); setSearch(searchInput.trim()); setCity(cityInput.trim()); };
  const clearFilters = () => { setSearch(''); setSearchInput(''); setCategory(''); setCity(''); setCityInput(''); setSortBy('newest'); };
  const selectCity = (nextCity) => { setCityInput(nextCity); setCity(nextCity); };

  return (
    <main className="findit-page">
      <div className="container">
        <section className="findit-hero">
          <div className="findit-hero-copy">
            <p className="findit-eyebrow"><MagnifyingGlassIcon aria-hidden="true" /> {t('findit.navigation')}</p>
            <h1>{t('findit.public.title')}</h1>
            <p className="findit-hero-lead">
              {t('findit.public.lead')}
            </p>
            <div className="findit-hero-actions">
              <Link to={dashboardPath} className="findit-primary-action">
                {isAuthenticated ? t('findit.public.postRequest') : t('findit.public.signInToPost')}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
              {(user?.role === 'seller' || user?.roles?.includes('seller')) && (
                <Link to="/seller/dashboard/findit" className="findit-secondary-action">{t('findit.public.viewBuyerRequests')}</Link>
              )}
            </div>
          </div>

          <aside className="findit-process-card" aria-label={t('findit.public.processTitle')}>
            <div className="findit-process-icon"><CameraIcon aria-hidden="true" /></div>
            <div>
              <strong>{t('findit.public.processTitle')}</strong>
              <p>{t('findit.public.processText')}</p>
            </div>
            <ul>
              <li><CheckBadgeIcon aria-hidden="true" /> {t('findit.public.processOne')}</li>
              <li><CheckBadgeIcon aria-hidden="true" /> {t('findit.public.processTwo')}</li>
              <li><CheckBadgeIcon aria-hidden="true" /> {t('findit.public.processThree')}</li>
            </ul>
          </aside>
        </section>

        <section className="findit-list-section" aria-labelledby="findit-requests-heading">
          <div className="findit-list-heading">
            <div>
              <p className="findit-eyebrow">{t('findit.public.openRequests')}</p>
              <h2 id="findit-requests-heading">{t('findit.public.requestsHeading')}</h2>
              <span>{t('findit.public.requestsDescription')}</span>
            </div>
            <Link to={dashboardPath} className="findit-dashboard-link">{t('findit.public.dashboard')} <ArrowRightIcon aria-hidden="true" /></Link>
          </div>

          <div className="findit-discovery" aria-label={t('findit.public.discoverLabel')}>
            <form className="findit-search" onSubmit={applySearch}>
              <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t('findit.public.searchPlaceholder')} aria-label={t('findit.public.searchPlaceholder')} />
              <button type="submit">{t('products.search')}</button>
            </form>
            <div className="findit-filters">
              <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label={t('findit.form.category')}>
                <option value="">{t('findit.public.allCategories')}</option>
                {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <input type="text" list="marketplace-city-options" maxLength="100" value={cityInput} onChange={(event) => setCityInput(event.target.value)} placeholder={t('findit.public.cityPlaceholder')} aria-label={t('findit.form.city')} />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label={t('findit.public.sort')}>
                <option value="newest">{t('findit.public.sortNewest')}</option>
                <option value="offers">{t('findit.public.sortOffers')}</option>
                <option value="budget_asc">{t('findit.public.sortBudgetAsc')}</option>
                <option value="budget_desc">{t('findit.public.sortBudgetDesc')}</option>
              </select>
              {hasFilters && <button type="button" className="findit-clear" onClick={clearFilters}>{t('products.clearFilters')}</button>}
            </div>
            <div className="findit-location-shortcuts" aria-label={t('products.browseByCity')}>
              <span>{t('products.browseByCity')}</span>
              <div>{featuredMarketplaceCities.map((featuredCity) => <button key={featuredCity} type="button" className={city === featuredCity ? 'is-active' : ''} onClick={() => selectCity(featuredCity)}>{featuredCity}</button>)}</div>
            </div>
            <datalist id="marketplace-city-options">
              {marketplaceCities.map((marketplaceCity) => <option key={marketplaceCity} value={marketplaceCity} />)}
            </datalist>
          </div>

          {loading ? (
            <div className="findit-loading" aria-live="polite">{t('findit.public.loading')}</div>
          ) : loadError ? (
            <ServiceUnavailableState onRetry={retryFinditRequests} />
          ) : requests.length === 0 ? (
            <div className="findit-empty">
              <MagnifyingGlassIcon aria-hidden="true" />
              <h2>{t('findit.public.emptyTitle')}</h2>
              <p>{hasFilters ? t('findit.public.emptyFiltered') : t('findit.public.emptyText')}</p>
              <Link to={dashboardPath}>{t('findit.public.createRequest')}</Link>
            </div>
          ) : (
            <div className="findit-request-grid">
              {requests.map((request) => (
                <article key={request.id} className="findit-request-card">
                  <div className="findit-request-image-wrap">
                    {request.media?.[0] ? (
                      <MarketplaceImage
                        source={request.media[0].media_url}
                        alt={request.title}
                        className="findit-request-image"
                      />
                    ) : (
                      <div className="findit-request-image findit-image-fallback"><CameraIcon aria-hidden="true" /></div>
                    )}
                    <span className="findit-request-category">{request.category}</span>
                  </div>

                  <div className="findit-request-body">
                    <div className="findit-request-meta">
                      <span>{t('findit.public.expires', { date: formatExpiry(request.expires_at, i18n.language) })}</span>
                      <span>{t('findit.public.offer', { count: request.offer_count })}</span>
                    </div>
                    <h3>{request.title}</h3>
                    <p>{request.description}</p>
                    <div className="findit-request-facts">
                      <span><MapPinIcon aria-hidden="true" /> {request.city}</span>
                      <span><TagIcon aria-hidden="true" /> {request.budget_max > 0 ? t('findit.public.budgetUpTo', { amount: formatMoney(request.budget_max) }) : t('findit.public.budgetOpen')}</span>
                    </div>
                    <div className="findit-request-footer">
                      <span>{request.preferred_condition === 'any' ? t('findit.public.anyCondition') : t('findit.public.preferredCondition', { condition: request.preferred_condition })}</span>
                      {(user?.role === 'seller' || user?.roles?.includes('seller')) ? (
                        <Link to="/seller/dashboard/findit">{t('findit.public.sendSolution')} <ArrowRightIcon aria-hidden="true" /></Link>
                      ) : (
                        <Link to={dashboardPath}>{t('findit.public.postRequest')} <ArrowRightIcon aria-hidden="true" /></Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !loadError && pagination.hasNextPage && (
            <div className="findit-load-more">
              <button type="button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? t('findit.public.loadingMore') : t('findit.public.loadMore')}
              </button>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .findit-page { background: #f8fafc; color: var(--color-brand-ink); min-height: calc(100vh - 80px); padding: 2rem 0 4.5rem; }
        .findit-hero { align-items: stretch; background: #fff; border: 1px solid #dce8f2; border-radius: 1rem; box-shadow: 0 10px 26px rgba(10, 27, 53, .05); display: grid; gap: clamp(1.5rem, 5vw, 4rem); grid-template-columns: minmax(0, 1.25fr) minmax(17rem, .62fr); overflow: hidden; padding: clamp(1.5rem, 4vw, 3rem); }
        .findit-hero-copy { align-self: center; max-width: 43rem; }
        .findit-eyebrow { align-items: center; color: var(--color-brand-blue); display: flex; font-size: .72rem; font-weight: 900; gap: .4rem; letter-spacing: .1em; margin: 0 0 .7rem; text-transform: uppercase; }
        .findit-eyebrow svg { height: 1rem; width: 1rem; }
        .findit-hero h1 { font-size: clamp(2.15rem, 5vw, 3.8rem); letter-spacing: -.055em; line-height: 1.05; margin: 0; }
        .findit-hero-lead { color: #5e7084; font-size: 1rem; line-height: 1.7; margin: 1rem 0 0; max-width: 38rem; }
        .findit-hero-actions { display: flex; flex-wrap: wrap; gap: .7rem; margin-top: 1.45rem; }
        .findit-primary-action, .findit-secondary-action, .findit-dashboard-link, .findit-request-footer a { align-items: center; display: inline-flex; font-size: .84rem; font-weight: 800; gap: .4rem; text-decoration: none; }
        .findit-primary-action { background: var(--color-brand-ink); border-radius: .65rem; color: #fff; padding: .74rem .92rem; }
        .findit-primary-action:hover, .findit-primary-action:focus-visible { background: #10233e; }
        .findit-primary-action svg, .findit-dashboard-link svg, .findit-request-footer a svg { height: 1rem; width: 1rem; }
        .findit-secondary-action { border: 1px solid #cbdbe7; border-radius: .65rem; color: var(--color-brand-ink); padding: .7rem .9rem; }
        .findit-secondary-action:hover, .findit-secondary-action:focus-visible { background: #f4f8fb; }
        .findit-process-card { align-content: start; background: var(--color-brand-ink); color: #fff; display: grid; gap: .75rem; padding: 1.25rem; }
        .findit-process-icon { align-items: center; background: rgba(111, 191, 255, .15); border-radius: .65rem; color: var(--color-brand-blue); display: flex; height: 2.45rem; justify-content: center; width: 2.45rem; }
        .findit-process-icon svg { height: 1.3rem; width: 1.3rem; }
        .findit-process-card strong { font-size: 1.05rem; }
        .findit-process-card p { color: #d3e6f5; font-size: .82rem; line-height: 1.55; margin: .25rem 0 0; }
        .findit-process-card ul { border-top: 1px solid rgba(255, 255, 255, .16); display: grid; gap: .5rem; list-style: none; margin: .3rem 0 0; padding: .8rem 0 0; }
        .findit-process-card li { align-items: flex-start; color: #e2eff8; display: flex; font-size: .76rem; gap: .4rem; line-height: 1.4; }
        .findit-process-card li svg { color: var(--color-brand-blue); flex: 0 0 auto; height: 1rem; width: 1rem; }
        .findit-list-section { padding-top: clamp(2.3rem, 6vw, 4rem); }
        .findit-list-heading { align-items: end; display: flex; gap: 1rem; justify-content: space-between; margin-bottom: 1.2rem; }
        .findit-list-heading h2 { font-size: clamp(1.45rem, 3vw, 2.1rem); letter-spacing: -.04em; margin: 0; }
        .findit-list-heading > div > span { color: #637489; display: block; font-size: .84rem; line-height: 1.5; margin-top: .5rem; max-width: 38rem; }
        .findit-dashboard-link { color: var(--color-brand-ink); white-space: nowrap; }
        .findit-discovery { background:#fff; border:1px solid #dce8f2; border-radius:.85rem; display:grid; gap:.7rem; margin:0 0 1.2rem; padding:.8rem; }
        .findit-search { display:flex; gap:.55rem; }
        .findit-search input,.findit-filters input,.findit-filters select { background:#fff; border:1px solid #cbdbe7; border-radius:.6rem; color:var(--color-brand-ink); font:inherit; min-height:2.7rem; min-width:0; padding:.55rem .65rem; }
        .findit-search input { flex:1; }
        .findit-search button,.findit-clear { background:var(--color-brand-ink); border:0; border-radius:.6rem; color:#fff; cursor:pointer; font:inherit; font-size:.8rem; font-weight:800; min-height:2.7rem; padding:.55rem .85rem; }
        .findit-filters { display:flex; flex-wrap:wrap; gap:.55rem; }
        .findit-filters input,.findit-filters select { flex:1 1 11rem; }
        .findit-clear { background:#eef5f8; color:#284354; }
        .findit-location-shortcuts { align-items:center; display:flex; flex-wrap:wrap; gap:.5rem; }
        .findit-location-shortcuts > span { color:#53657a; font-size:.76rem; font-weight:750; }
        .findit-location-shortcuts > div { display:flex; flex-wrap:wrap; gap:.4rem; }
        .findit-location-shortcuts button { background:#f4f8fb; border:1px solid #d7e4ed; border-radius:999px; color:#355467; cursor:pointer; font:inherit; font-size:.73rem; font-weight:750; min-height:32px; padding:.28rem .58rem; }
        .findit-location-shortcuts button:hover,.findit-location-shortcuts button:focus-visible,.findit-location-shortcuts button.is-active { background:rgba(74,166,225,.16); border-color:var(--color-brand-blue); color:var(--color-brand-ink); outline:none; }
        .findit-dashboard-link:hover, .findit-dashboard-link:focus-visible, .findit-request-footer a:hover, .findit-request-footer a:focus-visible { color: var(--color-brand-blue); }
        .findit-request-grid { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .findit-request-card { background: #fff; border: 1px solid #dce8f2; border-radius: .9rem; box-shadow: 0 4px 14px rgba(10, 27, 53, .035); overflow: hidden; transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
        .findit-request-card:hover { border-color: #accde4; box-shadow: 0 14px 27px rgba(10, 27, 53, .09); transform: translateY(-2px); }
        .findit-request-image-wrap { background: #edf5fb; height: 10.5rem; position: relative; }
        .findit-request-image { display: block; height: 100%; object-fit: cover; width: 100%; }
        .findit-image-fallback { align-items: center; color: var(--color-brand-blue); display: flex; height: 100%; justify-content: center; }
        .findit-image-fallback svg { height: 2.25rem; width: 2.25rem; }
        .findit-request-category { background: rgba(16, 35, 62, .9); border-radius: 99px; bottom: .7rem; color: #fff; font-size: .67rem; font-weight: 800; left: .7rem; letter-spacing: .04em; padding: .32rem .52rem; position: absolute; text-transform: uppercase; }
        .findit-request-body { padding: 1rem; }
        .findit-request-meta { color: #718095; display: flex; font-size: .72rem; justify-content: space-between; margin-bottom: .65rem; }
        .findit-request-body h3 { font-size: 1.03rem; letter-spacing: -.018em; line-height: 1.35; margin: 0; }
        .findit-request-body > p { color: #607084; display: -webkit-box; font-size: .81rem; line-height: 1.55; margin: .55rem 0 0; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
        .findit-request-facts { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .8rem; }
        .findit-request-facts span { align-items: center; background: #f4f8fb; border-radius: 99px; color: #53657a; display: inline-flex; font-size: .7rem; font-weight: 750; gap: .25rem; padding: .3rem .45rem; }
        .findit-request-facts svg { color: var(--color-brand-blue); height: .82rem; width: .82rem; }
        .findit-request-footer { align-items: center; border-top: 1px solid #e7eef4; display: flex; font-size: .72rem; justify-content: space-between; margin-top: .85rem; padding-top: .75rem; }
        .findit-request-footer > span { color: #718095; text-transform: capitalize; }
        .findit-request-footer a { color: var(--color-brand-ink); font-size: .75rem; }
        .findit-loading, .findit-empty { background: #fff; border: 1px solid #dce8f2; border-radius: .9rem; color: #637489; padding: 3rem 1.25rem; text-align: center; }
        .findit-empty svg { color: var(--color-brand-blue); height: 2.3rem; width: 2.3rem; }
        .findit-empty h2 { color: var(--color-brand-ink); font-size: 1.2rem; margin: .6rem 0 .3rem; }
        .findit-empty p { line-height: 1.55; margin: 0 auto 1rem; max-width: 31rem; }
        .findit-empty a { background: var(--color-brand-ink); border-radius: .6rem; color: #fff; display: inline-block; font-size: .8rem; font-weight: 800; padding: .68rem .82rem; text-decoration: none; }
        .findit-load-more { display:flex; justify-content:center; margin-top:1.35rem; }.findit-load-more button { background:#fff; border:1px solid #cbdbe7; border-radius:.65rem; color:var(--color-brand-ink); cursor:pointer; font:inherit; font-size:.84rem; font-weight:800; min-height:44px; padding:.68rem 1rem; }.findit-load-more button:hover:not(:disabled),.findit-load-more button:focus-visible { border-color:var(--color-brand-blue); box-shadow:0 0 0 3px rgba(65,173,255,.16); outline:none; }.findit-load-more button:disabled { cursor:not-allowed; opacity:.6; }
        @media (max-width: 900px) { .findit-hero { grid-template-columns: 1fr; } .findit-process-card { grid-template-columns: auto minmax(0, 1fr); } .findit-process-card ul { grid-column: 1 / -1; } .findit-request-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .findit-page { padding-top: 1rem; } .findit-hero { border-radius: .85rem; padding: 1.2rem; } .findit-hero h1 { font-size: 2.2rem; } .findit-hero-actions, .findit-list-heading { align-items: stretch; flex-direction: column; } .findit-primary-action, .findit-secondary-action, .findit-dashboard-link { justify-content: center; } .findit-list-heading { align-items: flex-start; } .findit-request-grid { grid-template-columns: 1fr; } .findit-process-card { display: block; } .findit-process-card > div + div { margin-top: .75rem; } .findit-process-card ul { margin-top: .85rem; } .findit-search { flex-direction:column; } .findit-search button,.findit-clear { width:100%; } .findit-location-shortcuts { align-items:flex-start; flex-direction:column; } }
      `}</style>
    </main>
  );
};

export default FindItPage;

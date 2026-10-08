import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPinIcon, StarIcon, Squares2X2Icon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import { getImageUrl } from '../../utils/imageUtils';

const STORE_PAGE_SIZE = 24;

const PublicProfilePage = () => {
  const { userId } = useParams();
  const { t, i18n } = useTranslation();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadStorefront = useCallback(async (page = 1, append = false) => {
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError('');
    }

    try {
      let payload;
      try {
        const response = await api.get(`/sellers/${userId}/storefront`, {
          params: { page, limit: STORE_PAGE_SIZE },
        });
        payload = response.data;
      } catch (storefrontError) {
        // Keep public seller pages available while a new frontend reaches an
        // older API instance during a rolling deployment. The fallback uses
        // only the established public profile and published-listing routes.
        const status = storefrontError.response?.status;
        if (append || ![404, 500, 502, 503, 504].includes(status)) throw storefrontError;

        const [profileResponse, productsResponse] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/users/${userId}/products`),
        ]);
        const legacySeller = profileResponse.data.user;
        const legacyProducts = productsResponse.data.products || [];
        const reviewCount = legacyProducts.reduce(
          (total, product) => total + Number(product.review_count ?? product.reviews_count ?? 0),
          0,
        );
        const ratingTotal = legacyProducts.reduce(
          (total, product) => total + (Number(product.rating || 0) * Number(product.review_count ?? product.reviews_count ?? 0)),
          0,
        );
        payload = {
          seller: {
            id: legacySeller.id,
            name: legacySeller.name,
            bio: legacySeller.bio || '',
            city: legacySeller.city || '',
            country: legacySeller.country || '',
            sellerType: legacySeller.seller_type || 'product',
            profilePicture: legacySeller.profilePicture || '',
            sellerSince: legacySeller.created_at,
            activeListings: legacyProducts.length,
            reviewCount,
            averageRating: reviewCount ? Math.round((ratingTotal / reviewCount) * 10) / 10 : 0,
          },
          products: legacyProducts,
          pagination: { page: 1, limit: legacyProducts.length, total: legacyProducts.length, totalPages: 1 },
        };
      }
      setSeller(payload.seller);
      setProducts((current) => (append ? [...current, ...(payload.products || [])] : (payload.products || [])));
      setPagination(payload.pagination || null);
    } catch (loadError) {
      console.error('Error fetching seller storefront:', loadError);
      setError(loadError.response?.status === 404 ? t('storefront.notFound') : t('storefront.loadFailed'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t, userId]);

  useEffect(() => {
    const kickoff = window.setTimeout(() => void loadStorefront(), 0);
    return () => window.clearTimeout(kickoff);
  }, [loadStorefront]);

  const formatAmount = (amount) => new Intl.NumberFormat(
    i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA',
    { maximumFractionDigits: 2 },
  ).format(Number(amount || 0));

  const formatJoinedDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(
      i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA',
      { month: 'short', year: 'numeric' },
    ).format(date);
  };

  if (loading) {
    return <main className="storefront-state"><div className="spinner" /><p>{t('storefront.loading')}</p></main>;
  }

  if (!seller || error) {
    return (
      <main className="storefront-state storefront-error">
        <UserCircleIcon aria-hidden="true" />
        <h1>{error || t('storefront.notFound')}</h1>
        <p>{t('storefront.errorLead')}</p>
        <Link to="/products" className="storefront-primary-link">{t('storefront.backToProducts')}</Link>
      </main>
    );
  }

  const joinedDate = formatJoinedDate(seller.sellerSince);
  const location = [seller.city, seller.country].filter(Boolean).join(', ');
  const hasMore = pagination && pagination.page < pagination.totalPages;

  return (
    <main className="seller-storefront">
      <div className="storefront-shell">
        <Link to="/products" className="storefront-back">← {t('storefront.backToProducts')}</Link>

        <section className="storefront-hero" aria-labelledby="storefront-title">
          <div className="storefront-avatar" aria-hidden="true">
            {seller.profilePicture ? <img src={getImageUrl(seller.profilePicture)} alt="" /> : <span>{seller.name?.trim()?.charAt(0)?.toUpperCase() || 'R'}</span>}
          </div>
          <div className="storefront-identity">
            <p className="storefront-eyebrow">{t('storefront.eyebrow')}</p>
            <h1 id="storefront-title">{seller.name}</h1>
            {seller.bio && <p className="storefront-bio">{seller.bio}</p>}
            <div className="storefront-meta">
              {location && <span><MapPinIcon aria-hidden="true" />{location}</span>}
              {joinedDate && <span>{t('storefront.sellingSince', { date: joinedDate })}</span>}
            </div>
          </div>
          <div className="storefront-reputation" aria-label={t('storefront.reputationLabel')}>
            <div>
              <StarIcon aria-hidden="true" />
              <strong>{Number(seller.averageRating || 0).toFixed(1)}</strong>
              <span>{t('storefront.reviews', { count: Number(seller.reviewCount || 0) })}</span>
            </div>
            <div>
              <Squares2X2Icon aria-hidden="true" />
              <strong>{seller.activeListings || 0}</strong>
              <span>{t('storefront.activeListings')}</span>
            </div>
          </div>
        </section>

        <section className="storefront-listings" aria-labelledby="storefront-listings-title">
          <div className="storefront-section-heading">
            <div>
              <p className="storefront-eyebrow">{t('storefront.listingsEyebrow')}</p>
              <h2 id="storefront-listings-title">{t('storefront.listingsTitle', { name: seller.name })}</h2>
            </div>
            <span>{t('storefront.listingCount', { count: pagination?.total || 0 })}</span>
          </div>

          {products.length === 0 ? (
            <div className="storefront-empty">
              <Squares2X2Icon aria-hidden="true" />
              <h3>{t('storefront.emptyTitle')}</h3>
              <p>{t('storefront.emptyLead')}</p>
              <Link to="/products" className="storefront-secondary-link">{t('storefront.browseProducts')}</Link>
            </div>
          ) : (
            <>
              <div className="storefront-product-grid">
                {products.map((product) => {
                  const primaryMedia = product.media?.find((item) => item.is_primary) || product.media?.[0];
                  return (
                    <Link to={`/product/${product.id}`} key={product.id} className="storefront-product-card">
                      <div className="storefront-product-media">
                        {primaryMedia ? (
                          primaryMedia.media_type === 'video' ? <video src={getImageUrl(primaryMedia.media_url)} muted playsInline preload="metadata" aria-label={product.title} /> : <MarketplaceImage source={primaryMedia.media_url} alt={product.title} />
                        ) : <div className="storefront-media-placeholder">📦</div>}
                        {product.condition && <span className="storefront-condition">{t(`productForm.conditionOptions.${product.condition}`, { defaultValue: product.condition })}</span>}
                      </div>
                      <div className="storefront-product-copy">
                        <h3>{product.title}</h3>
                        <div className="storefront-product-footer">
                          <strong>{formatAmount(product.price)} MAD</strong>
                          <span><StarIcon aria-hidden="true" /> {Number(product.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {hasMore && <div className="storefront-load-more"><button type="button" onClick={() => loadStorefront(pagination.page + 1, true)} disabled={loadingMore}>{loadingMore ? t('storefront.loadingMore') : t('storefront.loadMore')}</button></div>}
            </>
          )}
        </section>
      </div>

      <style>{`
        .seller-storefront { min-height: calc(100vh - var(--navbar-height, 76px)); background: linear-gradient(180deg, #f3f8ff 0, #ffffff 28rem); padding: clamp(1.25rem, 3vw, 3rem) 1rem 4rem; }
        .storefront-shell { width: min(1180px, 100%); margin: 0 auto; }
        .storefront-back { display: inline-flex; margin-bottom: 1rem; color: #075ec9; font-weight: 700; text-decoration: none; }
        .storefront-back:hover { text-decoration: underline; }
        .storefront-hero { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: clamp(1rem, 3vw, 2.5rem); padding: clamp(1.3rem, 4vw, 2.75rem); border: 1px solid #d6e6fb; border-radius: 1.5rem; background: rgba(255, 255, 255, .96); box-shadow: 0 1rem 3rem rgba(10, 60, 125, .09); }
        .storefront-avatar { display: grid; width: clamp(5rem, 12vw, 7.5rem); height: clamp(5rem, 12vw, 7.5rem); flex: 0 0 auto; place-items: center; overflow: hidden; border: 4px solid #e4f2ff; border-radius: 50%; background: linear-gradient(135deg, #0d73df, #53b7f4); color: #fff; font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 800; }
        .storefront-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .storefront-eyebrow { margin: 0 0 .35rem; color: #0b69d6; font-size: .75rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .storefront-identity h1, .storefront-section-heading h2 { margin: 0; color: #102a4d; letter-spacing: -.025em; }
        .storefront-identity h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); }
        .storefront-bio { max-width: 42rem; margin: .65rem 0; color: #50627d; line-height: 1.65; white-space: pre-line; }
        .storefront-meta { display: flex; flex-wrap: wrap; gap: .5rem 1rem; color: #60718a; font-size: .9rem; }
        .storefront-meta span { display: inline-flex; align-items: center; gap: .3rem; }
        .storefront-meta svg { width: 1rem; height: 1rem; color: #0b69d6; }
        .storefront-reputation { display: grid; min-width: 13rem; grid-template-columns: repeat(2, 1fr); border: 1px solid #e0ecfa; border-radius: 1rem; overflow: hidden; background: #fbfdff; }
        .storefront-reputation > div { display: grid; min-height: 6.4rem; place-content: center; gap: .2rem; padding: .8rem; text-align: center; }
        .storefront-reputation > div + div { border-inline-start: 1px solid #e0ecfa; }
        .storefront-reputation svg { width: 1.2rem; height: 1.2rem; margin: 0 auto; color: #0b69d6; }
        .storefront-reputation strong { color: #102a4d; font-size: 1.25rem; }
        .storefront-reputation span { color: #697a91; font-size: .75rem; font-weight: 700; }
        .storefront-listings { margin-top: clamp(2rem, 5vw, 4rem); }
        .storefront-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
        .storefront-section-heading h2 { font-size: clamp(1.35rem, 3vw, 1.9rem); }
        .storefront-section-heading > span { color: #65758b; font-weight: 700; }
        .storefront-product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: 1.1rem; }
        .storefront-product-card { overflow: hidden; border: 1px solid #e1ebf7; border-radius: 1rem; background: #fff; color: inherit; text-decoration: none; box-shadow: 0 .35rem 1rem rgba(20, 67, 126, .05); transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .storefront-product-card:hover { transform: translateY(-.25rem); border-color: #9fc9f5; box-shadow: 0 .8rem 1.8rem rgba(20, 67, 126, .13); }
        .storefront-product-media { position: relative; display: grid; height: 11.5rem; place-items: center; overflow: hidden; background: #edf4fb; }
        .storefront-product-media img, .storefront-product-media video { width: 100%; height: 100%; object-fit: cover; }
        .storefront-media-placeholder { font-size: 2.5rem; }
        .storefront-condition { position: absolute; inset: .65rem auto auto .65rem; padding: .28rem .5rem; border-radius: 999px; background: rgba(14, 50, 91, .86); color: #fff; font-size: .68rem; font-weight: 800; }
        .storefront-product-copy { padding: .9rem; }
        .storefront-product-copy h3 { display: -webkit-box; min-height: 2.55rem; margin: 0 0 .65rem; overflow: hidden; color: #172d4b; font-size: .98rem; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .storefront-product-footer { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
        .storefront-product-footer strong { color: #0b69d6; font-size: 1rem; }
        .storefront-product-footer span { display: inline-flex; align-items: center; gap: .2rem; color: #697a91; font-size: .8rem; }
        .storefront-product-footer svg { width: .9rem; color: #e9a20b; }
        .storefront-empty, .storefront-state { display: grid; min-height: 17rem; place-content: center; justify-items: center; gap: .75rem; padding: 2rem; border: 1px dashed #c3d8ee; border-radius: 1rem; background: #fff; color: #62748a; text-align: center; }
        .storefront-empty svg, .storefront-error svg { width: 2.5rem; color: #0b69d6; }
        .storefront-empty h3, .storefront-state h1 { margin: 0; color: #163457; }
        .storefront-empty p, .storefront-state p { max-width: 30rem; margin: 0; line-height: 1.6; }
        .storefront-primary-link, .storefront-secondary-link, .storefront-load-more button { display: inline-flex; align-items: center; justify-content: center; min-height: 2.7rem; padding: .6rem 1rem; border: 0; border-radius: .7rem; background: #0b69d6; color: #fff; font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; }
        .storefront-secondary-link { margin-top: .35rem; }
        .storefront-load-more { display: flex; justify-content: center; margin-top: 1.75rem; }
        .storefront-load-more button:disabled { cursor: wait; opacity: .65; }
        .storefront-state { width: min(720px, calc(100% - 2rem)); margin: 4rem auto; }
        @media (max-width: 760px) { .storefront-hero { grid-template-columns: auto minmax(0, 1fr); padding: 1.2rem; } .storefront-reputation { grid-column: 1 / -1; width: 100%; } .storefront-reputation > div { min-height: 4.7rem; } .storefront-product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; } .storefront-product-media { height: 9rem; } .storefront-product-copy { padding: .7rem; } .storefront-product-footer { align-items: start; flex-direction: column; } }
        @media (max-width: 390px) { .storefront-hero { grid-template-columns: 1fr; text-align: center; } .storefront-avatar { margin: 0 auto; } .storefront-meta { justify-content: center; } .storefront-product-grid { grid-template-columns: 1fr; } .storefront-product-media { height: 12rem; } }
      `}</style>
    </main>
  );
};

export default PublicProfilePage;

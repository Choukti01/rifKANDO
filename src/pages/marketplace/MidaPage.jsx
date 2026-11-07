import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BuildingStorefrontIcon, CakeIcon, MapPinIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import { getProducts } from '../../services/api';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ServiceUnavailableState from '../../components/common/ServiceUnavailableState';
import { useMidaI18n } from '../../i18n/midaI18n';

const channelCategories = {
  market: ['produce', 'oil_olives', 'honey_bees', 'dairy_eggs', 'pantry', 'spices_herbs'],
  kitchen: ['meals', 'bakery_sweets', 'drinks', 'catering'],
};

const MidaPage = () => {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState(() => params.get('search') || '');
  const [category, setCategory] = useState(() => params.get('category') || '');
  const channel = params.get('channel') === 'kitchen' ? 'kitchen' : 'market';
  const { mida, language } = useMidaI18n();
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();

  const fetchItems = useCallback(async () => {
    const response = await getProducts({ section: 'mida', food_channel: channel, search: search || undefined, category: category || undefined, limit: 48 });
    return response.data;
  }, [category, channel, search]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError(false);
    void fetchItems().then((data) => {
      if (!current) return;
      setItems(data.products || []);
    }).catch((error) => {
      console.error('Unable to load Food Market catalogue:', error);
      if (current) setLoadError(true);
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [fetchItems]);

  const selectChannel = (next) => {
    setCategory('');
    setParams(next === 'market' ? {} : { channel: next });
  };
  const applySearch = (event) => {
    event.preventDefault();
    const next = {};
    if (channel === 'kitchen') next.channel = 'kitchen';
    if (search.trim()) next.search = search.trim();
    if (category) next.category = category;
    setParams(next);
  };
  const filterCategory = (next) => {
    setCategory(next);
    const nextParams = {};
    if (channel === 'kitchen') nextParams.channel = 'kitchen';
    if (search.trim()) nextParams.search = search.trim();
    if (next) nextParams.category = next;
    setParams(nextParams);
  };
  const addItem = (item) => {
    if (!isAuthenticated) return toast.error(language === 'ar' ? 'سجّل الدخول لإضافة منتج إلى السلة.' : language === 'fr' ? 'Connectez-vous pour ajouter un produit au panier.' : 'Sign in to add an item to your cart.');
    if (Number(item.seller_id) === Number(user?.id)) return toast.error(language === 'ar' ? 'هذا إعلانك.' : language === 'fr' ? 'C’est votre annonce.' : 'This is your listing.');
    if (Number(item.stock) < 1) return toast.error(language === 'ar' ? 'هذا المنتج غير متوفر حالياً.' : language === 'fr' ? 'Cet article est actuellement indisponible.' : 'This item is out of stock.');
    addToCart(item, 1, 'product');
  };
  const money = (value) => Number(value || 0).toLocaleString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-MA', { maximumFractionDigits: 2 });

  if (loading) return <div className="container py-16"><LoadingSkeleton label={mida.name} /></div>;

  return <div className="mida-page">
    <section className="mida-hero"><div className="container mida-hero__inner">
      <div><span className="mida-kicker">{mida.name}</span><h1>{mida.title}</h1><p>{mida.lead}</p></div>
      <Link to="/seller/dashboard/food-market/add" className="mida-hero__action"><ShoppingCartIcon aria-hidden="true" />{mida.sell}</Link>
    </div></section>
    <main className="container mida-content">
      <div className="mida-channel-switch" role="tablist" aria-label={mida.name}>
        <button type="button" role="tab" aria-selected={channel === 'market'} className={channel === 'market' ? 'is-active' : ''} onClick={() => selectChannel('market')}><BuildingStorefrontIcon aria-hidden="true" /><span><strong>{mida.market}</strong><small>{mida.marketLead}</small></span></button>
        <button type="button" role="tab" aria-selected={channel === 'kitchen'} className={channel === 'kitchen' ? 'is-active' : ''} onClick={() => selectChannel('kitchen')}><CakeIcon aria-hidden="true" /><span><strong>{mida.kitchens}</strong><small>{mida.kitchensLead}</small></span></button>
      </div>
      <form className="mida-filters" onSubmit={applySearch}>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mida.search} aria-label={mida.search} />
        <select value={category} onChange={(event) => filterCategory(event.target.value)} aria-label={mida.category}><option value="">{mida.all}</option>{channelCategories[channel].map((key) => <option key={key} value={key}>{mida.categories[key]}</option>)}</select>
        <button type="submit">{language === 'ar' ? 'بحث' : language === 'fr' ? 'Rechercher' : 'Search'}</button>
      </form>
      {loadError ? <ServiceUnavailableState onRetry={() => window.location.reload()} /> : items.length === 0 ? <section className="mida-empty"><ShoppingCartIcon aria-hidden="true" /><h2>{mida.noListings}</h2><p>{mida.noListingsLead}</p><Link to="/seller/dashboard/food-market/add">{mida.add}</Link></section> : <div className="mida-grid">{items.map((item) => <article className="mida-card" key={item.id}>
        <Link className="mida-card__media" to={`/product/${item.id}`}>{item.media?.[0] ? <MarketplaceImage source={item.media[0].media_url} alt={item.title} /> : <span>🍯</span>}<b>{item.food_channel === 'kitchen' ? mida.kitchens : mida.market}</b></Link>
        <div className="mida-card__body"><div className="mida-card__meta"><span>{mida.categories[item.category] || item.category}</span>{item.listing_city && <span><MapPinIcon aria-hidden="true" />{item.listing_city}</span>}</div><Link to={`/product/${item.id}`}><h2>{item.title}</h2></Link><p>{item.food_origin || item.origin_city}</p><div className="mida-card__price"><strong>{money(item.price)} MAD</strong><span>{mida.units[item.food_unit] || ''}</span></div><small>{mida.delivery}</small><button type="button" disabled={Number(item.stock) < 1 || Number(item.seller_id) === Number(user?.id)} onClick={() => addItem(item)}>{Number(item.stock) < 1 ? (language === 'ar' ? 'غير متوفر' : language === 'fr' ? 'Indisponible' : 'Out of stock') : mida.cod}</button></div>
      </article>)}</div>}
    </main>
    <style>{`
      .mida-page{min-height:calc(100vh - 80px);background:linear-gradient(180deg,#f5fbff 0,#fff 32rem);padding-bottom:4rem}.mida-hero{background:radial-gradient(circle at 88% 15%,rgba(79,183,243,.35),transparent 28%),linear-gradient(135deg,#052a48,#0877bf 62%,#48b2ec);color:#fff}.mida-hero__inner{align-items:center;display:flex;gap:2rem;justify-content:space-between;min-height:16rem;padding-block:3rem}.mida-kicker{font-size:.75rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#c7efff}.mida-hero h1{font-size:clamp(2rem,4vw,3.5rem);line-height:1;margin:.45rem 0 .8rem}.mida-hero p{font-size:1.05rem;line-height:1.65;margin:0;max-width:42rem;color:#e6f7ff}.mida-hero__action{align-items:center;background:#fff;color:#075d98;display:inline-flex;font-weight:800;gap:.55rem;justify-content:center;min-height:3rem;padding:.85rem 1.1rem;border-radius:999px;white-space:nowrap}.mida-hero__action svg{height:1.2rem;width:1.2rem}.mida-content{padding-top:2rem}.mida-channel-switch{display:grid;gap:1rem;grid-template-columns:1fr 1fr;margin-bottom:1.25rem}.mida-channel-switch button{align-items:flex-start;background:rgba(255,255,255,.85);border:1px solid #dbeaf4;border-radius:1rem;color:#26445b;cursor:pointer;display:flex;gap:.8rem;padding:1rem;text-align:start}.mida-channel-switch button.is-active{background:#fff;border-color:#1b91d0;box-shadow:0 10px 30px rgba(6,101,160,.12)}.mida-channel-switch svg{background:#e3f6ff;border-radius:.7rem;color:#0877bf;height:2.55rem;padding:.55rem;width:2.55rem}.mida-channel-switch strong,.mida-channel-switch small{display:block}.mida-channel-switch strong{font-size:1rem;margin:.1rem 0 .3rem}.mida-channel-switch small{color:#64748b;line-height:1.4}.mida-filters{background:#fff;border:1px solid #dceaf3;border-radius:1rem;display:grid;gap:.7rem;grid-template-columns:1fr minmax(11rem,.35fr) auto;margin-bottom:1.5rem;padding:.7rem}.mida-filters input,.mida-filters select{border:1px solid #d5e2eb;border-radius:.65rem;font:inherit;min-height:2.8rem;padding:0 .8rem}.mida-filters button,.mida-card button{background:#0877bf;border:0;border-radius:.65rem;color:#fff;cursor:pointer;font:inherit;font-weight:800;min-height:2.8rem;padding:0 1rem}.mida-grid{display:grid;gap:1.15rem;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.mida-card{background:#fff;border:1px solid #e1ebf1;border-radius:1.15rem;box-shadow:0 8px 25px rgba(20,77,110,.06);display:flex;flex-direction:column;overflow:hidden}.mida-card__media{background:#eaf5fa;display:block;height:12rem;position:relative}.mida-card__media img{height:100%;object-fit:cover;width:100%}.mida-card__media>span{display:grid;font-size:4rem;height:100%;place-items:center}.mida-card__media b{background:rgba(3,39,66,.8);border-radius:999px;color:#fff;font-size:.67rem;left:.75rem;padding:.35rem .55rem;position:absolute;top:.75rem}.mida-card__body{display:flex;flex:1;flex-direction:column;padding:1rem}.mida-card__meta{display:flex;gap:.55rem;justify-content:space-between;color:#668093;font-size:.72rem;font-weight:700}.mida-card__meta span:last-child{align-items:center;display:flex;gap:.2rem}.mida-card__meta svg{height:.8rem;width:.8rem}.mida-card h2{color:#102a43;font-size:1.05rem;line-height:1.3;margin:.55rem 0 .35rem}.mida-card p{color:#607489;font-size:.82rem;margin:0}.mida-card__price{align-items:baseline;display:flex;gap:.45rem;margin-top:auto;padding-top:1rem}.mida-card__price strong{color:#075d98;font-size:1.05rem}.mida-card__price span{color:#6a7e90;font-size:.75rem}.mida-card small{color:#607489;font-size:.71rem;line-height:1.4;margin:.8rem 0}.mida-card button:disabled{background:#c4d0d8;cursor:not-allowed}.mida-empty{align-items:center;background:#fff;border:1px dashed #b9d7e8;border-radius:1rem;display:flex;flex-direction:column;padding:4rem 1.5rem;text-align:center}.mida-empty svg{color:#0877bf;height:3rem;width:3rem}.mida-empty h2{margin:1rem 0 .35rem}.mida-empty p{color:#607489;max-width:34rem}.mida-empty a{background:#0877bf;border-radius:.65rem;color:#fff;font-weight:800;margin-top:.6rem;padding:.75rem 1rem}@media(max-width:700px){.mida-hero__inner{align-items:flex-start;flex-direction:column;min-height:0}.mida-hero__action{width:100%}.mida-channel-switch,.mida-filters{grid-template-columns:1fr}.mida-card__media{height:13rem}}`}</style>
  </div>;
};

export default MidaPage;

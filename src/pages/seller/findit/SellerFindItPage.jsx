import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CheckBadgeIcon, MapPinIcon, MagnifyingGlassIcon, PaperAirplaneIcon, TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { createFinditOffer, getFinditRequests, getSellerFinditOffers, withdrawFinditOffer } from '../../../services/api';

const defaultOffer = { title: '', description: '', price: '', delivery_fee: '', condition: 'new', estimated_delivery_days: 3 };
const categoryKeys = { 'Auto & Parts': 'auto', 'Phones & Electronics': 'electronics', 'Home & Appliances': 'home', 'Tools & Equipment': 'tools', 'Fashion & Accessories': 'fashion', Other: 'other' };

const SellerFindItPage = () => {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [form, setForm] = useState(defaultOffer);
  const [sending, setSending] = useState(false);

  const locale = i18n.language === 'ar' ? 'ar-MA' : undefined;
  const formatMoney = (value) => `${Number(value || 0).toLocaleString(locale)} MAD`;
  const formatExpiry = (value) => new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const status = (value) => t(`findit.status.${value}`, { defaultValue: value });
  const category = (value) => categoryKeys[value] ? t(`findit.form.categories.${categoryKeys[value]}`) : value;

  const load = useCallback(async () => {
    try {
      const [requestsResponse, offersResponse] = await Promise.all([getFinditRequests({ page: 1, limit: 50 }), getSellerFinditOffers()]);
      setRequests(requestsResponse.data.requests || []);
      setOffers(offersResponse.data.offers || []);
    } catch (error) {
      toast.error(error.response?.data?.error || t('findit.seller.loading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let current = true;
    Promise.all([getFinditRequests({ page: 1, limit: 50 }), getSellerFinditOffers()])
      .then(([requestsResponse, offersResponse]) => {
        if (!current) return;
        setRequests(requestsResponse.data.requests || []);
        setOffers(offersResponse.data.offers || []);
      })
      .catch((error) => { if (current) toast.error(error.response?.data?.error || t('findit.seller.loading')); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [t]);

  const existingFor = (requestId) => offers.find((offer) => Number(offer.request_id) === Number(requestId));
  const openOffer = (request) => { setSelectedRequest(request); setForm({ ...defaultOffer, title: request.title }); };

  const sendOffer = async (event) => {
    event.preventDefault();
    if (!selectedRequest) return;
    const price = Number(form.price);
    const deliveryFee = Number(form.delivery_fee || 0);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(deliveryFee) || deliveryFee < 0) {
      toast.error(t('findit.seller.price'));
      return;
    }
    setSending(true);
    try {
      await createFinditOffer(selectedRequest.id, { ...form, price, delivery_fee: deliveryFee, estimated_delivery_days: Number(form.estimated_delivery_days) });
      toast.success(t('findit.seller.sent'));
      setSelectedRequest(null);
      setForm(defaultOffer);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || t('findit.seller.send'));
    } finally {
      setSending(false);
    }
  };

  const withdraw = async (id) => {
    if (!window.confirm(t('findit.seller.withdrawConfirm'))) return;
    try {
      await withdrawFinditOffer(id);
      toast.success(t('findit.seller.withdrawn'));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || t('findit.seller.withdraw'));
    }
  };

  return (
    <main className="seller-findit-page">
      <section className="seller-findit-head">
        <div><p>{t('findit.seller.eyebrow')}</p><h1>{t('findit.seller.title')}</h1><span>{t('findit.seller.lead')}</span></div>
        <aside><CheckBadgeIcon /><strong>{t('findit.seller.independent')}</strong><p>{t('findit.seller.independentText')}</p></aside>
      </section>

      <div className="seller-findit-layout">
        <section>
          <div className="seller-findit-heading"><div><p>{t('findit.seller.requests')}</p><h2>{t('findit.seller.heading')}</h2></div><span>{t('findit.seller.open', { count: requests.length })}</span></div>
          {loading ? <div className="seller-findit-empty">{t('findit.seller.loading')}</div> : requests.length === 0 ? (
            <div className="seller-findit-empty"><MagnifyingGlassIcon /><h2>{t('findit.seller.emptyTitle')}</h2><p>{t('findit.seller.emptyText')}</p></div>
          ) : (
            <div className="seller-findit-request-list">
              {requests.map((request) => {
                const ownOffer = existingFor(request.id);
                return (
                  <article className="seller-findit-request" key={request.id}>
                    <div className="seller-findit-request-top"><div><span>{category(request.category)}</span><h3>{request.title}</h3></div><small>{t('findit.public.expires', { date: formatExpiry(request.expires_at) })}</small></div>
                    <p>{request.description}</p>
                    <div className="seller-findit-request-facts"><span><MapPinIcon />{request.city}</span><span><TagIcon />{request.budget_max > 0 ? t('findit.seller.budgetUpTo', { amount: formatMoney(request.budget_max) }) : t('findit.seller.budgetOpen')}</span><span>{request.preferred_condition === 'any' ? t('findit.seller.anyCondition') : t('findit.seller.requestedCondition', { condition: status(request.preferred_condition) })}</span></div>
                    {request.media?.length > 0 && <div className="seller-findit-media">{request.media.map((media) => <img key={media.media_url} src={media.media_url} alt={request.title} />)}</div>}
                    <footer>{ownOffer ? <span className={`seller-findit-existing ${ownOffer.status}`}>{t('findit.seller.yourSolution', { status: status(ownOffer.status) })}</span> : <button onClick={() => openOffer(request)}><PaperAirplaneIcon />{t('findit.seller.send')}</button>}<span>{t('findit.public.offer', { count: request.offer_count })}</span></footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="seller-findit-offers">
          <div className="seller-findit-heading"><div><p>{t('findit.seller.solutions')}</p><h2>{t('findit.seller.status')}</h2></div></div>
          {offers.length === 0 ? <p className="seller-findit-offer-empty">{t('findit.seller.noSolutions')}</p> : <div className="seller-findit-offer-list">{offers.map((offer) => <article key={offer.id}><div><span className={`seller-findit-existing ${offer.status}`}>{status(offer.status)}</span><h3>{offer.title}</h3><p>{offer.request?.title}</p></div><strong>{formatMoney(Number(offer.price) + Number(offer.delivery_fee || 0))} COD</strong>{offer.status === 'active' && <button onClick={() => withdraw(offer.id)}>{t('findit.seller.withdraw')}</button>}</article>)}</div>}
        </aside>
      </div>

      {selectedRequest && (
        <div className="seller-findit-overlay" role="dialog" aria-modal="true" aria-label={t('findit.seller.reply')}>
          <form className="seller-findit-form" onSubmit={sendOffer}>
            <button className="seller-findit-close" type="button" onClick={() => setSelectedRequest(null)} aria-label={t('common.closeMenu')}><XMarkIcon /></button>
            <p>{t('findit.seller.reply')}</p><h2>{selectedRequest.title}</h2><span className="seller-findit-form-note">{t('findit.seller.formNote')}</span>
            <label><span>{t('findit.seller.solutionTitle')}</span><input value={form.title} minLength="3" maxLength="160" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></label>
            <label><span>{t('findit.seller.solutionDescription')}</span><textarea value={form.description} minLength="10" maxLength="2000" rows="4" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required /></label>
            <div className="seller-findit-form-grid">
              <label><span>{t('findit.seller.price')}</span><input value={form.price} type="number" min="0.01" step="0.01" onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required /></label>
              <label><span>{t('findit.seller.deliveryFee')}</span><input value={form.delivery_fee} type="number" min="0" step="0.01" onChange={(event) => setForm((current) => ({ ...current, delivery_fee: event.target.value }))} placeholder={t('findit.seller.deliveryIncluded')} required /></label>
              <label><span>{t('findit.form.condition')}</span><select value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}><option value="new">{status('new')}</option><option value="used">{status('used')}</option><option value="refurbished">{status('refurbished')}</option></select></label>
              <label><span>{t('findit.seller.estimate')}</span><select value={form.estimated_delivery_days} onChange={(event) => setForm((current) => ({ ...current, estimated_delivery_days: event.target.value }))}>{[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((days) => <option key={days} value={days}>{t('findit.form.days', { count: days })}</option>)}</select></label>
            </div>
            <div className="seller-findit-commission"><CheckBadgeIcon />{t('findit.seller.commission')}</div>
            <button className="seller-findit-send" disabled={sending}>{sending ? t('findit.seller.sending') : t('findit.seller.sent')}</button>
          </form>
        </div>
      )}

      <style>{`
        .seller-findit-page{max-width:1240px;margin:0 auto;padding:1.25rem 0 2rem}.seller-findit-head,.seller-findit-request,.seller-findit-offers,.seller-findit-empty,.seller-findit-form{background:#fff;border:1px solid #dce8f2;border-radius:1rem;box-shadow:0 8px 22px rgba(10,27,53,.045)}.seller-findit-head{align-items:center;display:grid;gap:2rem;grid-template-columns:minmax(0,1.25fr) minmax(16rem,.55fr);padding:clamp(1.35rem,4vw,2.2rem)}.seller-findit-head>div>p,.seller-findit-heading p,.seller-findit-form>p{color:var(--color-brand-blue);font-size:.72rem;font-weight:900;letter-spacing:.1em;margin:0 0 .5rem;text-transform:uppercase}.seller-findit-head h1{color:var(--color-brand-ink);font-size:clamp(1.7rem,3.4vw,2.7rem);letter-spacing:-.05em;line-height:1.06;margin:0}.seller-findit-head>div>span{color:#607084;display:block;font-size:.91rem;line-height:1.65;margin-top:.85rem;max-width:43rem}.seller-findit-head aside{background:var(--color-brand-ink);border-radius:.85rem;color:#fff;padding:1rem}.seller-findit-head aside>svg{color:var(--color-brand-blue);height:1.65rem;width:1.65rem}.seller-findit-head aside strong{display:block;font-size:.95rem;margin-top:.45rem}.seller-findit-head aside p{color:#d7eaff;font-size:.78rem;line-height:1.55;margin:.4rem 0 0}.seller-findit-layout{align-items:start;display:grid;gap:1.25rem;grid-template-columns:minmax(0,1fr) minmax(16rem,.36fr);margin-top:1.3rem}.seller-findit-heading{align-items:end;display:flex;justify-content:space-between;margin-bottom:.85rem}.seller-findit-heading h2{font-size:1.25rem;letter-spacing:-.035em;margin:0}.seller-findit-heading>span{color:#68788d;font-size:.75rem}.seller-findit-request-list{display:grid;gap:.8rem}.seller-findit-request{padding:1rem}.seller-findit-request-top,.seller-findit-request footer{align-items:start;display:flex;justify-content:space-between}.seller-findit-request-top span{color:var(--color-brand-blue);font-size:.68rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.seller-findit-request-top h3{font-size:1.03rem;line-height:1.3;margin:.35rem 0 0}.seller-findit-request-top small,.seller-findit-request footer>span{color:#6d7c8f;font-size:.72rem}.seller-findit-request>p{color:#607084;font-size:.81rem;line-height:1.55;margin:.65rem 0}.seller-findit-request-facts{display:flex;flex-wrap:wrap;gap:.45rem}.seller-findit-request-facts span{align-items:center;background:#f4f8fb;border-radius:99rem;color:#56677b;display:inline-flex;font-size:.71rem;font-weight:750;gap:.25rem;padding:.32rem .48rem}.seller-findit-request-facts svg{color:var(--color-brand-blue);height:.82rem;width:.82rem}.seller-findit-media{display:flex;gap:.45rem;margin-top:.7rem}.seller-findit-media img{border:1px solid #dce8f2;border-radius:.5rem;height:3.8rem;object-fit:cover;width:3.8rem}.seller-findit-request footer{align-items:center;border-top:1px solid #e7eef4;margin-top:.8rem;padding-top:.7rem}.seller-findit-request footer button,.seller-findit-send{align-items:center;background:var(--color-brand-ink);border:0;border-radius:.6rem;color:#fff;cursor:pointer;display:inline-flex;font:inherit;font-size:.78rem;font-weight:800;gap:.35rem;padding:.65rem .78rem}.seller-findit-request footer button svg{height:.9rem;width:.9rem}.seller-findit-offers{padding:1rem}.seller-findit-offer-empty{color:#68788d;font-size:.8rem;line-height:1.55;margin:0}.seller-findit-offer-list{display:grid;gap:.7rem}.seller-findit-offer-list article{border-top:1px solid #e6eef5;padding-top:.7rem}.seller-findit-offer-list h3{font-size:.87rem;margin:.45rem 0 .18rem}.seller-findit-offer-list p{color:#68788d;font-size:.73rem;margin:0}.seller-findit-offer-list strong{display:block;font-size:.78rem;margin:.55rem 0}.seller-findit-offer-list button{background:none;border:0;color:#a13737;cursor:pointer;font-size:.72rem;font-weight:800;padding:0}.seller-findit-existing{border-radius:99rem;display:inline-block;font-size:.66rem;font-weight:900;letter-spacing:.04em;padding:.28rem .45rem;text-transform:uppercase}.seller-findit-existing.active{background:#e3f5ed;color:#126747}.seller-findit-existing.accepted{background:#e5f2ff;color:#1767a8}.seller-findit-existing.withdrawn,.seller-findit-existing.rejected{background:#fce8e8;color:#a13737}.seller-findit-overlay{align-items:center;background:rgba(5,20,37,.65);display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:1100}.seller-findit-form{max-height:calc(100vh - 2rem);max-width:39rem;overflow:auto;padding:1.25rem;position:relative;width:100%}.seller-findit-close{background:none;border:0;color:#5e7084;cursor:pointer;position:absolute;right:.7rem;top:.7rem}.seller-findit-close svg{height:1.3rem;width:1.3rem}.seller-findit-form h2{font-size:1.2rem;margin:0}.seller-findit-form-note{color:#617186;display:block;font-size:.78rem;line-height:1.5;margin:.6rem 0 .9rem}.seller-findit-form label{display:grid;gap:.32rem;margin-top:.7rem}.seller-findit-form label span{color:#506175;font-size:.73rem;font-weight:800}.seller-findit-form input,.seller-findit-form textarea,.seller-findit-form select{border:1px solid #cad9e5;border-radius:.55rem;font:inherit;padding:.62rem}.seller-findit-form-grid{display:grid;gap:.7rem;grid-template-columns:repeat(2,1fr)}.seller-findit-commission{align-items:flex-start;background:#f4f9fd;color:#5d6d80;display:flex;font-size:.76rem;gap:.4rem;line-height:1.45;margin:1rem 0;padding:.7rem}.seller-findit-commission svg{color:var(--color-brand-blue);flex:0 0 auto;height:1rem;width:1rem}.seller-findit-send{justify-content:center;width:100%}.seller-findit-send:disabled{cursor:not-allowed;opacity:.6}.seller-findit-empty{color:#66778a;padding:3rem;text-align:center}.seller-findit-empty svg{color:var(--color-brand-blue);height:2rem;width:2rem}.seller-findit-empty h2{color:var(--color-brand-ink);font-size:1.1rem;margin:.6rem 0 .35rem}.seller-findit-empty p{margin:0}@media(max-width:850px){.seller-findit-layout{grid-template-columns:1fr}.seller-findit-offers{order:-1}}@media(max-width:620px){.seller-findit-page{padding-top:.5rem}.seller-findit-head,.seller-findit-form-grid{grid-template-columns:1fr}.seller-findit-request footer{align-items:flex-start;flex-direction:column;gap:.55rem}}
      `}</style>
    </main>
  );
};

export default SellerFindItPage;

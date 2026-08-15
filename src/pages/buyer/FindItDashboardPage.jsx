import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon, TruckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import FindItRequestForm from '../../components/findit/FindItRequestForm';
import { acceptFinditOffer, cancelFinditRequest, getMyFinditRequests } from '../../services/api';
import useAuth from '../../hooks/useAuth';

const emptyAddress = (user) => ({ fullName: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: '', city: user?.city || '', postalCode: '' });
const categoryKeys = { 'Auto & Parts': 'auto', 'Phones & Electronics': 'electronics', 'Home & Appliances': 'home', 'Tools & Equipment': 'tools', 'Fashion & Accessories': 'fashion', Other: 'other' };

const FindItDashboardPage = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [address, setAddress] = useState(() => emptyAddress(user));
  const [notes, setNotes] = useState('');
  const [accepting, setAccepting] = useState(false);

  const locale = i18n.language === 'ar' ? 'ar-MA' : undefined;
  const formatMoney = (value) => `${Number(value || 0).toLocaleString(locale)} MAD`;
  const formatDate = (value) => new Date(value).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const labelStatus = (value) => t(`findit.status.${value}`, { defaultValue: value });
  const labelCondition = (value) => t(`findit.status.${value}`, { defaultValue: value });
  const labelCategory = (value) => categoryKeys[value] ? t(`findit.form.categories.${categoryKeys[value]}`) : value;

  const load = useCallback(async () => {
    try {
      const response = await getMyFinditRequests();
      setRequests(response.data.requests || []);
    } catch (error) {
      toast.error(error.response?.data?.error || t('findit.buyer.loading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let current = true;
    getMyFinditRequests()
      .then((response) => { if (current) setRequests(response.data.requests || []); })
      .catch((error) => { if (current) toast.error(error.response?.data?.error || t('findit.buyer.loading')); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [t]);

  const activeCount = useMemo(() => requests.filter((request) => request.status === 'active').length, [requests]);

  const cancel = async (requestId) => {
    if (!window.confirm(t('findit.buyer.cancelConfirm'))) return;
    try {
      await cancelFinditRequest(requestId);
      toast.success(t('findit.buyer.cancelled'));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || t('findit.buyer.cancel'));
    }
  };

  const chooseOffer = (request, offer) => {
    setSelectedOffer({ request, offer });
    setAddress(emptyAddress(user));
    setNotes('');
  };

  const accept = async (event) => {
    event.preventDefault();
    if (!selectedOffer) return;
    setAccepting(true);
    try {
      const key = typeof window.crypto?.randomUUID === 'function'
        ? `findit-${window.crypto.randomUUID()}`
        : `findit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await acceptFinditOffer(selectedOffer.offer.id, { shippingAddress: address, notes }, key);
      toast.success(t('findit.buyer.created'));
      navigate(`/orders/${response.data.order.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || t('findit.buyer.confirm'));
    } finally {
      setAccepting(false);
    }
  };

  const addressLabels = {
    fullName: t('findit.buyer.fullName'), email: t('findit.buyer.email'), phone: t('findit.buyer.phone'),
    address: t('findit.buyer.address'), city: t('findit.buyer.city'), postalCode: t('findit.buyer.postalCode'),
  };

  return (
    <main className="findit-dashboard-page">
      <section className="findit-dashboard-hero">
        <div className="container">
          <p>{t('findit.buyer.eyebrow')}</p>
          <h1>{t('findit.buyer.title')}</h1>
          <span>{t('findit.buyer.lead')}</span>
          <div className="findit-active-count"><strong>{activeCount}</strong><small>{t('findit.buyer.active', { count: activeCount })}</small></div>
        </div>
      </section>

      <div className="container findit-dashboard-content">
        <FindItRequestForm onCreated={(request) => setRequests((current) => [{ ...request, offers: [] }, ...current])} />

        <section className="findit-my-requests">
          <div className="findit-dashboard-heading">
            <div><p>{t('findit.buyer.requests')}</p><h2>{t('findit.buyer.solutionsHeading')}</h2></div>
            <span>{t('findit.buyer.privateOffers')}</span>
          </div>

          {loading ? <div className="findit-dashboard-empty">{t('findit.buyer.loading')}</div> : requests.length === 0 ? (
            <div className="findit-dashboard-empty"><PaperAirplaneIcon /><h2>{t('findit.buyer.emptyTitle')}</h2><p>{t('findit.buyer.emptyText')}</p></div>
          ) : (
            <div className="findit-my-request-list">
              {requests.map((request) => {
                const offers = request.offers || [];
                return (
                  <article className="findit-my-request" key={request.id}>
                    <header>
                      <div>
                        <span className={`findit-state ${request.status}`}>{labelStatus(request.status)}</span>
                        <h3>{request.title}</h3>
                        <p>{labelCategory(request.category)} · {request.city} · {request.budget_max > 0 ? t('findit.buyer.budgetUpTo', { amount: formatMoney(request.budget_max) }) : t('findit.buyer.openBudget')}</p>
                      </div>
                      {request.status === 'active' && <button className="findit-cancel-request" onClick={() => cancel(request.id)}>{t('findit.buyer.cancel')}</button>}
                    </header>
                    <p className="findit-request-description">{request.description}</p>
                    <div className="findit-offer-heading"><strong>{t('findit.buyer.solution', { count: offers.length })}</strong><span>{t('findit.public.expires', { date: formatDate(request.expires_at) })}</span></div>
                    {offers.length === 0 ? <div className="findit-no-offers">{t('findit.buyer.noSolutions')}</div> : (
                      <div className="findit-buyer-offers">
                        {offers.map((offer) => {
                          const total = Number(offer.price) + Number(offer.delivery_fee || 0);
                          return (
                            <article className="findit-buyer-offer" key={offer.id}>
                              <div className="findit-offer-title"><div><span>{offer.seller.name}</span><h4>{offer.title}</h4></div><span className={`findit-offer-state ${offer.status}`}>{labelStatus(offer.status)}</span></div>
                              <p>{offer.description}</p>
                              <dl>
                                <div><dt>{t('findit.buyer.item')}</dt><dd>{formatMoney(offer.price)}</dd></div>
                                <div><dt>{t('findit.buyer.delivery')}</dt><dd>{Number(offer.delivery_fee) > 0 ? formatMoney(offer.delivery_fee) : t('findit.buyer.included')}</dd></div>
                                <div><dt>{t('findit.buyer.arrival')}</dt><dd>{t('findit.form.days', { count: offer.estimated_delivery_days })}</dd></div>
                                <div><dt>{t('findit.buyer.condition')}</dt><dd>{labelCondition(offer.condition)}</dd></div>
                              </dl>
                              <footer><strong>{t('findit.buyer.totalCod', { amount: formatMoney(total) })}</strong>{request.status === 'active' && offer.status === 'active' && <button onClick={() => chooseOffer(request, offer)}>{t('findit.buyer.choose')}</button>}</footer>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedOffer && (
        <div className="findit-checkout-overlay" role="dialog" aria-modal="true" aria-label={t('findit.buyer.checkoutEyebrow')}>
          <form className="findit-checkout-card" onSubmit={accept}>
            <button className="findit-close-checkout" type="button" onClick={() => setSelectedOffer(null)} aria-label={t('common.closeMenu')}><XCircleIcon /></button>
            <p>{t('findit.buyer.checkoutEyebrow')}</p><h2>{selectedOffer.offer.title}</h2>
            <div className="findit-checkout-total"><span>{t('findit.buyer.checkoutTotal')}</span><strong>{formatMoney(Number(selectedOffer.offer.price) + Number(selectedOffer.offer.delivery_fee || 0))}</strong></div>
            <div className="findit-address-grid">
              {Object.entries(addressLabels).map(([field, label]) => <label key={field}><span>{label}</span><input required={field !== 'postalCode'} value={address[field]} type={field === 'email' ? 'email' : 'text'} onChange={(event) => setAddress((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
            </div>
            <label className="findit-notes"><span>{t('findit.buyer.notes')}</span><textarea value={notes} maxLength="1000" rows="3" onChange={(event) => setNotes(event.target.value)} placeholder={t('findit.buyer.notesPlaceholder')} /></label>
            <div className="findit-cod-note"><TruckIcon />{t('findit.buyer.codNotice')}</div>
            <button className="findit-confirm-offer" disabled={accepting}>{accepting ? t('findit.buyer.creating') : t('findit.buyer.confirm')}</button>
          </form>
        </div>
      )}

      <style>{`
        .findit-dashboard-page{background:#f8fafc;min-height:calc(100vh - 80px);padding:2rem 0 4.5rem}.findit-dashboard-hero .container,.findit-my-request,.findit-dashboard-empty,.findit-checkout-card{background:#fff;border:1px solid #dce8f2;border-radius:1rem;box-shadow:0 8px 22px rgba(10,27,53,.045)}.findit-dashboard-hero .container{padding:clamp(1.35rem,3vw,2.25rem)}.findit-dashboard-hero p,.findit-dashboard-heading p,.findit-checkout-card>p{color:var(--color-brand-blue);font-size:.72rem;font-weight:900;letter-spacing:.1em;margin:0 0 .55rem;text-transform:uppercase}.findit-dashboard-hero h1{color:var(--color-brand-ink);font-size:clamp(1.8rem,4vw,2.85rem);letter-spacing:-.055em;line-height:1.08;margin:0}.findit-dashboard-hero>div>span{color:#607084;display:block;font-size:.94rem;line-height:1.6;margin-top:.8rem;max-width:39rem}.findit-active-count{align-items:baseline;background:#f4f8fb;border-radius:.65rem;display:inline-flex;gap:.35rem;margin-top:1rem;padding:.5rem .65rem}.findit-active-count strong{color:var(--color-brand-ink);font-size:1.1rem}.findit-active-count small{color:#607084;font-size:.74rem}.findit-dashboard-content{display:grid;gap:2.25rem;padding-top:1.6rem}.findit-dashboard-heading{align-items:end;border-bottom:1px solid #e4edf4;display:flex;justify-content:space-between;margin-bottom:1rem;padding-bottom:.8rem}.findit-dashboard-heading h2{color:var(--color-brand-ink);font-size:1.45rem;letter-spacing:-.035em;margin:0}.findit-dashboard-heading>span{color:#617186;font-size:.8rem;max-width:18rem;text-align:end}.findit-my-request-list{display:grid;gap:1rem}.findit-my-request{padding:1rem}.findit-my-request header,.findit-offer-heading,.findit-buyer-offer footer{align-items:center;display:flex;gap:1rem;justify-content:space-between}.findit-state,.findit-offer-state{border-radius:999px;display:inline-block;font-size:.65rem;font-weight:850;letter-spacing:.04em;padding:.25rem .45rem;text-transform:uppercase}.findit-state.active,.findit-offer-state.active{background:#e3f5ed;color:#126747}.findit-state.cancelled,.findit-offer-state.withdrawn{background:#fce8e8;color:#a13737}.findit-my-request h3{margin:.45rem 0 .25rem}.findit-my-request header p,.findit-request-description,.findit-buyer-offer>p{color:#607084;font-size:.81rem;line-height:1.55;margin:.35rem 0 0}.findit-cancel-request,.findit-buyer-offer footer button,.findit-confirm-offer{background:var(--color-brand-ink);border:0;border-radius:.6rem;color:#fff;cursor:pointer;font:inherit;font-size:.78rem;font-weight:800;padding:.65rem .78rem}.findit-cancel-request{background:#fff0f0;color:#a13737}.findit-offer-heading{border-top:1px solid #e7eef4;margin-top:1rem;padding-top:.8rem}.findit-offer-heading span{color:#718095;font-size:.72rem}.findit-no-offers{background:#f6faff;border-radius:.7rem;color:#607084;font-size:.81rem;line-height:1.55;margin-top:.8rem;padding:.8rem}.findit-buyer-offers{display:grid;gap:.75rem;margin-top:.85rem}.findit-buyer-offer{border:1px solid #dce8f2;border-radius:.75rem;padding:.85rem}.findit-offer-title{align-items:start;display:flex;gap:.5rem;justify-content:space-between}.findit-offer-title span{color:#68788d;font-size:.75rem}.findit-offer-title h4{margin:.2rem 0 0}.findit-buyer-offer dl{display:grid;gap:.55rem;grid-template-columns:repeat(4,minmax(0,1fr));margin:.8rem 0}.findit-buyer-offer dt{color:#718095;font-size:.68rem;font-weight:750}.findit-buyer-offer dd{color:var(--color-brand-ink);font-size:.77rem;font-weight:800;margin:.15rem 0 0}.findit-buyer-offer footer{border-top:1px solid #e7eef4;padding-top:.7rem}.findit-checkout-overlay{align-items:center;background:rgba(5,20,37,.65);display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:1100}.findit-checkout-card{max-height:calc(100vh - 2rem);max-width:42rem;overflow:auto;padding:1.25rem;position:relative;width:100%}.findit-close-checkout{background:none;border:0;color:#5e7084;cursor:pointer;position:absolute;right:.8rem;top:.8rem}.findit-close-checkout svg{height:1.3rem;width:1.3rem}.findit-checkout-card h2{font-size:1.2rem;margin:0}.findit-checkout-total{background:#f2f8fd;border:1px solid #d8e9f6;border-radius:.7rem;display:flex;justify-content:space-between;margin:1rem 0;padding:.8rem}.findit-checkout-total span,.findit-address-grid span,.findit-notes span{color:#506175;font-size:.73rem;font-weight:800}.findit-address-grid{display:grid;gap:.7rem;grid-template-columns:repeat(2,1fr)}.findit-address-grid label,.findit-notes{display:grid;gap:.32rem}.findit-address-grid input,.findit-notes textarea{border:1px solid #cad9e5;border-radius:.55rem;font:inherit;padding:.62rem}.findit-notes{margin-top:.7rem}.findit-cod-note{align-items:flex-start;background:#f8fafc;color:#5a6b7e;display:flex;font-size:.76rem;gap:.45rem;line-height:1.45;margin:1rem 0;padding:.7rem}.findit-cod-note svg{color:var(--color-brand-blue);flex:0 0 auto;height:1rem;width:1rem}.findit-confirm-offer{font-size:.86rem;width:100%}.findit-confirm-offer:disabled{cursor:not-allowed;opacity:.6}.findit-dashboard-empty{color:#66778a;padding:3rem;text-align:center}.findit-dashboard-empty svg{color:var(--color-brand-blue);height:2rem;width:2rem}.findit-dashboard-empty h2{color:var(--color-brand-ink);font-size:1.1rem;margin:.6rem 0 .35rem}@media(max-width:680px){.findit-dashboard-page{padding-top:1rem}.findit-dashboard-heading,.findit-my-request header,.findit-buyer-offer footer{align-items:flex-start;flex-direction:column}.findit-dashboard-heading>span{text-align:start;margin-top:.5rem}.findit-buyer-offer dl,.findit-address-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.findit-checkout-card{border-radius:.85rem}}
      `}</style>
    </main>
  );
};

export default FindItDashboardPage;

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircleIcon, ChatBubbleLeftRightIcon, ClockIcon, CubeIcon, TruckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';

const statusConfig = {
  pending_confirmation: { label: 'Needs confirmation', icon: ClockIcon, tone: 'amber' },
  confirmed: { label: 'Pickup coordination', icon: ChatBubbleLeftRightIcon, tone: 'blue' },
  shipped: { label: 'With delivery network', icon: TruckIcon, tone: 'violet' },
  delivered: { label: 'Cash collected', icon: CheckCircleIcon, tone: 'emerald' },
  refused: { label: 'Customer refused', icon: XCircleIcon, tone: 'red' },
  returned: { label: 'Returned to seller', icon: XCircleIcon, tone: 'red' },
  cancelled: { label: 'Cancelled', icon: XCircleIcon, tone: 'slate' },
};

const money = (value) => `${Number(value || 0).toLocaleString()} MAD`;

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const loadOrders = async () => {
    try {
      const [ordersResponse, partnerResponse] = await Promise.all([
        api.get('/seller/orders'),
        api.get('/seller/cod-delivery-partner'),
      ]);
      setOrders(ordersResponse.data.orders || []);
      setPartner(partnerResponse.data.partner || null);
    } catch (error) {
      console.error('Seller COD orders could not be loaded:', error);
      toast.error(error.response?.data?.error || 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  const performAction = async (order, action) => {
    const fulfillmentId = order.fulfillment_id;
    setUpdating(fulfillmentId);
    try {
      await api.patch(`/seller/cod-fulfillments/${fulfillmentId}`, { action });
      toast.success({
        confirm: 'COD order confirmed. You can now arrange pickup.',
        request_handoff: 'Pickup request recorded. Toufiq will coordinate the next steps.',
        cancel: 'COD order cancelled.',
      }[action] || 'COD order updated.');
      await loadOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'The COD order could not be updated.');
    } finally {
      setUpdating(null);
    }
  };

  const sellerWhatsAppLink = (order) => {
    if (!partner?.whatsappNumber) return '#';
    const message = `Hello ${partner.name}, I am the seller for rifKANDO COD order ${order.order_number}. The parcel (${order.item_title || 'COD order'}) is ready for pickup. Please confirm the handoff details and carrier tracking with me.`;
    return `https://wa.me/${partner.whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  if (loading) return <div className="seller-orders-loading" aria-label="Loading COD orders" />;

  return (
    <section className="seller-cod-orders">
      <header className="seller-cod-orders__header">
        <div>
          <span className="seller-cod-orders__eyebrow">Cash on delivery</span>
          <h2>Delivery and settlement</h2>
          <p>rifKANDO coordinates COD through Toufiq. He collects the parcel, arranges delivery through his network, and remits collected cash to rifKANDO. We retain the 5% commission and send your seller payout manually.</p>
        </div>
        <span className="seller-cod-orders__count">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
      </header>

      {orders.length === 0 ? (
        <div className="seller-cod-orders__empty"><CubeIcon aria-hidden="true" /><h3>No COD orders yet</h3><p>New Product and FINDit COD orders will appear here.</p></div>
      ) : (
        <div className="seller-cod-orders__list">
          {orders.map((order) => {
            const config = statusConfig[order.fulfillment_status] || statusConfig.pending_confirmation;
            const StatusIcon = config.icon;
            const isBusy = updating === order.fulfillment_id;
            const pickupRequested = Boolean(order.delivery_partner_contacted_at);
            return (
              <article className="seller-cod-order" key={order.fulfillment_id}>
                <div className="seller-cod-order__topline">
                  <div><div className="seller-cod-order__meta"><strong>{order.order_number}</strong>{order.fulfillment_source === 'findit' && <span className="seller-cod-order__findit">FINDit</span>}</div><p>{order.item_title || 'Product order'} · {order.buyer_name || 'Customer'}</p></div>
                  <span className={`seller-cod-order__status seller-cod-order__status--${config.tone}`}><StatusIcon aria-hidden="true" /> {config.label}</span>
                </div>

                <dl className="seller-cod-order__amounts"><div><dt>Buyer pays on delivery</dt><dd>{money(order.expected_cod_amount)}</dd></div><div><dt>Your payout after 5%</dt><dd>{money(order.seller_amount)}</dd></div><div><dt>Created</dt><dd>{new Date(order.created_at).toLocaleDateString()}</dd></div></dl>

                {order.fulfillment_status === 'pending_confirmation' && <div className="seller-cod-order__actions"><button className="seller-cod-order__button seller-cod-order__button--primary" disabled={isBusy} onClick={() => performAction(order, 'confirm')}>{isBusy ? 'Saving…' : 'Confirm order'}</button><button className="seller-cod-order__button seller-cod-order__button--quiet" disabled={isBusy} onClick={() => performAction(order, 'cancel')}>Cancel order</button></div>}

                {order.fulfillment_status === 'confirmed' && partner && (
                  <aside className="seller-cod-order__partner">
                    <div><span>Delivery partner</span><h3>{partner.name}</h3><p>Contact {partner.name} on WhatsApp to agree pickup. He coordinates delivery through {partner.carrierNetwork} and confirms tracking with rifKANDO.</p><strong>{partner.displayPhone}</strong></div>
                    {!pickupRequested ? <div className="seller-cod-order__partner-actions"><a href={sellerWhatsAppLink(order)} target="_blank" rel="noreferrer">Open WhatsApp</a><button className="seller-cod-order__button seller-cod-order__button--primary" disabled={isBusy} onClick={() => performAction(order, 'request_handoff')}>{isBusy ? 'Saving…' : 'I requested pickup'}</button></div> : <p className="seller-cod-order__partner-confirmed"><CheckCircleIcon aria-hidden="true" /> Pickup request recorded. Wait for Toufiq to collect the parcel and send carrier tracking.</p>}
                  </aside>
                )}

                {order.carrier_name && order.tracking_number && <p className="seller-cod-order__tracking">Delivery network: <strong>{order.carrier_name}</strong> · Tracking: <strong>{order.tracking_number}</strong></p>}
                {order.seller_payout_status === 'due' && <p className="seller-cod-order__payout">Toufiq’s remittance is recorded. rifKANDO will send your payout of <strong>{money(order.seller_amount)}</strong> and record the transfer reference here.</p>}
                {order.seller_payout_status === 'paid' && <p className="seller-cod-order__payout is-paid">Your payout of <strong>{money(order.seller_amount)}</strong> has been recorded. Reference: {order.seller_payout_reference}.</p>}
                {order.commission_payment_status === 'due' && <p className="seller-cod-order__legacy">This older order uses the previous seller-managed commission flow. Contact rifKANDO support for settlement.</p>}
                {order.settlement_status === 'void' && <p className="seller-cod-order__void">This order was not completed, so no seller payout is due.</p>}
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        .seller-cod-orders { color:#10233f; }.seller-orders-loading { width:2.25rem;height:2.25rem;margin:4rem auto;border:3px solid #d9e5f2;border-top-color:#168dd9;border-radius:50%;animation:sellerCodSpin .8s linear infinite; } @keyframes sellerCodSpin { to { transform:rotate(360deg); } }.seller-cod-orders__header { display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.5rem; }.seller-cod-orders__eyebrow { color:#168dd9;font-size:.75rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase; }.seller-cod-orders h2 { margin:.25rem 0 .35rem;font-size:1.6rem; }.seller-cod-orders__header p { max-width:48rem;margin:0;color:#5a6d82;line-height:1.55; }.seller-cod-orders__count { padding:.45rem .7rem;background:#e9f6ff;color:#0877bf;border-radius:999px;font-weight:700;white-space:nowrap; }.seller-cod-orders__list { display:grid;gap:1rem; }.seller-cod-order { padding:1.2rem;background:#fff;border:1px solid #dbe6ef;border-radius:1rem;box-shadow:0 .5rem 1.5rem rgba(16,35,63,.05); }.seller-cod-order__topline { display:flex;justify-content:space-between;gap:1rem;align-items:flex-start; }.seller-cod-order__meta { display:flex;gap:.55rem;align-items:center;flex-wrap:wrap; }.seller-cod-order__meta strong { color:#10233f; }.seller-cod-order__topline p { margin:.35rem 0 0;color:#64748b; }.seller-cod-order__findit { padding:.2rem .45rem;border-radius:999px;background:#e9f6ff;color:#0877bf;font-size:.7rem;font-weight:800; }.seller-cod-order__status { display:inline-flex;gap:.35rem;align-items:center;padding:.38rem .56rem;border-radius:999px;font-size:.78rem;font-weight:700;white-space:nowrap; }.seller-cod-order__status svg { width:1rem;height:1rem; }.seller-cod-order__status--amber { background:#fff4d6;color:#a65f00; }.seller-cod-order__status--blue { background:#e9f6ff;color:#0877bf; }.seller-cod-order__status--violet { background:#f1edff;color:#6542bd; }.seller-cod-order__status--emerald { background:#e7f8f0;color:#087f52; }.seller-cod-order__status--red { background:#fff0f0;color:#b42318; }.seller-cod-order__status--slate { background:#eef2f6;color:#526477; }.seller-cod-order__amounts { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;padding:1rem 0;margin:1rem 0;border-block:1px solid #edf2f6; }.seller-cod-order__amounts dt { color:#6b7b8d;font-size:.76rem; }.seller-cod-order__amounts dd { margin:.25rem 0 0;font-weight:800;color:#172d4b; }.seller-cod-order__actions { display:flex;gap:.65rem;flex-wrap:wrap; }.seller-cod-order__button,.seller-cod-order__partner-actions a { min-height:2.55rem;padding:.55rem .85rem;border-radius:.55rem;font-weight:750;cursor:pointer;border:1px solid transparent;text-decoration:none;display:inline-flex;align-items:center;justify-content:center; }.seller-cod-order__button:disabled { opacity:.6;cursor:wait; }.seller-cod-order__button--primary,.seller-cod-order__partner-actions a { background:#168dd9;color:#fff; }.seller-cod-order__button--primary:hover:not(:disabled),.seller-cod-order__partner-actions a:hover { background:#0877bf; }.seller-cod-order__button--quiet { background:#fff;color:#526477;border-color:#cddbe7; }.seller-cod-order__partner { display:flex;justify-content:space-between;gap:1rem;margin-top:1rem;padding:1rem;border:1px solid #b7dff6;border-radius:.8rem;background:#f3faff; }.seller-cod-order__partner span { color:#0877bf;font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase; }.seller-cod-order__partner h3 { margin:.25rem 0;font-size:1rem; }.seller-cod-order__partner p { max-width:42rem;margin:.25rem 0;color:#4d6680;line-height:1.45; }.seller-cod-order__partner-actions { display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;align-content:center; }.seller-cod-order__partner-confirmed { display:flex;align-items:center;gap:.45rem;color:#087f52 !important;font-weight:700; }.seller-cod-order__partner-confirmed svg { width:1.1rem; }.seller-cod-order__tracking,.seller-cod-order__payout,.seller-cod-order__legacy,.seller-cod-order__void { margin:1rem 0 0;color:#42556d;font-size:.9rem;line-height:1.5; }.seller-cod-order__payout { padding:.8rem;border-radius:.65rem;background:#f6fbff;color:#1a4a70; }.seller-cod-order__payout.is-paid { background:#e7f8f0;color:#087f52; }.seller-cod-order__legacy { color:#a65f00; }.seller-cod-order__void { color:#b42318; }.seller-cod-orders__empty { padding:3rem 1rem;text-align:center;background:#fff;border:1px dashed #c9d8e5;border-radius:1rem;color:#65758a; }.seller-cod-orders__empty svg { width:2.5rem;color:#168dd9; }.seller-cod-orders__empty h3 { color:#172d4b;margin:.75rem 0 .25rem; }.seller-cod-orders__empty p { margin:0; } @media(max-width:640px){.seller-cod-orders__header,.seller-cod-order__topline,.seller-cod-order__partner { flex-direction:column; }.seller-cod-orders__count { align-self:flex-start; }.seller-cod-order__amounts { grid-template-columns:1fr 1fr; }.seller-cod-order__amounts div:last-child { grid-column:span 2; }.seller-cod-order__button,.seller-cod-order__partner-actions,.seller-cod-order__partner-actions a { width:100%; }.seller-cod-order__partner-actions { align-items:stretch; }}
      `}</style>
    </section>
  );
};

export default SellerOrders;

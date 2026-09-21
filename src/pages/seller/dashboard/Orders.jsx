import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const statusConfig = {
  pending_confirmation: { label: 'Needs confirmation', icon: ClockIcon, tone: 'amber' },
  confirmed: { label: 'Ready to dispatch', icon: CubeIcon, tone: 'blue' },
  shipped: { label: 'With carrier', icon: TruckIcon, tone: 'violet' },
  delivered: { label: 'Carrier collected', icon: CheckCircleIcon, tone: 'emerald' },
  refused: { label: 'Customer refused', icon: XCircleIcon, tone: 'red' },
  returned: { label: 'Returned to seller', icon: XCircleIcon, tone: 'red' },
  cancelled: { label: 'Cancelled', icon: XCircleIcon, tone: 'slate' },
};

const settlementLabels = {
  awaiting_delivery: 'Ship with your preferred carrier and add its tracking number.',
  awaiting_remittance: 'Delivery is confirmed. Your rifKANDO commission is due.',
  settled: 'rifKANDO commission verified. You remain eligible to sell.',
  void: 'No payout for this order',
};

const commissionLabels = {
  due: 'Commission payment due',
  submitted: 'Payment submitted for finance verification',
  paid: 'Commission verified',
};

const money = (value) => `${Number(value || 0).toLocaleString()} MAD`;

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [forms, setForms] = useState({});
  const [commissionInstructions, setCommissionInstructions] = useState(null);

  const loadOrders = async () => {
    try {
      const [response, instructions] = await Promise.all([
        api.get('/seller/orders'),
        api.get('/seller/cod-commission-instructions'),
      ]);
      setOrders(response.data.orders || []);
      setCommissionInstructions(instructions.data);
    } catch (error) {
      console.error('Seller COD orders could not be loaded:', error);
      toast.error(error.response?.data?.error || 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    const loadInitialOrders = async () => {
      try {
        const [response, instructions] = await Promise.all([
          api.get('/seller/orders'),
          api.get('/seller/cod-commission-instructions'),
        ]);
        if (isCurrent) {
          setOrders(response.data.orders || []);
          setCommissionInstructions(instructions.data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error('Seller COD orders could not be loaded:', error);
          toast.error(error.response?.data?.error || 'Unable to load orders.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    void loadInitialOrders();
    return () => { isCurrent = false; };
  }, []);

  const updateForm = (fulfillmentId, field, value) => {
    setForms((current) => ({
      ...current,
      [fulfillmentId]: { ...current[fulfillmentId], [field]: value },
    }));
  };

  const performAction = async (order, action) => {
    const fulfillmentId = order.fulfillment_id;
    const form = forms[fulfillmentId] || {};
    if (action === 'dispatch' && (!form.carrierName?.trim() || !form.trackingNumber?.trim())) {
      toast.error('Add the carrier name and tracking number before dispatching.');
      return;
    }

    setUpdating(fulfillmentId);
    try {
      await api.patch(`/seller/cod-fulfillments/${fulfillmentId}`, {
        action,
        carrierName: form.carrierName || '',
        trackingNumber: form.trackingNumber || '',
        note: form.note || '',
      });
      toast.success(action === 'confirm' ? 'COD order confirmed.' : action === 'dispatch' ? 'Parcel marked as handed to the carrier.' : 'COD order cancelled.');
      await loadOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'The COD order could not be updated.');
    } finally {
      setUpdating(null);
    }
  };

  const submitCommission = async (order) => {
    const fulfillmentId = order.fulfillment_id;
    const form = forms[fulfillmentId] || {};
    if (!form.paymentReference?.trim()) {
      toast.error('Add the Attijari transfer reference after making the payment.');
      return;
    }
    setUpdating(fulfillmentId);
    try {
      await api.post(`/seller/cod-fulfillments/${fulfillmentId}/submit-commission`, {
        paymentReference: form.paymentReference,
        note: form.paymentNote || '',
      });
      toast.success('Commission payment submitted for rifKANDO verification.');
      await loadOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'The commission payment could not be submitted.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="seller-orders-loading" aria-label="Loading COD orders" />;

  return (
    <section className="seller-cod-orders">
      <header className="seller-cod-orders__header">
        <div>
          <span className="seller-cod-orders__eyebrow">Cash on delivery</span>
          <h2>Order fulfilment</h2>
          <p>Ship with your preferred carrier. After rifKANDO confirms delivery, pay the 5% commission within three days to keep selling.</p>
        </div>
        <span className="seller-cod-orders__count">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
      </header>

      {commissionInstructions?.configured && (
        <aside className="seller-cod-orders__payment-card">
          <strong>rifKANDO commission payment</strong>
          <span>Bank: {commissionInstructions.instructions.bankName}</span>
          <span>Account holder: {commissionInstructions.instructions.accountHolder}</span>
          <span>RIB: <b>{commissionInstructions.instructions.rib}</b></span>
          {commissionInstructions.instructions.supportContact && <small>Need help? {commissionInstructions.instructions.supportContact}</small>}
        </aside>
      )}

      {orders.length === 0 ? (
        <div className="seller-cod-orders__empty">
          <CubeIcon aria-hidden="true" />
          <h3>No COD orders yet</h3>
          <p>New product and FINDit orders appear here when customers check out.</p>
        </div>
      ) : (
        <div className="seller-cod-orders__list">
          {orders.map((order) => {
            const config = statusConfig[order.fulfillment_status] || statusConfig.pending_confirmation;
            const StatusIcon = config.icon;
            const form = forms[order.fulfillment_id] || {};
            const isBusy = updating === order.fulfillment_id;
            return (
              <article className="seller-cod-order" key={order.fulfillment_id}>
                <div className="seller-cod-order__topline">
                  <div>
                    <div className="seller-cod-order__meta">
                      <strong>{order.order_number}</strong>
                      {order.fulfillment_source === 'findit' && <span className="seller-cod-order__findit">FINDit</span>}
                    </div>
                    <p>{order.item_title || 'Product order'} · {order.buyer_name || 'Customer'}</p>
                  </div>
                  <span className={`seller-cod-order__status seller-cod-order__status--${config.tone}`}>
                    <StatusIcon aria-hidden="true" /> {config.label}
                  </span>
                </div>

                <dl className="seller-cod-order__amounts">
                  <div><dt>Buyer pays on delivery</dt><dd>{money(order.expected_cod_amount)}</dd></div>
                  <div><dt>rifKANDO commission (5%)</dt><dd>{money(order.commission)}</dd></div>
                  <div><dt>Created</dt><dd>{new Date(order.created_at).toLocaleDateString()}</dd></div>
                </dl>

                {order.fulfillment_status === 'pending_confirmation' && (
                  <div className="seller-cod-order__actions">
                    <button className="seller-cod-order__button seller-cod-order__button--primary" disabled={isBusy} onClick={() => performAction(order, 'confirm')}>
                      {isBusy ? 'Saving…' : 'Confirm order'}
                    </button>
                    <button className="seller-cod-order__button seller-cod-order__button--quiet" disabled={isBusy} onClick={() => performAction(order, 'cancel')}>
                      Cancel before dispatch
                    </button>
                  </div>
                )}

                {order.fulfillment_status === 'confirmed' && (
                  <div className="seller-cod-order__dispatch">
                    <label>Carrier
                      <input value={form.carrierName || ''} onChange={(event) => updateForm(order.fulfillment_id, 'carrierName', event.target.value)} placeholder="e.g. Najm Chamal" maxLength="120" />
                    </label>
                    <label>Tracking number
                      <input value={form.trackingNumber || ''} onChange={(event) => updateForm(order.fulfillment_id, 'trackingNumber', event.target.value)} placeholder="Carrier tracking number" maxLength="128" />
                    </label>
                    <button className="seller-cod-order__button seller-cod-order__button--primary" disabled={isBusy} onClick={() => performAction(order, 'dispatch')}>
                      {isBusy ? 'Saving…' : 'Hand to carrier'}
                    </button>
                  </div>
                )}

                {order.carrier_name && order.tracking_number && (
                  <p className="seller-cod-order__tracking">Carrier: <strong>{order.carrier_name}</strong> · Tracking: <strong>{order.tracking_number}</strong></p>
                )}
                {order.commission_payment_status === 'due' && (
                  <div className="seller-cod-order__commission">
                    <h3>{commissionLabels.due}</h3>
                    <p>Transfer <strong>{money(order.commission)}</strong> using reference <strong>{order.commission_reference}</strong>. Due {order.commission_due_at ? new Date(order.commission_due_at).toLocaleDateString() : 'within three days'}.</p>
                    {!commissionInstructions?.configured && <p className="seller-cod-order__warning">Payment instructions are not configured yet. Contact rifKANDO support before transferring.</p>}
                    {commissionInstructions?.configured && <div className="seller-cod-order__dispatch">
                      <label>Attijari transfer reference
                        <input value={form.paymentReference || ''} onChange={(event) => updateForm(order.fulfillment_id, 'paymentReference', event.target.value)} placeholder="Reference shown in your bank transfer" maxLength="256" />
                      </label>
                      <label>Optional note
                        <input value={form.paymentNote || ''} onChange={(event) => updateForm(order.fulfillment_id, 'paymentNote', event.target.value)} placeholder="Optional payment note" maxLength="1000" />
                      </label>
                      <button className="seller-cod-order__button seller-cod-order__button--primary" disabled={isBusy} onClick={() => submitCommission(order)}>{isBusy ? 'Submitting…' : 'Submit payment for verification'}</button>
                    </div>}
                  </div>
                )}
                {order.commission_payment_status === 'submitted' && <p className="seller-cod-order__commission-status">{commissionLabels.submitted}. Reference: {order.commission_payment_reference}.</p>}
                {order.commission_payment_status === 'paid' && <p className="seller-cod-order__commission-status is-paid">{commissionLabels.paid}. Thank you.</p>}
                <p className={`seller-cod-order__settlement ${order.settlement_status === 'settled' ? 'is-settled' : ''}`}>
                  {settlementLabels[order.settlement_status] || 'Settlement status unavailable.'}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        .seller-cod-orders { color: #10233f; }
        .seller-orders-loading { width: 2.25rem; height: 2.25rem; margin: 4rem auto; border: 3px solid #d9e5f2; border-top-color: #2397e8; border-radius: 50%; animation: sellerCodSpin .8s linear infinite; }
        @keyframes sellerCodSpin { to { transform: rotate(360deg); } }
        .seller-cod-orders__header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1.5rem; }
        .seller-cod-orders__eyebrow { color: #168dd9; font-size: .75rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
        .seller-cod-orders h2 { margin: .25rem 0 .35rem; font-size: 1.6rem; }
        .seller-cod-orders__header p { max-width: 44rem; margin: 0; color: #5a6d82; line-height: 1.55; }
        .seller-cod-orders__count { padding: .45rem .7rem; background: #e9f6ff; color: #0877bf; border-radius: 999px; font-weight: 700; white-space: nowrap; }
        .seller-cod-orders__payment-card { display:grid; gap:.35rem; margin:0 0 1.25rem; padding:1rem; border:1px solid #b7dff6; border-radius:.8rem; background:#f3faff; color:#23425f; }.seller-cod-orders__payment-card strong { color:#0877bf; }.seller-cod-orders__payment-card small { color:#607187; }
        .seller-cod-orders__list { display: grid; gap: 1rem; }
        .seller-cod-order { padding: 1.2rem; background: #fff; border: 1px solid #dbe6ef; border-radius: 1rem; box-shadow: 0 .5rem 1.5rem rgba(16, 35, 63, .05); }
        .seller-cod-order__topline { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
        .seller-cod-order__meta { display: flex; gap: .55rem; align-items: center; flex-wrap: wrap; }
        .seller-cod-order__meta strong { color: #10233f; }
        .seller-cod-order__topline p { margin: .35rem 0 0; color: #64748b; }
        .seller-cod-order__findit { padding: .2rem .45rem; border-radius: 999px; background: #e9f6ff; color: #0877bf; font-size: .7rem; font-weight: 800; }
        .seller-cod-order__status { display: inline-flex; gap: .35rem; align-items: center; padding: .38rem .56rem; border-radius: 999px; font-size: .78rem; font-weight: 700; white-space: nowrap; }
        .seller-cod-order__status svg { width: 1rem; height: 1rem; }
        .seller-cod-order__status--amber { background: #fff4d6; color: #a65f00; }.seller-cod-order__status--blue { background: #e9f6ff; color: #0877bf; }.seller-cod-order__status--violet { background: #f1edff; color: #6542bd; }.seller-cod-order__status--emerald { background: #e7f8f0; color: #087f52; }.seller-cod-order__status--red { background: #fff0f0; color: #b42318; }.seller-cod-order__status--slate { background: #eef2f6; color: #526477; }
        .seller-cod-order__amounts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; padding: 1rem 0; margin: 1rem 0; border-block: 1px solid #edf2f6; }
        .seller-cod-order__amounts dt { color: #6b7b8d; font-size: .76rem; }.seller-cod-order__amounts dd { margin: .25rem 0 0; font-weight: 800; color: #172d4b; }
        .seller-cod-order__actions, .seller-cod-order__dispatch { display: flex; gap: .65rem; align-items: end; flex-wrap: wrap; }
        .seller-cod-order__dispatch label { display: grid; gap: .35rem; flex: 1 1 13rem; font-size: .8rem; font-weight: 700; color: #526477; }
        .seller-cod-order__dispatch input { min-height: 2.55rem; padding: .55rem .65rem; border: 1px solid #cddbe7; border-radius: .55rem; color: #10233f; }
        .seller-cod-order__button { min-height: 2.55rem; padding: .55rem .85rem; border-radius: .55rem; font-weight: 750; cursor: pointer; border: 1px solid transparent; }.seller-cod-order__button:disabled { opacity: .6; cursor: wait; }.seller-cod-order__button--primary { background: #168dd9; color: #fff; }.seller-cod-order__button--primary:hover:not(:disabled) { background: #0877bf; }.seller-cod-order__button--quiet { background: #fff; color: #526477; border-color: #cddbe7; }
        .seller-cod-order__tracking { margin: 1rem 0 .35rem; color: #42556d; font-size: .9rem; }.seller-cod-order__commission { margin-top:1rem; padding:1rem; background:#f6fbff; border-radius:.75rem; }.seller-cod-order__commission h3 { margin:0; font-size:1rem; }.seller-cod-order__commission p { color:#526477; line-height:1.45; }.seller-cod-order__warning { color:#a65f00 !important; font-weight:700; }.seller-cod-order__commission-status { margin:1rem 0 0; color:#0877bf; font-weight:700; }.seller-cod-order__commission-status.is-paid { color:#087f52; }.seller-cod-order__settlement { margin: .7rem 0 0; color: #63758a; font-size: .88rem; }.seller-cod-order__settlement.is-settled { color: #087f52; font-weight: 700; }
        .seller-cod-orders__empty { padding: 3rem 1rem; text-align: center; background: #fff; border: 1px dashed #c9d8e5; border-radius: 1rem; color: #65758a; }.seller-cod-orders__empty svg { width: 2.5rem; color: #168dd9; }.seller-cod-orders__empty h3 { color: #172d4b; margin: .75rem 0 .25rem; }.seller-cod-orders__empty p { margin: 0; }
        @media (max-width: 640px) { .seller-cod-orders__header, .seller-cod-order__topline { flex-direction: column; }.seller-cod-orders__count { align-self: flex-start; }.seller-cod-order__amounts { grid-template-columns: 1fr 1fr; }.seller-cod-order__amounts div:last-child { grid-column: span 2; }.seller-cod-order__button { width: 100%; }.seller-cod-order__dispatch label { flex-basis: 100%; } }
      `}</style>
    </section>
  );
};

export default SellerOrders;

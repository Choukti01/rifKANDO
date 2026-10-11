import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  TruckIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CreditCardIcon, 
  BanknotesIcon, 
  WalletIcon,
  CubeIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import OrderDisputes from './OrderDisputes';

const money = (value) => `${Number(value || 0).toLocaleString()} MAD`;
const dateTime = (value) => value ? new Date(value).toLocaleString('en-MA', { dateStyle: 'medium', timeStyle: 'short' }) : null;

const codStatus = (fulfillment) => {
  if (fulfillment.status === 'delivered') return { label: 'Delivered and paid', tone: 'success', detail: 'Your parcel was delivered and the COD payment was collected.' };
  if (fulfillment.status === 'refused') return { label: 'Delivery refused', tone: 'danger', detail: 'The delivery was refused. No cash was collected.' };
  if (fulfillment.status === 'returned') return { label: 'Returned to seller', tone: 'danger', detail: 'The parcel is being returned to the seller. No cash was collected.' };
  if (fulfillment.status === 'cancelled') return { label: 'Cancelled', tone: 'muted', detail: 'This delivery was cancelled before completion.' };
  if (fulfillment.status === 'shipped' && fulfillment.delivery_report_outcome === 'refused') return { label: 'Refusal under review', tone: 'warning', detail: 'The delivery partner reported a refusal. rifKANDO is confirming the final delivery record.' };
  if (fulfillment.status === 'shipped' && fulfillment.delivery_report_outcome === 'returned') return { label: 'Return under review', tone: 'warning', detail: 'The delivery partner reported a return. rifKANDO is confirming the final delivery record.' };
  if (fulfillment.status === 'shipped' && fulfillment.delivery_report_outcome === 'delivered') return { label: 'Delivery update received', tone: 'brand', detail: 'The delivery partner reported a successful delivery update.' };
  if (fulfillment.status === 'shipped') return { label: 'With delivery network', tone: 'brand', detail: 'The parcel is with the delivery network. The driver will contact you to arrange delivery.' };
  if (fulfillment.status === 'confirmed') return { label: 'Preparing pickup', tone: 'brand', detail: fulfillment.delivery_partner_contacted_at ? 'Toufiq is arranging parcel pickup with the seller.' : 'The seller is preparing your parcel for pickup.' };
  return { label: 'Awaiting seller confirmation', tone: 'warning', detail: 'Your order was received and is awaiting seller confirmation.' };
};

const codSteps = (order, fulfillment) => {
  const terminal = ['delivered', 'refused', 'returned', 'cancelled'].includes(fulfillment.status);
  const deliveryTime = fulfillment.delivered_at || fulfillment.refused_at || fulfillment.returned_at || fulfillment.cancelled_at || null;
  return [
    { key: 'placed', label: 'Order placed', detail: 'Your COD order was received.', time: order.created_at, complete: true },
    { key: 'confirmed', label: 'Seller confirmation', detail: fulfillment.confirmed_at ? 'The seller confirmed the order.' : 'Waiting for the seller to confirm.', time: fulfillment.confirmed_at, complete: Boolean(fulfillment.confirmed_at) },
    { key: 'pickup', label: 'Pickup and tracking', detail: fulfillment.delivery_partner_pickup_at ? `Parcel picked up${fulfillment.carrier_name ? ` by ${fulfillment.carrier_name}` : ''}.` : fulfillment.delivery_partner_contacted_at ? 'Pickup is being coordinated with the seller.' : 'Pickup will be arranged after confirmation.', time: fulfillment.delivery_partner_pickup_at, complete: Boolean(fulfillment.delivery_partner_pickup_at), active: fulfillment.status === 'confirmed' },
    { key: 'delivery', label: terminal ? codStatus(fulfillment).label : 'Delivery to you', detail: terminal ? codStatus(fulfillment).detail : fulfillment.delivery_deadline_at ? `rifKANDO COD Operations plans arrival by ${dateTime(fulfillment.delivery_deadline_at)}.` : 'COD Operations will confirm your delivery plan before pickup.', time: deliveryTime, complete: terminal, active: fulfillment.status === 'shipped' },
  ];
};

const OrderDetailsPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isCurrent = true;

    const loadOrder = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        if (isCurrent) setOrder(response.data.order);
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to fetch order:', error);
          toast.error('Failed to load order details');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadOrder();
    const refreshTimer = window.setInterval(loadOrder, 30_000);

    return () => {
      isCurrent = false;
      window.clearInterval(refreshTimer);
    };
  }, [id, isAuthenticated]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }
    setCancelling(true);
    try {
      await api.post(`/orders/${order.id}/cancel`);
      toast.success('Order cancelled successfully');
      await fetchOrder();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const refreshDelivery = async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return <BanknotesIcon style={{ width: '1rem', height: '1rem' }} />;
      case 'cmi': return <CreditCardIcon style={{ width: '1rem', height: '1rem' }} />;
      case 'wallet': return <WalletIcon style={{ width: '1rem', height: '1rem' }} />;
      default: return <BanknotesIcon style={{ width: '1rem', height: '1rem' }} />;
    }
  };

  const getPaymentText = (method) => {
    switch (method) {
      case 'cash': return 'Cash on Delivery';
      case 'cmi': return 'Credit Card (CMI)';
      case 'wallet': return 'Wallet Balance';
      default: return method || 'Unknown';
    }
  };

  const getPaymentStatusText = (status) => {
    const labels = {
      pending: 'Pay on delivery',
      collected: 'Cash collected',
      settled: 'Payment settled',
      paid: 'Paid',
      cancelled: 'Cancelled',
    };
    return labels[status] || 'Pending';
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#87CEEB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container text-center py-16">
        <p>Order not found</p>
        <Link to="/orders" className="back-link">Back to Orders</Link>
      </div>
    );
  }

  const isFindItOrder = order.order_type === 'findit';
  const subtotal = order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || Number(order.total || 0);
  const fulfillments = order.fulfillments || [];
  const canCancelBeforePickup = fulfillments.length > 0
    && fulfillments.every((fulfillment) => ['pending_confirmation', 'confirmed'].includes(fulfillment.status));
  const supportHref = `mailto:rifKANDO@gmail.com?subject=${encodeURIComponent(`[rifKANDO delivery support] ${order.order_number}`)}&body=${encodeURIComponent(`Order: ${order.order_number}\n\nDescribe the delivery issue and include any useful details.\n`)}`;

  return (
    <div className="order-details-page">
      <div className="container">
        <div className="order-details-header">
          <h1>{isFindItOrder ? 'FINDit Order Details' : 'Order Details'}</h1>
          <Link to="/orders" className="back-link">← Back to Orders</Link>
        </div>

        {fulfillments.length > 0 && <section className="tracking-card cod-tracking-card" aria-label="Cash on delivery tracking">
          <header className="cod-tracking-card__header">
            <div><span>Cash on delivery</span><h3>Delivery updates</h3><p>Pay only when the parcel reaches you. Never send money through an unofficial message. Updates refresh automatically while this page is open.</p></div>
            <button type="button" onClick={() => void refreshDelivery()} disabled={refreshing}><ArrowPathIcon aria-hidden="true" />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          </header>

          <div className="cod-tracking-list">
            {fulfillments.map((fulfillment, index) => {
              const status = codStatus(fulfillment);
              const steps = codSteps(order, fulfillment);
              return <article className="cod-tracking-item" key={fulfillment.id}>
                <div className="cod-tracking-item__topline"><div><strong>{fulfillment.source === 'findit' ? 'FINDit delivery' : `Product delivery${fulfillments.length > 1 ? ` ${index + 1}` : ''}`}</strong><p>{status.detail}</p></div><span className={`cod-status cod-status--${status.tone}`}>{status.tone === 'danger' ? <XCircleIcon aria-hidden="true" /> : status.tone === 'success' ? <CheckCircleIcon aria-hidden="true" /> : <TruckIcon aria-hidden="true" />}{status.label}</span></div>

                <ol className="cod-timeline">
                  {steps.map((step) => <li key={step.key} className={`${step.complete ? 'is-complete' : ''} ${step.active ? 'is-active' : ''}`}><span className="cod-timeline__dot" /><div><strong>{step.label}</strong><p>{step.detail}</p>{step.time && <small>{dateTime(step.time)}</small>}</div></li>)}
                </ol>

                <div className="cod-tracking-item__facts">
                  <div><span>Pay on delivery</span><strong>{fulfillment.delivery_fee_quoted_at ? money(fulfillment.expected_cod_amount || order.total) : 'Delivery quote pending'}</strong></div>
                  <div><span>Delivery charge</span><strong>{fulfillment.delivery_fee_quoted_at ? money(fulfillment.customer_delivery_fee) : 'To be confirmed'}</strong></div>
                  <div><span>Planned arrival</span><strong>{fulfillment.delivery_deadline_at ? dateTime(fulfillment.delivery_deadline_at) : 'Set by COD Operations before pickup'}</strong></div>
                  {fulfillment.carrier_name && <div><span>Carrier</span><strong>{fulfillment.carrier_name}</strong></div>}
                  {fulfillment.tracking_number && <div><span>Tracking number</span><strong>{fulfillment.tracking_number}</strong></div>}
                </div>
              </article>;
            })}
          </div>

          {order.deliveryPartner && <aside className="delivery-coordinator-note">
            <ChatBubbleLeftRightIcon aria-hidden="true" />
            <div><strong>{order.deliveryPartner.name} coordinates this delivery.</strong><p>They may contact you to confirm location and delivery timing. Pay only when you receive the parcel.</p></div>
            <a href={`https://wa.me/${order.deliveryPartner.whatsappNumber}?text=${encodeURIComponent(`Hello ${order.deliveryPartner.name}, I am contacting you about rifKANDO order ${order.order_number}.`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </aside>}
          <div className="cod-tracking-card__help"><InformationCircleIcon aria-hidden="true" /><span>Need help with this delivery?</span><a href={supportHref}>Email support with this order</a><Link to="/contact">Other contact options</Link></div>
        </section>}

        <OrderDisputes order={order} />

        <div className="details-grid">
          {/* Order Info */}
          <div className="info-card">
            <h3>Order Information</h3>
            <div className="info-row">
              <span className="info-label">Order Number:</span>
              <span className="info-value">{order.order_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Date:</span>
              <span className="info-value">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value status-text">{order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Payment Method:</span>
              <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getPaymentIcon(order.payment_method)}
                {getPaymentText(order.payment_method)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Payment Status:</span>
              <span className={`payment-status ${order.payment_status}`}>{getPaymentStatusText(order.payment_status)}</span>
            </div>
            {/* A buyer can withdraw until a delivery partner actually has the parcel. */}
            {(order.status === 'pending' || canCancelBeforePickup) && (
              <div className="info-row">
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="cancel-btn"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel before pickup'}
                </button>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="info-card">
            <h3>Shipping Address</h3>
            {order.shipping_address ? (
              <div className="shipping-address">
                <p><strong>{order.shipping_address.fullName || 'N/A'}</strong></p>
                <p>{order.shipping_address.address || 'N/A'}</p>
                <p>{order.shipping_address.city || 'N/A'}, {order.shipping_address.postalCode || ''}</p>
                <p><PhoneIcon style={{ width: '0.875rem', display: 'inline', marginRight: '0.5rem' }} />{order.shipping_address.phone || 'N/A'}</p>
                <p><EnvelopeIcon style={{ width: '0.875rem', display: 'inline', marginRight: '0.5rem' }} />{order.shipping_address.email || 'N/A'}</p>
              </div>
            ) : (
              <p className="no-address">No shipping address provided</p>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="items-card">
          <h3>Order Items</h3>
          
          {!order.items || order.items.length === 0 ? (
            <p className="no-items">No items found for this order.</p>
          ) : (
            <>
              <div className="items-table-wrapper">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>{isFindItOrder ? 'Solution' : 'Product'}</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="item-title">{item.title || item.product_title || (isFindItOrder ? 'FINDit solution' : 'Product')}</td>
                        <td className="item-quantity">{item.quantity}</td>
                        <td className="item-price">{item.price} MAD</td>
                        <td className="item-total">{item.price * item.quantity} MAD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{subtotal} MAD</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{fulfillments.some((fulfillment) => fulfillment.delivery_fee_quoted_at) ? 'See delivery tracking' : 'Quoted after order'}</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>{order.total} MAD</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .order-details-page { 
          padding: 2rem 0; 
          min-height: calc(100vh - 80px); 
        }
        
        .order-details-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 2rem; 
        }
        
        .order-details-header h1 { 
          font-size: 1.75rem; 
          margin: 0; 
        }
        
        .back-link { 
          color: #87CEEB; 
          text-decoration: none; 
          font-size: 0.875rem; 
        }
        
        .back-link:hover { 
          text-decoration: underline; 
        }
        
        /* Tracking Card */
        .tracking-card { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(8px); 
          border-radius: 1rem; 
          padding: 1.5rem; 
          margin-bottom: 1.5rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .tracking-card h3 { 
          font-size: 1rem; 
          margin-bottom: 1.5rem; 
          font-weight: 600;
        }
        
        .tracking-steps { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          position: relative; 
        }
        
        .tracking-step { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          position: relative; 
        }
        
        .step-dot { 
          width: 12px; 
          height: 12px; 
          border-radius: 50%; 
          background: #e5e7eb; 
          transition: all 0.3s; 
          z-index: 2; 
        }
        
        .tracking-step.completed .step-dot { 
          background: #10b981; 
        }
        
        .tracking-step.active .step-dot { 
          background: #87CEEB; 
          width: 16px; 
          height: 16px; 
          box-shadow: 0 0 0 3px rgba(135,206,235,0.3); 
        }
        
        .step-label { 
          font-size: 0.7rem; 
          margin-top: 0.5rem; 
          color: #6b7280; 
          text-transform: uppercase; 
          font-weight: 500; 
        }
        
        .tracking-step.completed .step-label, 
        .tracking-step.active .step-label { 
          color: #1a1a1a; 
        }
        
        .step-line { 
          position: absolute; 
          top: 6px; 
          left: 50%; 
          width: 100%; 
          height: 2px; 
          background: #e5e7eb; 
          z-index: 1; 
        }

        .carrier-tracking {
          display: grid;
          gap: .65rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e8eef4;
        }

        .carrier-tracking-row {
          display: flex;
          align-items: center;
          gap: .65rem;
          padding: .75rem;
          border-radius: .65rem;
          background: #f4fbff;
          color: #1a4a70;
        }

        .carrier-tracking-row svg { width: 1.2rem; color: #168dd9; }
        .carrier-tracking-row div { display: grid; gap: .12rem; }
        .carrier-tracking-row span { color: #52708a; font-size: .86rem; }

        .cod-tracking-card { border-color:#d7e7f2; }
        .cod-tracking-card__header { display:flex;justify-content:space-between;gap:1rem;align-items:flex-start; }
        .cod-tracking-card__header span { color:#168dd9;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase; }
        .cod-tracking-card__header h3 { margin:.22rem 0;font-size:1.15rem; }
        .cod-tracking-card__header p { margin:0;color:#5a7086;font-size:.9rem;line-height:1.45; }
        .cod-tracking-card__header button { display:inline-flex;align-items:center;gap:.4rem;border:1px solid #b9dff5;background:#fff;color:#0877bf;border-radius:.55rem;padding:.55rem .75rem;font:inherit;font-weight:750;cursor:pointer;white-space:nowrap; }
        .cod-tracking-card__header button:disabled { opacity:.6;cursor:wait; }
        .cod-tracking-card__header button svg { width:1rem; }
        .cod-tracking-list { display:grid;gap:1rem;margin-top:1.25rem; }
        .cod-tracking-item { border:1px solid #e1eaf1;border-radius:.85rem;padding:1rem;background:#fff; }
        .cod-tracking-item__topline { display:flex;gap:1rem;align-items:flex-start;justify-content:space-between; }
        .cod-tracking-item__topline strong { color:#10233f; }
        .cod-tracking-item__topline p { margin:.25rem 0 0;color:#607187;font-size:.88rem;line-height:1.4; }
        .cod-status { display:inline-flex;align-items:center;gap:.32rem;border-radius:999px;padding:.34rem .55rem;font-size:.75rem;font-weight:750;white-space:nowrap; }
        .cod-status svg { width:1rem; }
        .cod-status--brand { background:#e9f6ff;color:#0877bf; }.cod-status--success { background:#e7f8f0;color:#087f52; }.cod-status--danger { background:#fff0f0;color:#b42318; }.cod-status--muted { background:#eef2f6;color:#526477; }.cod-status--warning { background:#fff4d6;color:#9a6100; }
        .cod-timeline { list-style:none;margin:1rem 0;padding:0;display:grid;gap:.75rem; }
        .cod-timeline li { display:grid;grid-template-columns:1rem 1fr;gap:.65rem;position:relative;color:#728197; }
        .cod-timeline__dot { width:.72rem;height:.72rem;margin-top:.24rem;border:2px solid #c7d6e2;border-radius:50%;background:#fff; }
        .cod-timeline li.is-complete .cod-timeline__dot { background:#168dd9;border-color:#168dd9; }.cod-timeline li.is-active .cod-timeline__dot { box-shadow:0 0 0 4px #d9f0ff;border-color:#168dd9; }
        .cod-timeline strong { display:block;color:#445971;font-size:.88rem; }.cod-timeline p { margin:.12rem 0;color:#728197;font-size:.82rem;line-height:1.35; }.cod-timeline small { color:#168dd9;font-size:.76rem;font-weight:650; }
        .cod-timeline li.is-complete strong,.cod-timeline li.is-active strong { color:#10233f; }
        .cod-tracking-item__facts { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem;padding-top:.85rem;border-top:1px solid #edf2f6; }
        .cod-tracking-item__facts div { min-width:0;display:grid;gap:.16rem; }.cod-tracking-item__facts span { color:#718197;font-size:.72rem; }.cod-tracking-item__facts strong { color:#1e3652;font-size:.84rem;overflow-wrap:anywhere; }
        .delivery-coordinator-note { display:flex; gap:.65rem; align-items:flex-start; margin-top:1rem; padding:.85rem; border-radius:.65rem; background:#f2faff; color:#425d75; font-size:.88rem; line-height:1.45; }
        .delivery-coordinator-note svg { flex:0 0 auto; width:1.2rem; color:#168dd9; margin-top:.1rem; }
        .delivery-coordinator-note p { margin:0; }
        .delivery-coordinator-note div { flex:1; }.delivery-coordinator-note a { flex:0 0 auto;color:#0877bf;font-weight:800;text-decoration:none; }
        .cod-tracking-card__help { display:flex;align-items:center;gap:.35rem;margin:.85rem 0 0;color:#607187;font-size:.82rem; }.cod-tracking-card__help svg { width:1rem;color:#168dd9; }.cod-tracking-card__help a { color:#0877bf;font-weight:750;text-decoration:none; }
        
        .tracking-step.completed ~ .tracking-step .step-line { 
          background: #10b981; 
        }
        
        /* Details Grid */
        .details-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 1.5rem; 
          margin-bottom: 1.5rem; 
        }
        
        @media (max-width: 768px) { 
          .details-grid { 
            grid-template-columns: 1fr; 
          } 
          .cod-tracking-card__header,.cod-tracking-item__topline,.delivery-coordinator-note { flex-direction:column; }
          .cod-tracking-card__header button,.delivery-coordinator-note a { width:100%;justify-content:center;text-align:center; }
          .cod-tracking-item__facts { grid-template-columns:1fr 1fr; }
        }
        
        /* Info Cards */
        .info-card { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(8px); 
          border-radius: 1rem; 
          padding: 1.5rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .info-card h3 { 
          font-size: 1rem; 
          margin-bottom: 1rem; 
          font-weight: 600;
        }
        
        .info-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 0.5rem 0; 
          border-bottom: 1px solid #e5e7eb; 
          flex-wrap: wrap;
          align-items: center;
        }
        
        .info-row:last-child { 
          border-bottom: none; 
        }
        
        .info-label { 
          font-weight: 500; 
          color: #374151; 
        }
        
        .info-value { 
          color: #6b7280; 
        }
        
        .payment-status { 
          padding: 0.25rem 0.75rem; 
          border-radius: 2rem; 
          font-size: 0.75rem; 
          font-weight: 500; 
        }
        
        .payment-status.paid { 
          background: #d1fae5; 
          color: #10b981; 
        }
        
        .payment-status.pending { 
          background: #fef3c7; 
          color: #f59e0b; 
        }
        
        /* Cancel button */
        .cancel-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
          width: 100%;
        }
        .cancel-btn:hover {
          background: #dc2626;
        }
        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Shipping Address */
        .shipping-address p { 
          margin: 0.5rem 0; 
          color: #6b7280; 
          font-size: 0.875rem; 
          display: flex; 
          align-items: center; 
        }
        
        .shipping-address strong { 
          color: #1a1a1a; 
        }
        
        /* Items Card */
        .items-card { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(8px); 
          border-radius: 1rem; 
          padding: 1.5rem; 
          border: 1px solid rgba(255,255,255,0.3); 
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .items-card h3 { 
          font-size: 1rem; 
          margin-bottom: 1rem; 
          font-weight: 600;
        }
        
        .items-table-wrapper {
          overflow-x: auto;
          margin-bottom: 1.5rem;
        }
        
        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        
        .items-table th { 
          text-align: left; 
          padding: 0.75rem 0.5rem; 
          font-size: 0.75rem; 
          font-weight: 600; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          color: #6b7280; 
          border-bottom: 1px solid #e5e7eb; 
        }
        
        .items-table td { 
          padding: 0.75rem 0.5rem; 
          font-size: 0.875rem; 
          border-bottom: 1px solid #f3f4f6; 
        }
        
        .items-table tr:last-child td { 
          border-bottom: none; 
        }
        
        .item-title { 
          font-weight: 500; 
          color: #1a1a1a; 
        }
        
        .item-quantity { 
          color: #6b7280; 
        }
        
        .item-price { 
          color: #6b7280; 
        }
        
        .item-total { 
          font-weight: 600; 
          color: #1a1a1a; 
        }
        
        /* Order Summary */
        .order-summary { 
          margin-top: 1rem; 
          padding-top: 1rem; 
          border-top: 1px solid #e5e7eb; 
          text-align: right; 
        }
        
        .summary-row { 
          display: flex; 
          justify-content: flex-end; 
          gap: 2rem; 
          padding: 0.25rem 0; 
          font-size: 0.875rem; 
          color: #6b7280; 
        }
        
        .summary-total { 
          display: flex; 
          justify-content: flex-end; 
          gap: 2rem; 
          padding-top: 0.5rem; 
          font-weight: 700; 
          font-size: 1rem; 
          border-top: 1px solid #e5e7eb; 
          margin-top: 0.5rem; 
          color: #1a1a1a;
        }
        
        .no-items {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default OrderDetailsPage;

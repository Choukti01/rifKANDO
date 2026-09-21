import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const money = (value) => `${Number(value || 0).toLocaleString()} MAD`;

const stageLabel = (item) => ({
  awaiting_delivery: item.status === 'shipped' ? 'Awaiting delivery confirmation' : 'In fulfilment',
  awaiting_remittance: item.commission_payment_status === 'submitted' ? 'Commission awaiting bank verification' : 'Commission due from seller',
  settled: 'Commission verified',
  void: 'Voided',
}[item.settlement_status] || item.settlement_status);

const CODReconciliation = () => {
  const [fulfillments, setFulfillments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [forms, setForms] = useState({});

  const loadFulfillments = async () => {
    try {
      const response = await api.get('/admin/cod-fulfillments');
      setFulfillments(response.data.fulfillments || []);
    } catch (error) {
      console.error('COD reconciliation could not be loaded:', error);
      toast.error(error.response?.data?.error || 'Unable to load COD reconciliation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    const loadInitialFulfillments = async () => {
      try {
        const response = await api.get('/admin/cod-fulfillments');
        if (isCurrent) setFulfillments(response.data.fulfillments || []);
      } catch (error) {
        if (isCurrent) {
          console.error('COD reconciliation could not be loaded:', error);
          toast.error(error.response?.data?.error || 'Unable to load COD reconciliation.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    void loadInitialFulfillments();
    return () => { isCurrent = false; };
  }, []);

  const formFor = (item) => forms[item.fulfillment_id] || {};

  const updateForm = (item, field, value) => {
    const id = item.fulfillment_id;
    setForms((current) => ({
      ...current,
      [id]: { ...formFor(item), ...current[id], [field]: value },
    }));
  };

  const submit = async (item, action) => {
    const form = formFor(item);
    const id = item.fulfillment_id;
    let path;
    let payload;
    if (action === 'delivery') {
      path = `/admin/cod-fulfillments/${id}/confirm-delivery`;
      payload = { note: form.deliveryNote || '' };
    } else if (action === 'verify') {
      path = `/admin/cod-fulfillments/${id}/verify-commission`;
      payload = { note: form.verificationNote || '' };
    } else {
      path = `/admin/cod-fulfillments/${id}/exception`;
      payload = { status: form.exceptionStatus || 'refused', note: form.exceptionNote || '' };
    }

    setProcessing(`${id}:${action}`);
    try {
      await api.post(path, payload);
      toast.success(action === 'delivery' ? 'Delivery confirmed and commission invoice created.' : action === 'verify' ? 'Attijari commission payment verified.' : 'Carrier exception recorded.');
      await loadFulfillments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'The financial record could not be updated.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="cod-finance-loading">Loading COD reconciliation…</div>;

  return (
    <main className="cod-finance">
      <header className="cod-finance__header">
        <div>
          <span>Finance control</span>
          <h1>COD reconciliation</h1>
          <p>For seller-managed COD, confirm carrier delivery first. The seller then pays rifKANDO's 5% commission directly; verify it only against your real Attijari transaction.</p>
        </div>
        <button type="button" onClick={() => void loadFulfillments()}>Refresh</button>
      </header>

      {fulfillments.length === 0 ? (
        <div className="cod-finance__empty">There are no COD fulfilments to reconcile.</div>
      ) : (
        <div className="cod-finance__list">
          {fulfillments.map((item) => {
            const form = formFor(item);
            const deliveryBusy = processing === `${item.fulfillment_id}:delivery`;
            const verifyBusy = processing === `${item.fulfillment_id}:verify`;
            const exceptionBusy = processing === `${item.fulfillment_id}:exception`;
            const isShipped = item.status === 'shipped';
            const commissionDue = item.status === 'delivered' && item.commission_payment_status === 'due';
            const commissionSubmitted = item.status === 'delivered' && item.commission_payment_status === 'submitted';
            return (
              <article className="cod-finance__card" key={item.fulfillment_id}>
                <div className="cod-finance__topline">
                  <div>
                    <div className="cod-finance__order">{item.order_number} <span>{item.source === 'findit' ? 'FINDit' : 'Product'}</span></div>
                    <p>{item.item_title || 'Order item'} · Buyer: {item.buyer_name} · Seller: {item.seller_name}</p>
                  </div>
                  <strong className={`cod-finance__stage ${item.settlement_status}`}>{stageLabel(item)}</strong>
                </div>

                <dl className="cod-finance__amounts">
                  <div><dt>Buyer pays on delivery</dt><dd>{money(item.expected_cod_amount)}</dd></div>
                  <div><dt>Seller receives from carrier</dt><dd>{money(item.expected_cod_amount)}</dd></div>
                  <div><dt>rifKANDO commission</dt><dd>{money(item.commission)}</dd></div>
                  <div><dt>Commission status</dt><dd>{item.commission_payment_status || 'Not due'}</dd></div>
                </dl>

                {item.carrier_name && <p className="cod-finance__tracking">{item.carrier_name} · {item.tracking_number}</p>}

                {isShipped && (
                  <div className="cod-finance__workflow">
                    <h2>1. Confirm delivery</h2>
                    <p>Check the carrier tracking and any available delivery evidence. This action creates the seller's 5% rifKANDO commission invoice; it does not credit a wallet.</p>
                    <div className="cod-finance__fields">
                      <label>Verification note (optional)<input value={form.deliveryNote || ''} onChange={(event) => updateForm(item, 'deliveryNote', event.target.value)} placeholder="Carrier tracking checked" /></label>
                    </div>
                    <button disabled={deliveryBusy} onClick={() => submit(item, 'delivery')}>{deliveryBusy ? 'Confirming…' : 'Confirm delivery'}</button>
                    <div className="cod-finance__exception">
                      <select value={form.exceptionStatus || 'refused'} onChange={(event) => updateForm(item, 'exceptionStatus', event.target.value)}><option value="refused">Customer refused</option><option value="returned">Returned to seller</option></select>
                      <input placeholder="Carrier exception note" value={form.exceptionNote || ''} onChange={(event) => updateForm(item, 'exceptionNote', event.target.value)} />
                      <button className="quiet" disabled={exceptionBusy} onClick={() => submit(item, 'exception')}>{exceptionBusy ? 'Recording…' : 'Record exception'}</button>
                    </div>
                  </div>
                )}

                {commissionDue && (
                  <div className="cod-finance__workflow">
                    <h2>2. Await seller commission payment</h2>
                    <p>Reference: <strong>{item.commission_reference}</strong>. Amount due: <strong>{money(item.commission)}</strong>. Due {item.commission_due_at ? new Date(item.commission_due_at).toLocaleDateString() : 'within three days'}.</p>
                  </div>
                )}

                {commissionSubmitted && (
                  <div className="cod-finance__workflow">
                    <h2>3. Verify Attijari transfer</h2>
                    <p>Check your real bank transaction before approving. Seller submitted reference: <strong>{item.commission_payment_reference}</strong>.</p>
                    <div className="cod-finance__fields"><label>Verification note (optional)<input value={form.verificationNote || ''} onChange={(event) => updateForm(item, 'verificationNote', event.target.value)} placeholder="Matched with Attijari transaction" /></label></div>
                    <button disabled={verifyBusy} onClick={() => submit(item, 'verify')}>{verifyBusy ? 'Verifying…' : 'Verify commission payment'}</button>
                  </div>
                )}

                {item.commission_payment_status === 'paid' && <p className="cod-finance__success">Commission verified {item.commission_verified_at ? new Date(item.commission_verified_at).toLocaleDateString() : ''}. The seller remains eligible to sell.</p>}
                {item.settlement_status === 'void' && <p className="cod-finance__void">{item.exception_note || 'This COD fulfilment was voided and cannot credit a seller.'}</p>}
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        .cod-finance { max-width: 76rem; margin: 0 auto; padding: 1.5rem; color: #10233f; }.cod-finance__header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:1.5rem; }.cod-finance__header span { color:#168dd9; text-transform:uppercase; font-weight:800; font-size:.75rem; letter-spacing:.09em; }.cod-finance__header h1 { margin:.25rem 0; font-size:1.8rem; }.cod-finance__header p { max-width:42rem; margin:0; color:#607187; line-height:1.55; }.cod-finance__header button,.cod-finance__workflow button { border:0; border-radius:.55rem; background:#168dd9; color:#fff; padding:.65rem .9rem; font-weight:750; cursor:pointer; }.cod-finance__header button:hover,.cod-finance__workflow button:hover:not(:disabled) { background:#0877bf; }.cod-finance__header button:disabled,.cod-finance__workflow button:disabled { opacity:.6; cursor:wait; }.cod-finance__list { display:grid; gap:1rem; }.cod-finance__card { background:#fff; border:1px solid #dbe6ef; border-radius:1rem; padding:1.25rem; box-shadow:0 .5rem 1.5rem rgba(16,35,63,.05); }.cod-finance__topline { display:flex; justify-content:space-between; gap:1rem; }.cod-finance__order { font-weight:800; }.cod-finance__order span { display:inline-block; margin-left:.4rem; padding:.18rem .45rem; border-radius:99px; background:#e9f6ff; color:#0877bf; font-size:.7rem; }.cod-finance__topline p,.cod-finance__tracking { margin:.35rem 0 0; color:#62748a; }.cod-finance__stage { align-self:start; padding:.4rem .55rem; border-radius:99px; font-size:.75rem; white-space:nowrap; background:#eef2f6; color:#526477; }.cod-finance__stage.awaiting_remittance { background:#fff4d6; color:#a65f00; }.cod-finance__stage.settled { background:#e7f8f0; color:#087f52; }.cod-finance__stage.void { background:#fff0f0; color:#b42318; }.cod-finance__amounts { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; margin:1rem 0; padding:1rem 0; border-block:1px solid #edf2f6; }.cod-finance__amounts dt { color:#6b7b8d; font-size:.76rem; }.cod-finance__amounts dd { margin:.25rem 0 0; font-weight:800; }.cod-finance__workflow { margin-top:1rem; padding:1rem; border-radius:.75rem; background:#f6fbff; }.cod-finance__workflow h2 { margin:0; font-size:1rem; }.cod-finance__workflow p { color:#607187; margin:.35rem 0 .85rem; line-height:1.45; }.cod-finance__fields { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.65rem; margin-bottom:.75rem; }.cod-finance__fields label { display:grid; gap:.35rem; color:#526477; font-size:.78rem; font-weight:700; }.cod-finance input,.cod-finance select { min-width:0; min-height:2.45rem; padding:.45rem .55rem; border:1px solid #cddbe7; border-radius:.5rem; background:#fff; color:#10233f; }.cod-finance__exception { display:flex; gap:.55rem; align-items:center; margin-top:.75rem; }.cod-finance__exception input { flex:1; }.cod-finance__workflow button.quiet { background:#fff; color:#526477; border:1px solid #cddbe7; }.cod-finance__success { margin:1rem 0 0; color:#087f52; font-weight:700; }.cod-finance__void { margin:1rem 0 0; color:#b42318; }.cod-finance__empty,.cod-finance-loading { padding:3rem; text-align:center; color:#607187; border:1px dashed #c9d8e5; border-radius:1rem; background:#fff; } @media(max-width:760px){.cod-finance { padding:1rem; }.cod-finance__header,.cod-finance__topline { flex-direction:column; }.cod-finance__amounts,.cod-finance__fields { grid-template-columns:1fr 1fr; }.cod-finance__exception { flex-direction:column; align-items:stretch; }.cod-finance__workflow button { width:100%; }}
      `}</style>
    </main>
  );
};

export default CODReconciliation;

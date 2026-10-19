import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const texts = {
  en: { title: 'Courses Reconciliation', warning: 'Confirm money has arrived in your bank account before verifying. Recording a payout does not send money.', refresh: 'Refresh', loading: 'Loading course payments', empty: 'No course transfers yet.', buyer: 'Buyer', instructor: 'Instructor', price: 'Buyer payment', fee: 'rifKANDO commission', payout: 'Instructor amount', ref: 'Buyer transfer reference', note: 'Verification note', verify: 'Verify transfer', reject: 'Reject transfer', payoutRef: 'Actual instructor payout reference', record: 'Record payout', error: 'Unable to update or load payments.', done: 'Payment updated.', noRef: 'Enter the real payout reference.', paid: 'Recorded payout reference', confirm: 'Have you confirmed this transfer in the bank account?' },
  fr: { title: 'Réconciliation des cours', warning: 'Vérifiez la réception sur votre compte bancaire avant validation. Enregistrer un paiement ne transfère pas d’argent.', refresh: 'Actualiser', loading: 'Chargement des paiements', empty: 'Aucun virement de cours.', buyer: 'Acheteur', instructor: 'Formateur', price: 'Paiement acheteur', fee: 'Commission rifKANDO', payout: 'Montant formateur', ref: 'Référence du virement', note: 'Note de vérification', verify: 'Vérifier le virement', reject: 'Rejeter le virement', payoutRef: 'Référence réelle du paiement au formateur', record: 'Enregistrer le paiement', error: 'Impossible de charger ou modifier les paiements.', done: 'Paiement mis à jour.', noRef: 'Saisissez la référence réelle du paiement.', paid: 'Référence du paiement enregistré', confirm: 'Avez-vous confirmé ce virement sur le compte bancaire ?' },
  ar: { title: 'تسوية الدورات', warning: 'تحقق من وصول المبلغ إلى حسابك البنكي قبل التأكيد. تسجيل مستحقات المدرّس لا يرسل المال.', refresh: 'تحديث', loading: 'جارٍ تحميل المدفوعات', empty: 'لا توجد تحويلات للدورات بعد.', buyer: 'المشتري', instructor: 'المدرّس', price: 'دفعة المشتري', fee: 'عمولة rifKANDO', payout: 'مستحقات المدرّس', ref: 'مرجع تحويل المشتري', note: 'ملاحظة التحقق', verify: 'تأكيد التحويل', reject: 'رفض التحويل', payoutRef: 'مرجع دفع المستحقات الحقيقي', record: 'تسجيل دفع المستحقات', error: 'تعذر تحميل المدفوعات أو تحديثها.', done: 'تم تحديث الدفع.', noRef: 'أدخل مرجع الدفع الحقيقي.', paid: 'مرجع الدفع المسجل', confirm: 'هل تحققت من وصول التحويل في الحساب البنكي؟' },
};

const statuses = {
  en: { awaiting_payment: 'Awaiting payment', submitted: 'Awaiting verification', verified: 'Verified', rejected: 'Rejected', refunded: 'Refunded', not_due: 'Not due', due: 'Due', paid: 'Paid', withheld: 'Withheld' },
  fr: { awaiting_payment: 'En attente de paiement', submitted: 'En attente de vérification', verified: 'Vérifié', rejected: 'Refusé', refunded: 'Remboursé', not_due: 'Non dû', due: 'Dû', paid: 'Payé', withheld: 'Retenu' },
  ar: { awaiting_payment: 'بانتظار الدفع', submitted: 'بانتظار التحقق', verified: 'تم التحقق', rejected: 'مرفوض', refunded: 'مسترد', not_due: 'غير مستحق', due: 'مستحق', paid: 'مدفوع', withheld: 'محتجز' },
};

export default function CourseReconciliationPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const c = texts[lang];
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState({});
  const [references, setReferences] = useState({});
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/admin/course-reconciliation'); setPayments(response.data.payments || []); }
    catch { setError(c.error); }
    finally { setLoading(false); }
  }, [c.error]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const perform = async (payment, action) => {
    if (action === 'verify' && !window.confirm(c.confirm)) return;
    if (action === 'payout' && !String(references[payment.id] || '').trim()) { setError(c.noRef); return; }
    setBusy(true); setError('');
    try {
      const path = action === 'payout' ? 'payout' : 'verify';
      const body = action === 'payout' ? { payoutReference: references[payment.id] } : { action, note: notes[payment.id] || '' };
      await api.post('/admin/course-reconciliation/' + payment.id + '/' + path, body);
      await load();
    } catch (e) { setError(e.response?.data?.error || c.error); }
    finally { setBusy(false); }
  };
  const money = (value) => (Number(value || 0) / 100).toLocaleString(lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-MA' : 'en-MA', { minimumFractionDigits: 2 }) + ' MAD';
  return <main className="course-reconcile" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header><h1>{c.title}</h1><p>{c.warning}</p><button onClick={load} disabled={loading || busy}>{c.refresh}</button></header>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">{c.loading}</p> : payments.length === 0 ? <p>{c.empty}</p> : payments.map(p => <article key={p.id}>
      <h2>{p.course_title}</h2><p>{p.purchase_number} | {statuses[lang][p.payment_status] || p.payment_status} | {statuses[lang][p.payout_status] || p.payout_status}</p>
      <dl><div><dt>{c.buyer}</dt><dd>{p.buyer_name}</dd></div><div><dt>{c.instructor}</dt><dd>{p.instructor_name}</dd></div><div><dt>{c.price}</dt><dd>{money(p.amount_minor)}</dd></div><div><dt>{c.fee}</dt><dd>{money(p.commission_minor)}</dd></div><div><dt>{c.payout}</dt><dd>{money(p.instructor_payout_minor)}</dd></div><div><dt>{c.ref}</dt><dd>{p.transfer_reference || '–'}</dd></div></dl>
      {p.payment_status === 'submitted' && <section><label>{c.note}<input maxLength="1000" value={notes[p.id] || ''} onChange={e => setNotes({ ...notes, [p.id]: e.target.value })} /></label><button disabled={busy} onClick={() => perform(p, 'verify')}>{c.verify}</button><button disabled={busy} onClick={() => perform(p, 'reject')}>{c.reject}</button></section>}
      {p.payment_status === 'verified' && p.payout_status === 'due' && <section><label>{c.payoutRef}<input maxLength="256" value={references[p.id] || ''} onChange={e => setReferences({ ...references, [p.id]: e.target.value })} /></label><button disabled={busy} onClick={() => perform(p, 'payout')}>{c.record}</button></section>}
      {p.payout_status === 'paid' && <p>{c.paid}: {p.payout_reference}</p>}
    </article>)}
    <style>{`.course-reconcile{max-width:1100px;margin:auto;padding:2rem 1rem 4rem;color:#173d5c}.course-reconcile header,.course-reconcile article{border:1px solid #d7e8f1;border-radius:18px;background:#fff;padding:1.2rem;margin-bottom:1rem}.course-reconcile header{background:#f2faff}.course-reconcile p{line-height:1.5}.course-reconcile dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:.75rem}.course-reconcile dl div{background:#f5fafe;padding:.7rem;border-radius:10px}.course-reconcile dt{font-size:.8rem}.course-reconcile dd{margin:.3rem 0 0;overflow-wrap:anywhere;font-weight:600}.course-reconcile section{display:flex;gap:.6rem;align-items:end;flex-wrap:wrap}.course-reconcile label{display:grid;gap:.3rem;flex:1;min-width:200px}.course-reconcile input{border:1px solid #bdd8e8;border-radius:8px;padding:.7rem;font:inherit}.course-reconcile button{border:0;border-radius:9px;background:#1779b7;color:white;padding:.7rem 1rem;cursor:pointer}.course-reconcile button:disabled{opacity:.6}`}</style>
  </main>;
}

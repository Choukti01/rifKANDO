import React, { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Wallet = () => {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'ar' ? 'ar' : i18n.resolvedLanguage === 'fr' ? 'fr' : 'en';
  const copy = {
    en: { load: 'Failed to load wallet data', hold: 'New seller withdrawals are available {{date}}', minimum: 'Minimum withdrawal is 100 MAD', insufficient: 'Insufficient balance', submitted: 'Withdrawal request submitted', submitFailed: 'Failed to submit withdrawal', loading: 'Loading wallet...', title: 'My Wallet', available: 'Available balance', withdraw: 'Withdraw', escrow: 'In escrow', escrowHint: 'Pending delivery confirmation', pending: 'Pending withdrawal', pendingHint: 'Being processed', earned: 'Total earned', earnedHint: 'Lifetime earnings', history: 'Transaction history', empty: 'No transactions yet', sale: 'Sale', withdrawal: 'Withdrawal', deposit: 'Deposit', other: 'Other', request: 'Request withdrawal', amount: 'Amount (MAD)', amountHint: 'Minimum 100 MAD', bank: 'Bank name', holder: 'Account holder name', account: 'Account number / IBAN', rib: 'RIB (optional)', cancel: 'Cancel', submit: 'Submit request', after: 'after {{days}} days' },
    fr: { load: 'Impossible de charger les données du portefeuille', hold: 'Les retraits des nouveaux vendeurs sont disponibles {{date}}', minimum: 'Le retrait minimum est de 100 MAD', insufficient: 'Solde insuffisant', submitted: 'Demande de retrait envoyée', submitFailed: 'Impossible d’envoyer la demande de retrait', loading: 'Chargement du portefeuille...', title: 'Mon portefeuille', available: 'Solde disponible', withdraw: 'Retirer', escrow: 'Sous séquestre', escrowHint: 'En attente de confirmation de livraison', pending: 'Retrait en attente', pendingHint: 'En cours de traitement', earned: 'Total gagné', earnedHint: 'Revenus cumulés', history: 'Historique des transactions', empty: 'Aucune transaction pour le moment', sale: 'Vente', withdrawal: 'Retrait', deposit: 'Dépôt', other: 'Autre', request: 'Demander un retrait', amount: 'Montant (MAD)', amountHint: 'Minimum 100 MAD', bank: 'Nom de la banque', holder: 'Nom du titulaire du compte', account: 'Numéro de compte / IBAN', rib: 'RIB (facultatif)', cancel: 'Annuler', submit: 'Envoyer la demande', after: 'après {{days}} jours' },
    ar: { load: 'تعذر تحميل بيانات المحفظة', hold: 'تتوفر سحوبات البائعين الجدد {{date}}', minimum: 'الحد الأدنى للسحب هو 100 درهم', insufficient: 'الرصيد غير كافٍ', submitted: 'تم إرسال طلب السحب', submitFailed: 'تعذر إرسال طلب السحب', loading: 'جارٍ تحميل المحفظة...', title: 'محفظتي', available: 'الرصيد المتاح', withdraw: 'اسحب', escrow: 'قيد الضمان', escrowHint: 'بانتظار تأكيد التوصيل', pending: 'سحب قيد الانتظار', pendingHint: 'جارٍ المعالجة', earned: 'إجمالي الأرباح', earnedHint: 'الأرباح مدى الحياة', history: 'سجل المعاملات', empty: 'لا توجد معاملات بعد', sale: 'بيع', withdrawal: 'سحب', deposit: 'إيداع', other: 'أخرى', request: 'اطلب سحبًا', amount: 'المبلغ (درهم)', amountHint: 'الحد الأدنى 100 درهم', bank: 'اسم البنك', holder: 'اسم صاحب الحساب', account: 'رقم الحساب / IBAN', rib: 'RIB (اختياري)', cancel: 'إلغاء', submit: 'إرسال الطلب', after: 'بعد {{days}} يومًا' },
  }[language];
  const text = (key, values = {}) => Object.entries(values).reduce((value, [name, replacement]) => value.replace(`{{${name}}}`, replacement), copy[key]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const withdrawalRequestIdRef = useRef(null);
  const [bankDetails, setBankDetails] = useState({ bank: '', account_name: '', account_number: '', rib: '' });

  useEffect(() => {
    let isCurrent = true;

    const loadWalletData = async () => {
      try {
        const [walletRes, transRes] = await Promise.all([
          api.get('/wallet/balance'),
          api.get('/wallet/transactions')
        ]);
        if (!isCurrent) return;

        setWallet(walletRes.data.wallet);
        setTransactions(transRes.data.transactions || []);
      } catch {
        if (isCurrent) toast.error(copy.load);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadWalletData();

    return () => {
      isCurrent = false;
    };
  }, []);

  const fetchWalletData = async () => {
    try {
      const [walletRes, transRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions')
      ]);
      setWallet(walletRes.data.wallet);
      setTransactions(transRes.data.transactions || []);
    } catch {
      toast.error(copy.load);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (wallet?.withdrawalEligibility?.eligible === false) {
      const availableAt = wallet.withdrawalEligibility.availableAt
        ? new Date(wallet.withdrawalEligibility.availableAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-MA')
        : text('after', { days: wallet.withdrawalEligibility.holdDays });
      toast.error(text('hold', { date: availableAt }));
      return;
    }
    if (!withdrawAmount || withdrawAmount < 100) {
      toast.error(copy.minimum);
      return;
    }
    if (withdrawAmount > wallet?.available_balance) {
      toast.error(copy.insufficient);
      return;
    }

    try {
      if (!withdrawalRequestIdRef.current) {
        withdrawalRequestIdRef.current = globalThis.crypto?.randomUUID?.()
          || `withdraw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      await api.post('/wallet/withdraw', {
        amount: parseFloat(withdrawAmount),
        method: 'bank_transfer',
        bankDetails
      }, { headers: { 'Idempotency-Key': withdrawalRequestIdRef.current } });
      toast.success(copy.submitted);
      withdrawalRequestIdRef.current = null;
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchWalletData();
    } catch (error) {
      toast.error(error.response?.data?.error || copy.submitFailed);
    }
  };

  if (loading) return <div className="text-center py-16"><div className="spinner"></div><p>{copy.loading}</p></div>;

  const withdrawalEligibility = wallet?.withdrawalEligibility;
  const withdrawalAvailableAt = withdrawalEligibility?.availableAt
    ? new Date(withdrawalEligibility.availableAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-MA')
    : null;
  const withdrawalsOnHold = withdrawalEligibility?.eligible === false;

  return (
    <div className="wallet-page">
      <h2>{copy.title}</h2>
      
      <div className="wallet-stats">
        <div className="stat-card">
          <div className="stat-label">{copy.available}</div>
          <div className="stat-value">{Number(wallet?.available_balance || 0).toLocaleString()} MAD</div>
          <button onClick={() => setShowWithdrawModal(true)} className="withdraw-btn" disabled={wallet?.available_balance < 100 || withdrawalsOnHold}>
            {copy.withdraw}
          </button>
          {withdrawalsOnHold && (
            <p className="withdrawal-hold-message">
              {text('hold', { date: withdrawalAvailableAt || text('after', { days: withdrawalEligibility.holdDays }) })}.
            </p>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">{copy.escrow}</div>
          <div className="stat-value">{Number(wallet?.escrow_balance || 0).toLocaleString()} MAD</div>
          <div className="stat-change">{copy.escrowHint}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{copy.pending}</div>
          <div className="stat-value">{Number(wallet?.pending_withdrawal || 0).toLocaleString()} MAD</div>
          <div className="stat-change">{copy.pendingHint}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{copy.earned}</div>
          <div className="stat-value">{Number(wallet?.total_earned || 0).toLocaleString()} MAD</div>
          <div className="stat-change">{copy.earnedHint}</div>
        </div>
      </div>

      <div className="transactions-card">
        <h3>{copy.history}</h3>
        {transactions.length === 0 ? (
          <p className="empty-text">{copy.empty}</p>
        ) : (
          <div className="transactions-list">
            {transactions.map(tx => (
              <div key={tx.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">
                    {tx.type === 'sale' ? `💰 ${copy.sale}` : tx.type === 'withdrawal' ? `🏦 ${copy.withdrawal}` : tx.type === 'deposit' ? `💳 ${copy.deposit}` : `🔄 ${copy.other}`}
                  </div>
                  <div className="transaction-desc">{tx.description}</div>
                  <div className="transaction-date">{new Date(tx.created_at).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-MA')}</div>
                </div>
                <div className={`transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} MAD
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <h3>{copy.request}</h3>
            <div className="form-group">
              <label>{copy.amount}</label>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="form-input" placeholder={copy.amountHint} />
            </div>
            <div className="form-group">
              <label>{copy.bank}</label>
              <input type="text" value={bankDetails.bank} onChange={e => setBankDetails({ ...bankDetails, bank: e.target.value })} className="form-input" />
            </div>
            <div className="form-group">
              <label>{copy.holder}</label>
              <input type="text" value={bankDetails.account_name} onChange={e => setBankDetails({ ...bankDetails, account_name: e.target.value })} className="form-input" />
            </div>
            <div className="form-group">
              <label>{copy.account}</label>
              <input type="text" value={bankDetails.account_number} onChange={e => setBankDetails({ ...bankDetails, account_number: e.target.value })} className="form-input" />
            </div>
            <div className="form-group">
              <label>{copy.rib}</label>
              <input type="text" value={bankDetails.rib} onChange={e => setBankDetails({ ...bankDetails, rib: e.target.value })} className="form-input" />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowWithdrawModal(false)} className="btn-cancel">{copy.cancel}</button>
              <button onClick={handleWithdraw} className="btn-confirm">{copy.submit}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .wallet-page { max-width: 1200px; margin: 0 auto; }
        .wallet-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .stat-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
        .stat-value { font-size: 1.75rem; font-weight: bold; margin-bottom: 1rem; }
        .withdraw-btn { background: #1a1a1a; color: white; padding: 0.5rem 1rem; border: none; border-radius: 2rem; cursor: pointer; font-size: 0.875rem; }
        .withdraw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .withdrawal-hold-message { margin: 0.75rem 0 0; color: #6b7280; font-size: 0.75rem; line-height: 1.4; }
        .transactions-card { background: white; border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .transactions-card h3 { font-size: 1rem; margin-bottom: 1rem; }
        .transactions-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .transaction-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
        .transaction-type { font-weight: 600; font-size: 0.875rem; }
        .transaction-desc { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
        .transaction-date { font-size: 0.7rem; color: #9ca3af; }
        .transaction-amount { font-weight: bold; font-size: 1rem; }
        .transaction-amount.positive { color: #10b981; }
        .transaction-amount.negative { color: #ef4444; }
        .empty-text { text-align: center; padding: 2rem; color: #6b7280; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-container { background: white; border-radius: 1rem; padding: 1.5rem; max-width: 500px; width: 90%; }
        .modal-container h3 { margin-bottom: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
        .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
        .btn-cancel { padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-confirm { padding: 0.5rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default Wallet;

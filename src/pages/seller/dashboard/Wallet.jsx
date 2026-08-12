import React, { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const Wallet = () => {
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
        if (isCurrent) toast.error('Failed to load wallet data');
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
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (wallet?.withdrawalEligibility?.eligible === false) {
      const availableAt = wallet.withdrawalEligibility.availableAt
        ? new Date(wallet.withdrawalEligibility.availableAt).toLocaleDateString()
        : `after ${wallet.withdrawalEligibility.holdDays} days`;
      toast.error(`New seller withdrawals are available ${availableAt}`);
      return;
    }
    if (!withdrawAmount || withdrawAmount < 100) {
      toast.error('Minimum withdrawal is 100 MAD');
      return;
    }
    if (withdrawAmount > wallet?.available_balance) {
      toast.error('Insufficient balance');
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
      toast.success('Withdrawal request submitted');
      withdrawalRequestIdRef.current = null;
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchWalletData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit withdrawal');
    }
  };

  if (loading) return <div className="text-center py-16"><div className="spinner"></div><p>Loading wallet...</p></div>;

  const withdrawalEligibility = wallet?.withdrawalEligibility;
  const withdrawalAvailableAt = withdrawalEligibility?.availableAt
    ? new Date(withdrawalEligibility.availableAt).toLocaleDateString()
    : null;
  const withdrawalsOnHold = withdrawalEligibility?.eligible === false;

  return (
    <div className="wallet-page">
      <h2>My Wallet</h2>
      
      <div className="wallet-stats">
        <div className="stat-card">
          <div className="stat-label">Available Balance</div>
          <div className="stat-value">{wallet?.available_balance?.toLocaleString()} MAD</div>
          <button onClick={() => setShowWithdrawModal(true)} className="withdraw-btn" disabled={wallet?.available_balance < 100 || withdrawalsOnHold}>
            Withdraw
          </button>
          {withdrawalsOnHold && (
            <p className="withdrawal-hold-message">
              New seller withdrawals are available {withdrawalAvailableAt || `after ${withdrawalEligibility.holdDays} days`}.
            </p>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">In Escrow</div>
          <div className="stat-value">{wallet?.escrow_balance?.toLocaleString()} MAD</div>
          <div className="stat-change">Pending delivery confirmation</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Withdrawal</div>
          <div className="stat-value">{wallet?.pending_withdrawal?.toLocaleString()} MAD</div>
          <div className="stat-change">Being processed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Earned</div>
          <div className="stat-value">{wallet?.total_earned?.toLocaleString()} MAD</div>
          <div className="stat-change">Lifetime earnings</div>
        </div>
      </div>

      <div className="transactions-card">
        <h3>Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="empty-text">No transactions yet</p>
        ) : (
          <div className="transactions-list">
            {transactions.map(tx => (
              <div key={tx.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">
                    {tx.type === 'sale' ? '💰 Sale' : tx.type === 'withdrawal' ? '🏦 Withdrawal' : tx.type === 'deposit' ? '💳 Deposit' : '🔄 Other'}
                  </div>
                  <div className="transaction-desc">{tx.description}</div>
                  <div className="transaction-date">{new Date(tx.created_at).toLocaleDateString()}</div>
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
            <h3>Request Withdrawal</h3>
            <div className="form-group">
              <label>Amount (MAD)</label>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="form-input" placeholder="Minimum 100 MAD" />
            </div>
            <div className="form-group">
              <label>Bank Name</label>
              <input type="text" value={bankDetails.bank} onChange={e => setBankDetails({ ...bankDetails, bank: e.target.value })} className="form-input" />
            </div>
            <div className="form-group">
              <label>Account Holder Name</label>
              <input type="text" value={bankDetails.account_name} onChange={e => setBankDetails({ ...bankDetails, account_name: e.target.value })} className="form-input" />
            </div>
            <div className="form-group">
              <label>Account Number / IBAN</label>
              <input type="text" value={bankDetails.account_number} onChange={e => setBankDetails({ ...bankDetails, account_number: e.target.value })} className="form-input" />
            </div>
            <div className="form-group">
              <label>RIB (Optional)</label>
              <input type="text" value={bankDetails.rib} onChange={e => setBankDetails({ ...bankDetails, rib: e.target.value })} className="form-input" />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowWithdrawModal(false)} className="btn-cancel">Cancel</button>
              <button onClick={handleWithdraw} className="btn-confirm">Submit Request</button>
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

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { COMMISSION_RATES, WITHDRAWAL_HOLD_DAYS } from '../../../config/commissionPolicy';

const COMMISSION_CATEGORIES = [
  { key: 'product', label: 'Physical products' },
  { key: 'course', label: 'Courses' },
  { key: 'service', label: 'Services' },
  { key: 'digital', label: 'Digital products' },
  { key: 'booking', label: 'Bookings' },
];

const formatCurrency = (amount) => `${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(amount || 0))} MAD`;

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
};

const transactionLabel = (type) => ({
  sale: 'Sale',
  withdrawal: 'Withdrawal',
  withdrawal_reversal: 'Withdrawal reversal',
  refund: 'Refund',
  purchase: 'Purchase',
}[type] || 'Wallet activity');

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let isCurrent = true;

    const loadEarnings = async () => {
      try {
        const [walletResponse, transactionsResponse] = await Promise.all([
          api.get('/wallet/balance'),
          api.get('/wallet/transactions'),
        ]);
        if (!isCurrent) return;

        setWallet(walletResponse.data.wallet || null);
        setTransactions(transactionsResponse.data.transactions || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to load earnings:', error);
          toast.error('Failed to load earnings');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadEarnings();

    return () => {
      isCurrent = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner" />
        <p>Loading earnings...</p>
      </div>
    );
  }

  const withdrawalEligibility = wallet?.withdrawalEligibility;
  const withdrawalsOnHold = withdrawalEligibility?.eligible === false;

  return (
    <div className="earnings-page">
      <div className="earnings-summary">
        <div className="summary-card">
          <div className="summary-label">Total earned</div>
          <div className="summary-value">{formatCurrency(wallet?.total_earned)}</div>
          <div className="summary-hint">Lifetime seller credits</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Available balance</div>
          <div className="summary-value">{formatCurrency(wallet?.available_balance)}</div>
          <div className="summary-hint">Ready to withdraw when eligible</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">In escrow</div>
          <div className="summary-value">{formatCurrency(wallet?.escrow_balance)}</div>
          <div className="summary-hint">Awaiting delivery confirmation</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pending withdrawal</div>
          <div className="summary-value">{formatCurrency(wallet?.pending_withdrawal)}</div>
          <div className="summary-hint">Being processed</div>
        </div>
      </div>

      {withdrawalsOnHold && (
        <div className="withdrawal-notice" role="status">
          New sellers can request a withdrawal after {WITHDRAWAL_HOLD_DAYS} days. Your wallet becomes available on{' '}
          <strong>{formatDate(withdrawalEligibility.availableAt)}</strong>.
        </div>
      )}

      <section className="commission-card" aria-labelledby="commission-title">
        <div>
          <h3 id="commission-title">rifKANDO commission by category</h3>
          <p>The applicable commission is recorded before seller funds enter the wallet.</p>
        </div>
        <div className="commission-grid">
          {COMMISSION_CATEGORIES.map(({ key, label }) => (
            <div className="commission-item" key={key}>
              <span>{label}</span>
              <strong>{COMMISSION_RATES[key]}%</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="transactions-card" aria-labelledby="transaction-title">
        <h3 id="transaction-title">Wallet activity</h3>
        {transactions.length === 0 ? (
          <div className="empty-transactions">
            <p>No wallet activity yet.</p>
          </div>
        ) : (
          <div className="transactions-table">
            <div className="table-header" aria-hidden="true">
              <span>Date</span>
              <span>Description</span>
              <span>Type</span>
              <span>Amount</span>
            </div>
            {transactions.map((transaction) => (
              <div className="table-row" key={transaction.id}>
                <span data-label="Date">{formatDate(transaction.created_at)}</span>
                <span data-label="Description" className="transaction-description">
                  {transaction.description || 'Wallet activity'}
                </span>
                <span data-label="Type" className="transaction-type">{transactionLabel(transaction.type)}</span>
                <span
                  data-label="Amount"
                  className={`amount ${Number(transaction.amount) >= 0 ? 'positive' : 'negative'}`}
                >
                  {Number(transaction.amount) > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .earnings-page { max-width: 1200px; margin: 0 auto; }
        .earnings-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.25rem; }
        .summary-card, .commission-card, .transactions-card { background: #fff; border: 1px solid #e7edf5; border-radius: 1rem; box-shadow: 0 1px 3px rgba(15, 23, 42, .06); }
        .summary-card { padding: 1.35rem; }
        .summary-label { color: #64748b; font-size: .82rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
        .summary-value { color: #0f172a; font-size: 1.6rem; font-weight: 750; margin: .55rem 0 .35rem; }
        .summary-hint { color: #64748b; font-size: .78rem; line-height: 1.4; }
        .withdrawal-notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: .8rem; color: #1e3a5f; margin-bottom: 1.25rem; padding: .9rem 1rem; }
        .commission-card { display: grid; gap: 1.25rem; margin-bottom: 1.25rem; padding: 1.35rem; }
        .commission-card h3, .transactions-card h3 { color: #0f172a; font-size: 1.05rem; margin: 0 0 .35rem; }
        .commission-card p { color: #64748b; font-size: .9rem; margin: 0; }
        .commission-grid { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); }
        .commission-item { align-items: center; background: #f8fafc; border: 1px solid #e7edf5; border-radius: .75rem; display: flex; justify-content: space-between; padding: .8rem; }
        .commission-item span { color: #475569; font-size: .82rem; }
        .commission-item strong { color: #1172ba; font-size: 1rem; }
        .transactions-card { padding: 1.35rem; }
        .transactions-table { overflow-x: auto; }
        .table-header, .table-row { align-items: center; display: grid; gap: 1rem; grid-template-columns: 110px minmax(220px, 1fr) 130px 120px; min-width: 650px; padding: .85rem .25rem; }
        .table-header { border-bottom: 1px solid #e7edf5; color: #64748b; font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .table-row { border-bottom: 1px solid #f1f5f9; color: #334155; font-size: .87rem; }
        .table-row:last-child { border-bottom: 0; }
        .transaction-description { overflow-wrap: anywhere; }
        .transaction-type { color: #475569; text-transform: capitalize; }
        .amount { font-weight: 700; text-align: right; }
        .amount.positive { color: #15803d; }
        .amount.negative { color: #b91c1c; }
        .empty-transactions { color: #64748b; padding: 2rem 1rem; text-align: center; }
        @media (max-width: 640px) {
          .summary-value { font-size: 1.4rem; }
          .commission-card, .transactions-card { padding: 1rem; }
          .table-header { display: none; }
          .transactions-table { overflow: visible; }
          .table-row { display: grid; gap: .55rem; grid-template-columns: 1fr auto; min-width: 0; padding: 1rem 0; }
          .table-row span { display: flex; justify-content: space-between; gap: 1rem; }
          .table-row span::before { color: #64748b; content: attr(data-label); font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
          .transaction-description { grid-column: 1 / -1; }
          .amount { text-align: left; }
        }
      `}</style>
    </div>
  );
};

export default Earnings;

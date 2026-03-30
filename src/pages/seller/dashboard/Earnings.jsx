import React from 'react'

const Earnings = () => {
  const transactions = [
    { id: 1, date: '2024-03-20', description: 'iPhone 13 Pro Sale', amount: 8550, status: 'completed' },
    { id: 2, date: '2024-03-18', description: 'Nike Air Max Sale', amount: 801, status: 'completed' },
    { id: 3, date: '2024-03-15', description: 'React Course Enrollment', amount: 449, status: 'pending' },
  ]

  return (
    <div>
      <div className="earnings-summary">
        <div className="summary-card">
          <div className="summary-label">Total Earnings</div>
          <div className="summary-value">45,230 MAD</div>
          <div className="summary-change">↑ 18% from last month</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Available Balance</div>
          <div className="summary-value">12,500 MAD</div>
          <button className="withdraw-btn">Withdraw</button>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pending Balance</div>
          <div className="summary-value">32,730 MAD</div>
          <div className="summary-hint">Will be available in 14 days</div>
        </div>
      </div>

      <div className="transactions-card">
        <h3>Transaction History</h3>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.description}</td>
                  <td className={tx.status === 'completed' ? 'text-success' : 'text-warning'}>{tx.amount} MAD</td>
                  <td>
                    <span className={`status-badge ${tx.status}`}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .earnings-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .summary-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-align: center;
        }
        .summary-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .summary-value {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .summary-change {
          font-size: 0.75rem;
          color: #10b981;
        }
        .summary-hint {
          font-size: 0.7rem;
          color: #9ca3af;
          margin-top: 0.5rem;
        }
        .withdraw-btn {
          margin-top: 0.75rem;
          padding: 0.5rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .transactions-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .transactions-card h3 {
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .transactions-table {
          overflow-x: auto;
        }
        .transactions-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .transactions-table th,
        .transactions-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .transactions-table th {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .text-success {
          color: #10b981;
        }
        .text-warning {
          color: #f59e0b;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }
        .status-badge.completed {
          background: #d1fae5;
          color: #065f46;
        }
        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }
      `}</style>
    </div>
  )
}

export default Earnings
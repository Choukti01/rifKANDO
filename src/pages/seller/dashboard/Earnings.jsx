import React, { useState, useEffect } from 'react';
import { getOrders, getMyProducts, getMyCourses, getMyServices, getMyDigitalProducts, getMyBookings } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Earnings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState({
    products: 0,
    courses: 0,
    services: 0,
    digital: 0,
    bookings: 0
  });

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      
      // Fetch all orders
      const ordersRes = await getOrders();
      const orders = ordersRes.data.orders || [];
      
      // Fetch seller's items to know which orders belong to them
      const [productsRes, coursesRes, servicesRes, digitalRes, bookingsRes] = await Promise.all([
        getMyProducts().catch(() => ({ data: { products: [] } })),
        getMyCourses().catch(() => ({ data: { courses: [] } })),
        getMyServices().catch(() => ({ data: { services: [] } })),
        getMyDigitalProducts().catch(() => ({ data: { products: [] } })),
        getMyBookings().catch(() => ({ data: { bookings: [] } }))
      ]);
      
      const myProductIds = new Set((productsRes.data.products || []).map(p => p.id));
      const myCourseIds = new Set((coursesRes.data.courses || []).map(c => c.id));
      const myServiceIds = new Set((servicesRes.data.services || []).map(s => s.id));
      const myDigitalIds = new Set((digitalRes.data.products || []).map(d => d.id));
      const myBookingIds = new Set((bookingsRes.data.bookings || []).map(b => b.id));
      
      // Calculate earnings from orders
      let totalEarnings = 0;
      let thisMonthEarnings = 0;
      let lastMonthEarnings = 0;
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const transactionList = [];
      let productSales = 0;
      let courseSales = 0;
      let serviceSales = 0;
      let digitalSales = 0;
      let bookingSales = 0;
      
      for (const order of orders) {
        // Check if order contains any of seller's items
        let orderBelongsToSeller = false;
        let orderAmount = 0;
        
        // For now, we'll assume commission is 10% of order total
        // In a real app, you'd calculate based on actual items
        const commission = order.total * 0.1;
        const sellerEarnings = order.total * 0.9;
        
        // Determine category based on order items (simplified)
        // In real app, you'd check actual items
        if (myProductIds.size > 0) {
          productSales += sellerEarnings;
          orderBelongsToSeller = true;
        }
        if (myCourseIds.size > 0) {
          courseSales += sellerEarnings;
          orderBelongsToSeller = true;
        }
        if (myServiceIds.size > 0) {
          serviceSales += sellerEarnings;
          orderBelongsToSeller = true;
        }
        if (myDigitalIds.size > 0) {
          digitalSales += sellerEarnings;
          orderBelongsToSeller = true;
        }
        if (myBookingIds.size > 0) {
          bookingSales += sellerEarnings;
          orderBelongsToSeller = true;
        }
        
        if (orderBelongsToSeller) {
          totalEarnings += sellerEarnings;
          
          const orderDate = new Date(order.created_at);
          if (orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear) {
            thisMonthEarnings += sellerEarnings;
          }
          if (orderDate >= lastMonthDate && orderDate < new Date(thisYear, thisMonth, 1)) {
            lastMonthEarnings += sellerEarnings;
          }
          
          transactionList.push({
            id: order.id,
            orderNumber: order.order_number,
            amount: sellerEarnings,
            commission: commission,
            date: order.created_at,
            status: order.status || 'completed',
            type: 'sale'
          });
        }
      }
      
      setSalesByCategory({
        products: productSales,
        courses: courseSales,
        services: serviceSales,
        digital: digitalSales,
        bookings: bookingSales
      });
      
      setEarnings({
        totalEarnings,
        availableBalance: totalEarnings * 0.7, // 70% available, 30% pending
        pendingBalance: totalEarnings * 0.3,
        thisMonthEarnings,
        lastMonthEarnings
      });
      
      setTransactions(transactionList);
      
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount) + ' MAD';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading earnings...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Earnings Summary Cards */}
      <div className="earnings-summary">
        <div className="summary-card">
          <div className="summary-label">Total Earnings</div>
          <div className="summary-value">{formatCurrency(earnings.totalEarnings)}</div>
          <div className="summary-change">Lifetime earnings</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Available Balance</div>
          <div className="summary-value">{formatCurrency(earnings.availableBalance)}</div>
          <button className="withdraw-btn">Withdraw</button>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pending Balance</div>
          <div className="summary-value">{formatCurrency(earnings.pendingBalance)}</div>
          <div className="summary-hint">Will be available in 14 days</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">This Month</div>
          <div className="summary-value">{formatCurrency(earnings.thisMonthEarnings)}</div>
          <div className={`summary-change ${earnings.thisMonthEarnings > earnings.lastMonthEarnings ? 'positive' : 'negative'}`}>
            {earnings.lastMonthEarnings > 0 ? `${((earnings.thisMonthEarnings - earnings.lastMonthEarnings) / earnings.lastMonthEarnings * 100).toFixed(1)}% vs last month` : 'First month'}
          </div>
        </div>
      </div>

      {/* Sales by Category */}
      <div className="category-sales">
        <h3>Sales by Category</h3>
        <div className="category-grid">
          <div className="category-item">
            <div className="category-icon">📦</div>
            <div className="category-info">
              <span className="category-name">Products</span>
              <span className="category-amount">{formatCurrency(salesByCategory.products)}</span>
            </div>
          </div>
          <div className="category-item">
            <div className="category-icon">📚</div>
            <div className="category-info">
              <span className="category-name">Courses</span>
              <span className="category-amount">{formatCurrency(salesByCategory.courses)}</span>
            </div>
          </div>
          <div className="category-item">
            <div className="category-icon">🛠️</div>
            <div className="category-info">
              <span className="category-name">Services</span>
              <span className="category-amount">{formatCurrency(salesByCategory.services)}</span>
            </div>
          </div>
          <div className="category-item">
            <div className="category-icon">💻</div>
            <div className="category-info">
              <span className="category-name">Digital</span>
              <span className="category-amount">{formatCurrency(salesByCategory.digital)}</span>
            </div>
          </div>
          <div className="category-item">
            <div className="category-icon">📅</div>
            <div className="category-info">
              <span className="category-name">Bookings</span>
              <span className="category-amount">{formatCurrency(salesByCategory.bookings)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="transactions-card">
        <h3>Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="empty-transactions">
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="transactions-table">
            <div className="table-header">
              <span>Date</span>
              <span>Order ID</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Commission</span>
              <span>Status</span>
            </div>
            {transactions.map(tx => (
              <div key={tx.id} className="table-row">
                <span>{new Date(tx.date).toLocaleDateString()}</span>
                <span className="order-id">{tx.orderNumber}</span>
                <span className="transaction-type">{tx.type}</span>
                <span className="amount">{formatCurrency(tx.amount)}</span>
                <span className="commission">{formatCurrency(tx.commission)}</span>
                <span className="status" style={{ color: getStatusColor(tx.status) }}>
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .earnings-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .summary-change {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .summary-change.positive {
          color: #10b981;
        }
        .summary-change.negative {
          color: #ef4444;
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
        .category-sales {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
        }
        .category-sales h3 {
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .category-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 0.75rem;
        }
        .category-icon {
          font-size: 2rem;
        }
        .category-info {
          display: flex;
          flex-direction: column;
        }
        .category-name {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .category-amount {
          font-weight: 600;
          font-size: 1rem;
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
        .empty-transactions {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
        .transactions-table {
          overflow-x: auto;
        }
        .table-header, .table-row {
          display: grid;
          grid-template-columns: 100px 1fr 80px 120px 120px 100px;
          gap: 1rem;
          padding: 0.75rem;
          align-items: center;
        }
        .table-header {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }
        .table-row {
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
        }
        .order-id {
          font-family: monospace;
          font-size: 0.8rem;
        }
        .transaction-type {
          text-transform: capitalize;
        }
        .amount {
          font-weight: 600;
        }
        .commission {
          color: #6b7280;
        }
        .status {
          text-transform: capitalize;
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .table-header, .table-row {
            grid-template-columns: 80px 1fr 70px 100px 100px 80px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Earnings;
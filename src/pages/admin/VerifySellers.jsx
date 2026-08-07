import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const VerifySellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const res = await api.get('/admin/unverified-sellers');
      setSellers(res.data.sellers || []);
    } catch {
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, verified) => {
    try {
      await api.put(`/admin/verify-seller/${userId}`, { verified });
      toast.success(`Seller ${verified ? 'verified' : 'unverified'}`);
      fetchSellers();
    } catch {
      toast.error('Update failed');
    }
  };

  if (loading) return <div className="text-center py-16"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="verify-sellers">
      <h2>Verify Sellers</h2>
      <p>Review pending seller accounts and grant verification badge</p>
      {sellers.length === 0 ? (
        <div className="empty-state">All sellers are verified or none pending.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Seller Type</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.seller_type}</td>
                <td>{new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleVerify(s.id, true)} className="btn-verify">Verify ✓</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style>{`
        .verify-sellers { padding: 1rem; background: white; border-radius: 1rem; }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th, .admin-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .btn-verify { background: #10b981; color: white; border: none; padding: 0.375rem 1rem; border-radius: 0.5rem; cursor: pointer; }
        .btn-verify:hover { background: #059669; }
        .empty-state { text-align: center; padding: 2rem; color: #6b7280; }
      `}</style>
    </div>
  );
};

export default VerifySellers;

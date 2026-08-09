import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const DigitalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    const loadRequests = async () => {
      try {
        const res = await api.get('/seller/digital-requests');
        if (isCurrent) setRequests(res.data.requests || []);
      } catch {
        if (isCurrent) toast.error('Failed to load requests');
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadRequests();

    return () => {
      isCurrent = false;
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/seller/digital-requests');
      setRequests(res.data.requests || []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const completeRequest = async (requestId) => {
    if (!window.confirm('Mark as completed? The buyer will be able to download the file.')) return;
    try {
      await api.patch(`/seller/digital-requests/${requestId}/complete`);
      toast.success('Request completed! Buyer can now download.');
      fetchRequests();
    } catch {
      toast.error('Failed to complete request');
    }
  };

  if (loading) return <div className="text-center py-8">Loading requests...</div>;

  return (
    <div className="digital-requests">
      <h3>Buyer Requests for Your Digital Products</h3>
      {requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <div className="requests-list">
          {requests.map(req => (
            <div key={req.id} className="request-card">
              <div className="request-info">
                <h4>{req.product_title}</h4>
                <p><strong>Buyer:</strong> {req.buyer_name}</p>
                <p><strong>Contact:</strong> {req.buyer_phone || req.buyer_email}</p>
                <p><strong>Status:</strong> <span className={`status-${req.status}`}>{req.status}</span></p>
              </div>
              {req.status === 'pending' && (
                <button onClick={() => completeRequest(req.id)} className="complete-btn">Mark as Paid & Complete</button>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`
        .digital-requests { padding: 1rem; }
        .requests-list { display: flex; flex-direction: column; gap: 1rem; }
        .request-card { background: #f9fafb; border-radius: 0.75rem; padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
        .status-pending { color: #f59e0b; font-weight: bold; }
        .status-completed { color: #10b981; font-weight: bold; }
        .complete-btn { background: #1a1a1a; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default DigitalRequests;

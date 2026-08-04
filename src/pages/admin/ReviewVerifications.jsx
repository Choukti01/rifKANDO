import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ReviewVerifications = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const res = await api.get('/admin/pending-verifications');
      setVerifications(res.data.verifications || []);
    } catch (error) {
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (docId, action) => {
    try {
      await api.patch(`/admin/verify-document/${docId}`, { action });
      toast.success(`Document ${action}d`);
      fetchVerifications();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const viewDocument = async (docId) => {
    try {
      const response = await api.get(`/admin/verification-documents/${docId}/file`, { responseType: 'blob' });
      const documentUrl = URL.createObjectURL(response.data);
      window.open(documentUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(documentUrl), 60_000);
    } catch (error) {
      toast.error('Failed to retrieve the private document');
    }
  };

  if (loading) return <div className="text-center py-16">Loading...</div>;

  return (
    <div className="review-verifications">
      <h2>Pending Seller Verifications</h2>
      {verifications.length === 0 ? (
        <p>No pending verifications.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Seller</th><th>Document Type</th><th>Document</th><th>Submitted</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {verifications.map(v => (
              <tr key={v.id}>
                <td>{v.user_name}<br/><small>{v.user_email}</small></td>
                <td>{v.document_type === 'national_id' ? 'National ID' : 'Passport'}</td>
                <td><button type="button" onClick={() => viewDocument(v.id)} className="btn-document">View Document</button></td>
                <td>{new Date(v.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleAction(v.id, 'approve')} className="btn-approve">Approve</button>
                  <button onClick={() => handleAction(v.id, 'reject')} className="btn-reject">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style>{`
        .review-verifications { padding: 1rem; background: white; border-radius: 1rem; }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th, .admin-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .btn-approve { background: #10b981; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 0.5rem; cursor: pointer; margin-right: 0.5rem; }
        .btn-reject { background: #ef4444; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 0.5rem; cursor: pointer; }
        .btn-document { background: #2563eb; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 0.5rem; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default ReviewVerifications;

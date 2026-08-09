import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MyPurchasesPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    const loadPurchases = async () => {
      try {
        const response = await api.get('/my-purchases');
        if (isCurrent) setPurchases(response.data.purchases || []);
      } catch {
        if (isCurrent) toast.error('Failed to load purchases');
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadPurchases();

    return () => {
      isCurrent = false;
    };
  }, []);

  const downloadFile = async (productId) => {
    try {
      const response = await api.get(`/digital/${productId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from Content-Disposition header if possible, otherwise use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) filename = match[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to download');
    }
  };

  if (loading) return <div className="text-center py-16"><div className="spinner"></div><p>Loading purchases...</p></div>;

  return (
    <div className="my-purchases">
      <div className="container">
        <h1>My Digital Purchases</h1>
        {purchases.length === 0 ? (
          <p>You haven't purchased any digital products yet.</p>
        ) : (
          <div className="purchases-grid">
            {purchases.map(purchase => (
              <div key={purchase.id} className="purchase-card">
                <div className="purchase-image">
                  {purchase.image ? (
                    <img src={`http://localhost:5000${purchase.image}`} alt={purchase.title} />
                  ) : (
                    <span>💻</span>
                  )}
                </div>
                <div className="purchase-info">
                  <h3>{purchase.title}</h3>
                  <p>Purchased on: {new Date(purchase.created_at).toLocaleDateString()}</p>
                  <button onClick={() => downloadFile(purchase.product_id)} className="download-btn">
                    Download Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .my-purchases { padding: 2rem 0; }
        .purchases-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
        .purchase-card { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; padding: 1rem; gap: 1rem; }
        .purchase-image { width: 80px; height: 80px; background: #f3f4f6; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .purchase-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 0.5rem; }
        .purchase-info h3 { font-size: 1rem; margin-bottom: 0.5rem; }
        .purchase-info p { font-size: 0.75rem; color: #6b7280; margin-bottom: 1rem; }
        .download-btn { background: #87CEEB; color: #1a1a1a; border: none; padding: 0.5rem 1rem; border-radius: 2rem; cursor: pointer; font-size: 0.75rem; }
        .download-btn:hover { background: #6bb5d4; }
      `}</style>
    </div>
  );
};

export default MyPurchasesPage;

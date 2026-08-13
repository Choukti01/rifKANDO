import React, { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import { downloadDigitalProduct, getMyPurchases } from '../../services/api';
import { downloadBlobResponse } from '../../utils/downloadFile';

const MyPurchasesPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await getMyPurchases();
        if (active) setPurchases(response.data.purchases || []);
      } catch (error) {
        if (active) toast.error(error.response?.data?.error || 'Unable to load your purchases.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const download = async (purchase) => {
    setDownloadingId(purchase.id);
    try {
      const response = await downloadDigitalProduct(purchase.product_id);
      downloadBlobResponse(response, purchase.file_name || purchase.title || 'rifKANDO-download');
      setPurchases((current) => current.map((item) => item.id === purchase.id ? { ...item, download_count: Number(item.download_count || 0) + 1, last_downloaded_at: new Date().toISOString() } : item));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to download this file.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="text-center py-16"><div className="spinner" /><p>Loading purchases...</p></div>;
  return (
    <main className="my-digital-purchases"><div className="container"><header><p>Digital library</p><h1>My downloads</h1><span>Every file is delivered as a private attachment from your rifKANDO account.</span></header>{purchases.length === 0 ? <div className="digital-library-empty"><DocumentIcon /><h2>Your digital library is empty</h2><p>Products with granted access will appear here.</p></div> : <div className="digital-library-grid">{purchases.map((purchase) => { const isLimited = Number(purchase.download_limit) > 0; const exhausted = isLimited && Number(purchase.download_count) >= Number(purchase.download_limit); return <article key={purchase.id} className="digital-library-card"><div className="digital-library-image">{purchase.image ? <MarketplaceImage source={purchase.image} alt={purchase.title} /> : <span>💻</span>}</div><div className="digital-library-copy"><h2>{purchase.title}</h2><p>{purchase.file_name || 'Private digital file'}{purchase.file_size ? ` · ${purchase.file_size}` : ''}</p><small>Granted {new Date(purchase.granted_at || purchase.created_at).toLocaleDateString()}</small>{isLimited && <small>{purchase.download_count || 0} of {purchase.download_limit} downloads used</small>}{purchase.last_downloaded_at && <small>Last downloaded {new Date(purchase.last_downloaded_at).toLocaleDateString()}</small>}</div><button type="button" className="digital-library-download" disabled={downloadingId === purchase.id || exhausted} onClick={() => download(purchase)}><ArrowDownTrayIcon /> {exhausted ? 'Download limit reached' : downloadingId === purchase.id ? 'Preparing...' : 'Download'}</button></article>; })}</div>}</div><style>{`
      .my-digital-purchases { min-height: calc(100vh - 80px); padding: 32px 0 52px; color: #19353e; }.my-digital-purchases header { margin-bottom: 23px; }.my-digital-purchases header p { margin: 0 0 7px; color: #216275; font-size: .76rem; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }.my-digital-purchases header h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.5rem); letter-spacing: -.04em; }.my-digital-purchases header span { display: block; margin-top: 7px; color: #63777e; line-height: 1.55; }.digital-library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(285px, 1fr)); gap: 15px; }.digital-library-card { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 14px; padding: 14px; border: 1px solid #dce8eb; border-radius: 16px; background: #fff; box-shadow: 0 7px 22px rgba(20, 59, 68, .045); }.digital-library-image { width: 74px; height: 74px; display: grid; place-items: center; overflow: hidden; border-radius: 11px; background: #eff7f8; font-size: 2rem; }.digital-library-image img { width: 100%; height: 100%; object-fit: cover; }.digital-library-copy { min-width: 0; display: grid; align-content: start; gap: 3px; }.digital-library-copy h2 { margin: 0; overflow-wrap: anywhere; font-size: .96rem; }.digital-library-copy p { margin: 2px 0 3px; color: #4d656d; font-size: .8rem; overflow-wrap: anywhere; }.digital-library-copy small { color: #71848a; font-size: .72rem; }.digital-library-download { grid-column: 1 / -1; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #216275; border-radius: 10px; background: #fff; color: #216275; font: inherit; font-size: .84rem; font-weight: 800; cursor: pointer; }.digital-library-download:hover:not(:disabled) { background: #216275; color: #fff; }.digital-library-download:disabled { opacity: .55; cursor: not-allowed; }.digital-library-download svg { width: 17px; height: 17px; }.digital-library-empty { display: grid; justify-items: center; padding: 55px 18px; border: 1px dashed #b7d0d6; border-radius: 16px; color: #647a81; text-align: center; }.digital-library-empty svg { width: 42px; height: 42px; color: #216275; }.digital-library-empty h2 { margin: 13px 0 5px; font-size: 1.1rem; color: #294951; }.digital-library-empty p { margin: 0; font-size: .88rem; }@media (max-width: 500px) { .my-digital-purchases { padding-top: 22px; } }
    `}</style></main>
  );
};

export default MyPurchasesPage;

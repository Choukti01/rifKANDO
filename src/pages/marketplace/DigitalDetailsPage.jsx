import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownTrayIcon, CheckCircleIcon, DocumentIcon, ShieldCheckIcon, StarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import useAuth from '../../hooks/useAuth';
import { downloadDigitalProduct, getDigitalDownloadAccess, getDigitalProduct, requestDigitalAccess } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import { downloadBlobResponse } from '../../utils/downloadFile';

const DigitalDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [productResult, accessResult] = await Promise.allSettled([
        getDigitalProduct(id),
        isAuthenticated ? getDigitalDownloadAccess(id) : Promise.resolve(null),
      ]);
      if (!active) return;
      if (productResult.status === 'fulfilled') setProduct(productResult.value.data.product);
      else toast.error('Unable to load this digital product.');
      if (accessResult.status === 'fulfilled') setCanDownload(Boolean(accessResult.value?.data?.canDownload));
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [id, isAuthenticated]);

  const requestAccess = async () => {
    setRequesting(true);
    try {
      await requestDigitalAccess(id);
      toast.success('Access request sent. You will see the download here when it is granted.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to send your access request.');
    } finally {
      setRequesting(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const response = await downloadDigitalProduct(id);
      downloadBlobResponse(response, `${product.title || 'rifKANDO-download'}`);
      setCanDownload(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to download this file.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner" /><p>Loading digital product...</p></div>;
  if (!product) return <div className="container text-center py-16"><p>Product not found.</p><Link to="/digital" className="btn btn-primary">Browse digital products</Link></div>;

  const primaryMedia = product.media?.find((media) => media.is_primary) || product.media?.[0];
  return (
    <main className="digital-details-page">
      <div className="container">
        <div className="digital-details-layout">
          <section className="digital-product-content">
            <span className="digital-category-pill">{product.category || 'Digital product'}</span>
            <h1>{product.title}</h1>
            <div className="digital-product-meta"><span><StarIcon /> {product.rating || 0} <small>({product.reviews_count || 0} reviews)</small></span><span>{product.downloads || 0} completed downloads</span></div>
            <div className="digital-seller-card"><div className="digital-seller-avatar">{product.seller_name?.charAt(0) || 'S'}</div><div><p>Created by</p><Link to={`/profile/${product.seller_id}`}>{product.seller_name || 'rifKANDO seller'}</Link></div></div>
            <section className="digital-copy-section"><h2>About this product</h2><p>{product.description}</p></section>
            <section className="digital-copy-section"><h2>Delivery details</h2><ul className="digital-delivery-list"><li><DocumentIcon /> Digital file{product.file_size ? ` · ${product.file_size}` : ''}</li><li><ShieldCheckIcon /> Private attachment delivery. File links are never public.</li><li><CheckCircleIcon /> Your granted version stays available even if the seller updates this listing.</li></ul></section>
          </section>
          <aside className="digital-purchase-panel">
            <div className="digital-preview" onClick={() => product.media?.length && setShowGallery(true)} role={product.media?.length ? 'button' : undefined} tabIndex={product.media?.length ? 0 : undefined}>
              {primaryMedia ? (primaryMedia.media_type === 'video' ? <video src={getImageUrl(primaryMedia.media_url)} aria-label={`${product.title} preview`} /> : <MarketplaceImage source={primaryMedia.media_url} alt={product.title} />) : <span>{product.image || '💻'}</span>}
              {product.media?.length > 1 && <b>{product.media.length} previews</b>}
            </div>
            <div className="digital-price"><strong>{product.price} MAD</strong>{product.old_price && <del>{product.old_price} MAD</del>}</div>
            {!isAuthenticated && <button className="digital-primary-action" onClick={() => navigate('/login')}>Log in to request access</button>}
            {isAuthenticated && canDownload && <button className="digital-primary-action" onClick={download} disabled={downloading}><ArrowDownTrayIcon /> {downloading ? 'Preparing download...' : 'Download your file'}</button>}
            {isAuthenticated && !canDownload && <button className="digital-primary-action" onClick={requestAccess} disabled={requesting}>{requesting ? 'Sending request...' : 'Request secure access'}</button>}
            <p className="digital-panel-note">Access requests use your rifKANDO account. We do not ask you to share your phone number or email with the seller.</p>
          </aside>
        </div>
      </div>
      {showGallery && <MediaGallery media={product.media.map((item) => ({ url: getImageUrl(item.media_url), type: item.media_type }))} onClose={() => setShowGallery(false)} />}
      <style>{`
        .digital-details-page { min-height: calc(100vh - 80px); padding: 34px 0 54px; color: #18323a; }.digital-details-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; align-items: start; gap: 42px; }.digital-category-pill { display: inline-flex; border-radius: 999px; padding: 6px 10px; background: #e7f4f7; color: #216275; font-size: .76rem; font-weight: 800; text-transform: capitalize; }.digital-product-content h1 { max-width: 820px; margin: 12px 0; font-size: clamp(1.9rem, 4vw, 3.2rem); line-height: 1.1; letter-spacing: -.045em; }.digital-product-meta { display: flex; gap: 16px; flex-wrap: wrap; color: #60737a; font-size: .85rem; }.digital-product-meta span { display: inline-flex; align-items: center; gap: 5px; }.digital-product-meta svg { width: 17px; height: 17px; color: #216275; }.digital-seller-card { display: flex; align-items: center; gap: 11px; margin: 25px 0 30px; padding: 13px; border: 1px solid #dde8eb; border-radius: 14px; max-width: 430px; }.digital-seller-avatar { width: 39px; height: 39px; display: grid; place-items: center; border-radius: 50%; background: #216275; color: #fff; font-weight: 800; }.digital-seller-card p { margin: 0 0 1px; color: #6c7d82; font-size: .72rem; }.digital-seller-card a { color: #193c46; font-weight: 750; text-decoration: none; }.digital-seller-card a:hover { color: #216275; }.digital-copy-section { max-width: 800px; margin-top: 27px; }.digital-copy-section h2 { font-size: 1.1rem; margin: 0 0 9px; }.digital-copy-section p { margin: 0; white-space: pre-line; color: #485f66; line-height: 1.7; }.digital-delivery-list { display: grid; gap: 11px; padding: 0; margin: 0; list-style: none; color: #465f66; line-height: 1.5; }.digital-delivery-list li { display: flex; gap: 9px; align-items: flex-start; }.digital-delivery-list svg { width: 20px; height: 20px; flex: 0 0 auto; color: #216275; }.digital-purchase-panel { position: sticky; top: 96px; padding: 15px; border: 1px solid #dce8eb; border-radius: 18px; background: #fff; box-shadow: 0 15px 38px rgba(17, 60, 71, .1); }.digital-preview { height: 190px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: #f1f7f8; cursor: pointer; position: relative; }.digital-preview img, .digital-preview video { width: 100%; height: 100%; object-fit: cover; }.digital-preview > span { font-size: 4rem; }.digital-preview b { position: absolute; right: 9px; bottom: 9px; padding: 5px 8px; border-radius: 999px; background: rgba(10, 31, 38, .72); color: #fff; font-size: .7rem; }.digital-price { display: flex; align-items: baseline; gap: 9px; padding: 18px 2px 15px; }.digital-price strong { font-size: 1.65rem; letter-spacing: -.03em; }.digital-price del { color: #849399; font-size: .87rem; }.digital-primary-action { width: 100%; display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 46px; border: 1px solid #216275; border-radius: 11px; background: #216275; color: #fff; font: inherit; font-weight: 800; cursor: pointer; transition: background .2s, transform .2s; }.digital-primary-action:hover:not(:disabled) { background: #194f5f; transform: translateY(-1px); }.digital-primary-action:disabled { opacity: .65; cursor: wait; }.digital-primary-action svg { width: 18px; height: 18px; }.digital-panel-note { margin: 12px 3px 1px; color: #61747a; font-size: .76rem; line-height: 1.45; }@media (max-width: 820px) { .digital-details-page { padding-top: 21px; }.digital-details-layout { grid-template-columns: 1fr; gap: 25px; }.digital-purchase-panel { position: static; }.digital-preview { height: 220px; } }
      `}</style>
    </main>
  );
};

export default DigitalDetailsPage;

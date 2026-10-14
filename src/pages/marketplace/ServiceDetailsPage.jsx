import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BriefcaseIcon, CheckBadgeIcon, ClockIcon, GlobeAltIcon, StarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import useAuth from '../../hooks/useAuth';
import { getService, getServiceProvider, requestService } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';

const availabilityLabel = { available: 'Available for new work', limited: 'Limited availability', unavailable: 'Not taking new work' };

const ServiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [service, setService] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [requirements, setRequirements] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await getService(id);
        if (!current) return;
        const next = response.data.service;
        setService(next);
        setSelectedPackage(next.packages?.[0] || null);
        const profileResponse = await getServiceProvider(next.provider_id);
        if (current) setProviderProfile(profileResponse.data);
      } catch (error) {
        if (current) toast.error(error.response?.data?.error || 'This service is not available.');
      }
    };
    void load();
    return () => { current = false; };
  }, [id]);

  const price = Number(selectedPackage?.price ?? service?.price ?? 0);
  const sendRequest = async () => {
    if (!isAuthenticated) {
      toast.error('Sign in to send a service request.');
      navigate('/login', { state: { from: `/service/${id}` } });
      return;
    }
    if (Number(user?.id) === Number(service.provider_id)) {
      toast.error('You cannot request your own service.');
      return;
    }
    if (requirements.trim().length < 10) {
      toast.error('Please describe what you need in at least a few words.');
      return;
    }
    setSubmitting(true);
    try {
      await requestService(service.id, { packageId: selectedPackage?.id || null, requirements });
      toast.success('Your service request was sent to the provider.');
      navigate('/service-requests');
    } catch (error) {
      toast.error(error.response?.data?.fields?.[0]?.message || error.response?.data?.error || 'Your request could not be sent.');
    } finally { setSubmitting(false); }
  };

  if (!service) return <div className="service-detail-loading">Loading service portfolio...</div>;
  const profile = providerProfile?.profile;
  const media = service.media || [];
  const primaryMedia = media.find((item) => item.is_primary) || media[0];
  const providerUnavailable = (profile?.availability || service.provider.availability) === 'unavailable';

  return <main className="service-detail-page">
    <div className="service-detail-shell">
      <nav className="service-detail-breadcrumb"><Link to="/services">Services</Link><span>/</span><span>{service.category}</span></nav>
      <div className="service-detail-layout">
        <section className="service-detail-main">
          <div className="service-detail-intro"><span className="service-detail-category"><BriefcaseIcon aria-hidden="true" />{service.category}</span><h1>{service.title}</h1><p>{service.description}</p></div>
          <button type="button" className="service-portfolio-cover" onClick={() => media.length && setGalleryOpen(true)} aria-label="Open service portfolio">
            {primaryMedia ? primaryMedia.media_type === 'video' ? <video src={getImageUrl(primaryMedia.media_url)} muted playsInline preload="metadata" /> : <MarketplaceImage source={primaryMedia.media_url} alt={service.title} /> : <span>Portfolio coming soon</span>}
            {media.length > 1 && <span className="service-media-count">{media.length} portfolio items</span>}
          </button>

          {(service.deliverables?.length > 0 || service.client_requirements?.length > 0) && <section className="service-scope-panel">
            {service.deliverables?.length > 0 && <div><p>Service scope</p><h2>What you receive</h2><ul>{service.deliverables.map((item) => <li key={item}><CheckBadgeIcon aria-hidden="true" />{item}</li>)}</ul></div>}
            {service.client_requirements?.length > 0 && <div><p>Before we start</p><h2>What the provider needs</h2><ul>{service.client_requirements.map((item) => <li key={item}><CheckBadgeIcon aria-hidden="true" />{item}</li>)}</ul></div>}
          </section>}

          <section className="service-provider-panel">
            <div className="service-provider-avatar">{service.provider.profilePicture ? <img src={getImageUrl(service.provider.profilePicture)} alt="" /> : service.provider.name?.charAt(0)}</div>
            <div className="service-provider-copy"><p>Provided by</p><h2>{service.provider.name}</h2><span>{service.provider.city || 'Morocco'} {profile?.response_time ? `· ${profile.response_time}` : ''}</span></div>
            <span className={`service-availability service-availability--${profile?.availability || service.provider.availability}`}>{availabilityLabel[profile?.availability || service.provider.availability] || 'Available'}</span>
          </section>

          {profile && <section className="service-profile-public"><div className="service-section-title"><CheckBadgeIcon aria-hidden="true" /><div><h2>{profile.headline}</h2><p>{profile.introduction}</p></div></div><div className="service-experience"><h3>Experience & approach</h3><p>{profile.experience_summary}</p></div><div className="service-profile-columns"><div><h3>Skills</h3><div className="service-chips">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div><div><h3>Languages</h3><div className="service-chips">{profile.languages.map((language) => <span key={language}><GlobeAltIcon aria-hidden="true" />{language}</span>)}</div></div></div>{profile.credentials.length > 0 && <div className="service-credentials"><h3>Credentials</h3><ul>{profile.credentials.map((credential) => <li key={`${credential.title}-${credential.issuer}`}><CheckBadgeIcon aria-hidden="true" /><span><strong>{credential.title}</strong><small>{credential.issuer}{credential.year ? ` · ${credential.year}` : ''}</small></span></li>)}</ul></div>}</section>}

          <section className="service-reviews"><div className="service-section-title"><StarIcon aria-hidden="true" /><div><h2>{Number(service.rating || 0).toFixed(1)} client rating</h2><p>{service.reviews_count || 0} verified completed-service reviews</p></div></div>{service.reviews?.length ? <div className="service-review-list">{service.reviews.map((review) => <article key={`${review.buyer_name}-${review.created_at}`}><strong>{review.buyer_name}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.comment || 'Client completed this service.'}</p></article>)}</div> : <p className="service-muted">Reviews will appear after real clients complete work through rifKANDO.</p>}</section>
        </section>

        <aside className="service-request-card"><div className="service-request-card-top"><p>Starting from</p><strong>{price.toLocaleString()} MAD</strong><span>Online payment coming soon</span></div>{service.packages?.length > 0 && <div className="service-package-list"><p>Choose a package</p>{service.packages.map((item) => <button type="button" className={selectedPackage?.id === item.id ? 'selected' : ''} onClick={() => setSelectedPackage(item)} key={item.id}><span><strong>{item.name}</strong><small>{item.delivery_time || 'Timeline agreed with provider'} · {item.revisions || 0} revisions</small></span><b>{Number(item.price).toLocaleString()} MAD</b></button>)}</div>}<label className="service-brief"><span>Describe what you need</span><textarea disabled={providerUnavailable} value={requirements} onChange={(event) => setRequirements(event.target.value)} maxLength="5000" placeholder="Share your goal, deadline, important details, and any links or references." /></label><button type="button" disabled={submitting || providerUnavailable} onClick={sendRequest} className="service-request-button">{providerUnavailable ? 'Provider is not taking new requests' : submitting ? 'Sending request...' : 'Send service request'}</button><Link to={`/messages/${service.provider_id}`} className="service-message-provider">Message provider first</Link><p className="service-request-notice"><ClockIcon aria-hidden="true" />{providerUnavailable ? 'This provider is temporarily unavailable. You can still message them about future work.' : 'The provider accepts or declines first. No online payment is taken at this stage.'}</p></aside>
      </div>
    </div>
    {galleryOpen && <MediaGallery media={media.map((item) => ({ url: getImageUrl(item.media_url), type: item.media_type }))} onClose={() => setGalleryOpen(false)} />}
    <style>{`
      .service-detail-page{min-height:calc(100vh - 80px);padding:clamp(1.2rem,4vw,3rem) 0 4rem;background:linear-gradient(180deg,#f6fbff,#fff 45%);color:#143b59}.service-detail-shell{width:min(1220px,calc(100% - 2rem));margin:0 auto}.service-detail-breadcrumb{display:flex;gap:.5rem;margin-bottom:1rem;color:#6d879a;font-size:.8rem}.service-detail-breadcrumb a{color:#187abb;font-weight:780;text-decoration:none}.service-detail-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(310px,360px);align-items:start;gap:clamp(1rem,3vw,2rem)}.service-detail-main{display:grid;gap:1rem}.service-detail-intro{padding:clamp(.2rem,1vw,.7rem) 0}.service-detail-category{display:inline-flex;align-items:center;gap:.35rem;color:#1476b8;font-size:.72rem;font-weight:850;letter-spacing:.06em;text-transform:uppercase}.service-detail-category svg{width:1rem;height:1rem}.service-detail-intro h1{max-width:800px;margin:.55rem 0;color:#123b5b;font-size:clamp(1.75rem,4vw,3rem);letter-spacing:-.05em;line-height:1.08}.service-detail-intro>p{max-width:800px;margin:0;color:#57758c;line-height:1.7;font-size:1rem}.service-portfolio-cover{position:relative;width:100%;min-height:260px;overflow:hidden;display:grid;place-items:center;border:1px solid #d6e7f1;border-radius:22px;background:#ecf6fb;color:#608097;cursor:pointer;padding:0}.service-portfolio-cover img,.service-portfolio-cover video{width:100%;height:100%;min-height:260px;object-fit:cover}.service-media-count{position:absolute;right:.8rem;bottom:.8rem;padding:.4rem .6rem;border-radius:99px;background:rgba(10,39,60,.74);color:#fff;font-size:.72rem;font-weight:780}.service-provider-panel,.service-profile-public,.service-reviews,.service-request-card{border:1px solid rgba(23,114,184,.14);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 10px 24px rgba(20,74,116,.06)}.service-provider-panel{display:flex;align-items:center;gap:.75rem;padding:1rem}.service-provider-avatar{width:48px;height:48px;flex:0 0 auto;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#dff3ff;color:#126ea9;font-size:1.1rem;font-weight:850}.service-provider-avatar img{width:100%;height:100%;object-fit:cover}.service-provider-copy{min-width:0}.service-provider-copy p{margin:0;color:#6f899d;font-size:.7rem;font-weight:750;text-transform:uppercase;letter-spacing:.06em}.service-provider-copy h2{margin:.2rem 0;color:#1a4262;font-size:.98rem}.service-provider-copy span{color:#668399;font-size:.78rem}.service-availability{margin-inline-start:auto;padding:.35rem .55rem;border-radius:99px;font-size:.68rem;font-weight:850;text-align:center}.service-availability--available{background:#e7f8ee;color:#167447}.service-availability--limited{background:#fff5df;color:#9a6504}.service-availability--unavailable{background:#fff0f0;color:#a84747}.service-profile-public,.service-reviews{padding:clamp(1rem,3vw,1.5rem)}.service-section-title{display:flex;align-items:flex-start;gap:.65rem}.service-section-title>svg{width:1.4rem;height:1.4rem;flex:0 0 auto;color:#1480c3}.service-section-title h2{margin:0;color:#163e5f;font-size:1.04rem}.service-section-title p{margin:.28rem 0 0;color:#608096;line-height:1.55;font-size:.88rem}.service-experience,.service-credentials{margin-top:1.1rem;padding-top:1rem;border-top:1px solid #e3edf3}.service-profile-public h3{margin:0 0 .45rem;color:#37627e;font-size:.77rem;font-weight:850;letter-spacing:.06em;text-transform:uppercase}.service-experience p{margin:0;color:#48697f;line-height:1.65;white-space:pre-wrap}.service-profile-columns{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.1rem}.service-chips{display:flex;flex-wrap:wrap;gap:.4rem}.service-chips span{display:inline-flex;align-items:center;gap:.28rem;padding:.35rem .5rem;border-radius:99px;background:#edf8ff;color:#28709f;font-size:.75rem;font-weight:750}.service-chips svg{width:.85rem;height:.85rem}.service-credentials ul{display:grid;gap:.6rem;margin:0;padding:0;list-style:none}.service-credentials li{display:flex;gap:.5rem;align-items:flex-start;color:#3f667f}.service-credentials li>svg{width:1rem;height:1rem;margin-top:.06rem;color:#1681c5}.service-credentials strong,.service-credentials small{display:block}.service-credentials strong{font-size:.85rem}.service-credentials small{margin-top:.14rem;color:#748e9f;font-size:.76rem}.service-review-list{display:grid;gap:.7rem;margin-top:1rem}.service-review-list article{padding:.8rem;border-radius:12px;background:#f8fcff}.service-review-list strong{display:block;color:#315a76;font-size:.8rem}.service-review-list span{display:block;margin-top:.25rem;color:#d99812;font-size:.82rem;letter-spacing:.04em}.service-review-list p,.service-muted{margin:.4rem 0 0;color:#648195;font-size:.84rem;line-height:1.5}.service-request-card{position:sticky;top:100px;overflow:hidden}.service-request-card-top{padding:1.2rem;border-bottom:1px solid #e2edf4;background:linear-gradient(135deg,#eef9ff,#fff)}.service-request-card-top p{margin:0;color:#668399;font-size:.72rem;font-weight:780;text-transform:uppercase;letter-spacing:.06em}.service-request-card-top strong{display:block;margin:.28rem 0;color:#0f6daa;font-size:1.6rem}.service-request-card-top span{color:#738da0;font-size:.77rem}.service-package-list{display:grid;gap:.5rem;padding:1rem}.service-package-list>p{margin:0 0 .1rem;color:#57758b;font-size:.78rem;font-weight:800}.service-package-list button{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.7rem;text-align:left;border:1px solid #dbe9f1;border-radius:12px;background:#fff;color:#315a78;cursor:pointer}.service-package-list button.selected{border-color:#208bce;background:#eff9ff;box-shadow:0 0 0 3px rgba(32,139,206,.11)}.service-package-list button span{display:grid;gap:.2rem}.service-package-list button strong{font-size:.82rem}.service-package-list button small{color:#7590a1;font-size:.68rem}.service-package-list button b{color:#1172b2;font-size:.78rem;white-space:nowrap}.service-brief{display:grid;gap:.45rem;padding:0 1rem 1rem;color:#3d6480;font-size:.8rem;font-weight:800}.service-brief textarea{min-height:135px;resize:vertical;border:1px solid #d3e3ed;border-radius:12px;padding:.75rem;color:#244d69;font:inherit;line-height:1.5}.service-request-button{width:calc(100% - 2rem);min-height:46px;margin:0 1rem;border:1px solid #126da9;border-radius:13px;background:linear-gradient(135deg,#0e65a2,#268fd3);color:#fff;font:inherit;font-size:.86rem;font-weight:850;cursor:pointer;box-shadow:0 10px 20px rgba(17,108,170,.2)}.service-request-button:disabled{opacity:.58;cursor:wait}.service-request-notice{display:flex;gap:.4rem;margin:1rem;padding:0;color:#688398;font-size:.72rem;line-height:1.45}.service-request-notice svg{width:1rem;height:1rem;flex:0 0 auto;color:#2e8cc5}.service-detail-loading{padding:4rem 1rem;text-align:center;color:#52748e}@media(max-width:860px){.service-detail-layout{grid-template-columns:1fr}.service-request-card{position:static;order:-1}.service-portfolio-cover,.service-portfolio-cover img,.service-portfolio-cover video{min-height:210px}}@media(max-width:560px){.service-detail-shell{width:min(100% - 1rem,1220px)}.service-provider-panel{align-items:flex-start}.service-availability{max-width:100px}.service-profile-columns{grid-template-columns:1fr}.service-request-card{border-radius:17px}.service-detail-intro h1{font-size:1.7rem}}
    `}</style>
    <style>{`.service-message-provider{width:calc(100% - 2rem);min-height:40px;margin:.6rem 1rem 0;display:inline-flex;align-items:center;justify-content:center;border:1px solid #c6dfec;border-radius:12px;background:#fff;color:#246d9b;font-size:.8rem;font-weight:800;text-decoration:none}.service-scope-panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;padding:clamp(1rem,3vw,1.5rem);border:1px solid rgba(23,114,184,.14);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 10px 24px rgba(20,74,116,.06)}.service-scope-panel>div+div{padding-inline-start:1rem;border-inline-start:1px solid #e3edf3}.service-scope-panel p{margin:0;color:#287aaf;font-size:.68rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.service-scope-panel h2{margin:.3rem 0 .85rem;color:#183f5e;font-size:1rem}.service-scope-panel ul{display:grid;gap:.55rem;margin:0;padding:0;list-style:none;color:#547188;font-size:.82rem;line-height:1.4}.service-scope-panel li{display:flex;gap:.42rem}.service-scope-panel li svg{width:1rem;height:1rem;flex:0 0 auto;color:#1488c9}@media(max-width:560px){.service-scope-panel{grid-template-columns:1fr}.service-scope-panel>div+div{padding:1rem 0 0;border-top:1px solid #e3edf3;border-inline-start:0}}`}</style>
  </main>;
};

export default ServiceDetailsPage;

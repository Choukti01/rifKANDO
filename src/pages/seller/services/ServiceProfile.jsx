import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckBadgeIcon, DocumentArrowUpIcon, DocumentTextIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getMyServiceProfile, saveMyServiceProfile, uploadServiceCredential } from '../../../services/api';
import { ServiceLocalized, useServiceI18n } from '../../../i18n/serviceI18n';

const emptyProfile = {
  headline: '',
  introduction: '',
  experience_summary: '',
  skills: [],
  languages: [],
  credentials: [],
  availability: 'available',
  response_time: 'Usually within 24 hours',
};

const splitList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

const ServiceProfile = () => {
  const { t } = useServiceI18n();
  const [profile, setProfile] = useState(emptyProfile);
  const [skillsInput, setSkillsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCredential, setUploadingCredential] = useState(null);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await getMyServiceProfile();
        if (!current) return;
        const next = response.data.profile || emptyProfile;
        setProfile({ ...emptyProfile, ...next });
        setSkillsInput((next.skills || []).join(', '));
        setLanguagesInput((next.languages || []).join(', '));
      } catch (error) {
        if (current) toast.error(error.response?.data?.error || 'Could not load your service profile.');
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => { current = false; };
  }, []);

  const completeness = useMemo(() => {
    const fields = [profile.headline, profile.introduction, profile.experience_summary, skillsInput, languagesInput];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile, skillsInput, languagesInput]);

  const update = (field, value) => setProfile((current) => ({ ...current, [field]: value }));
  const addCredential = () => update('credentials', [...profile.credentials, { title: '', issuer: '', year: '', proof_url: '', proof_type: '' }]);
  const updateCredential = (index, field, value) => update('credentials', profile.credentials.map((credential, credentialIndex) => (
    credentialIndex === index ? { ...credential, [field]: value } : credential
  )));
  const attachCredentialProof = (index, proof) => update('credentials', profile.credentials.map((credential, credentialIndex) => (
    credentialIndex === index ? { ...credential, proof_url: proof.url, proof_type: proof.type } : credential
  )));
  const removeCredential = (index) => update('credentials', profile.credentials.filter((_, credentialIndex) => credentialIndex !== index));

  const uploadCredentialProof = async (index, file) => {
    if (!file || uploadingCredential !== null) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
      toast.error(t('invalidCredentialFile'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('credentialTooLarge'));
      return;
    }
    setUploadingCredential(index);
    try {
      const formData = new FormData();
      formData.append('credential', file);
      const response = await uploadServiceCredential(formData);
      attachCredentialProof(index, response.data);
      toast.success(t('credentialAttached'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('credentialUploadFailed'));
    } finally {
      setUploadingCredential(null);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveMyServiceProfile({
        ...profile,
        skills: splitList(skillsInput),
        languages: splitList(languagesInput),
        credentials: profile.credentials.filter((credential) => credential.title || credential.issuer || credential.year),
      });
      toast.success('Your professional profile is live.');
    } catch (error) {
      toast.error(error.response?.data?.fields?.[0]?.message || error.response?.data?.error || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ServiceLocalized><div className="service-profile-loading">Loading your professional profile...</div></ServiceLocalized>;

  return (
    <ServiceLocalized><section className="service-profile-page">
      <div className="service-profile-hero">
        <div>
          <p className="service-profile-eyebrow"><CheckBadgeIcon aria-hidden="true" />Professional service profile</p>
          <h2>Show clients the work behind your service.</h2>
          <p>Your diplomas and certificates are represented by public credential details. Keep the original documents private unless rifKANDO asks for a verification review.</p>
        </div>
        <div className="service-profile-progress" aria-label={`${completeness}% profile complete`}>
          <strong>{completeness}%</strong><span>profile complete</span>
        </div>
      </div>

      <form className="service-profile-form" onSubmit={submit}>
        <section className="service-profile-card">
          <div className="service-profile-card-heading"><h3>Your professional identity</h3><span>Visible to clients</span></div>
          <label>Professional headline<input value={profile.headline} onChange={(event) => update('headline', event.target.value)} maxLength="160" placeholder="Example: Brand designer helping local businesses stand out" required /></label>
          <label>Introduction<textarea value={profile.introduction} onChange={(event) => update('introduction', event.target.value)} maxLength="2500" rows="4" placeholder="Explain who you help, the results you create, and what makes your approach reliable." required /></label>
          <label>Experience and approach<textarea value={profile.experience_summary} onChange={(event) => update('experience_summary', event.target.value)} maxLength="5000" rows="5" placeholder="Describe your experience, past work, methods, or sectors you know well." required /></label>
        </section>

        <section className="service-profile-card service-profile-grid-two">
          <label>Skills<input value={skillsInput} onChange={(event) => setSkillsInput(event.target.value)} placeholder="Logo design, Figma, social media" required /><small>Separate each skill with a comma.</small></label>
          <label>Languages<input value={languagesInput} onChange={(event) => setLanguagesInput(event.target.value)} placeholder="Darija, Arabic, French" required /><small>Separate each language with a comma.</small></label>
          <label>Availability<select value={profile.availability} onChange={(event) => update('availability', event.target.value)}><option value="available">Available for new work</option><option value="limited">Limited availability</option><option value="unavailable">Not taking new work</option></select></label>
          <label>Typical response time<input value={profile.response_time} onChange={(event) => update('response_time', event.target.value)} maxLength="100" placeholder="Usually within 24 hours" required /></label>
        </section>

        <section className="service-profile-card">
          <div className="service-profile-card-heading"><div><h3>Credentials</h3><p>Optional public proof for diplomas and certificates. Never upload national IDs, passports, bank records, or private documents.</p></div><button type="button" className="service-profile-secondary" onClick={addCredential}><PlusIcon aria-hidden="true" />Add credential</button></div>
          {profile.credentials.length === 0 ? <p className="service-profile-empty">No credentials added yet. You can still publish services, but relevant qualifications build client trust.</p> : (
            <div className="credential-list">{profile.credentials.map((credential, index) => <div className="credential-row" key={`${index}-${credential.title}`}>
              <input value={credential.title} onChange={(event) => updateCredential(index, 'title', event.target.value)} placeholder="Certificate or diploma title" maxLength="160" aria-label="Credential title" />
              <input value={credential.issuer} onChange={(event) => updateCredential(index, 'issuer', event.target.value)} placeholder="School or issuer" maxLength="160" aria-label="Credential issuer" />
              <input value={credential.year} onChange={(event) => updateCredential(index, 'year', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Year" inputMode="numeric" aria-label="Credential year" />
              <label className="credential-proof"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { void uploadCredentialProof(index, event.target.files?.[0]); event.target.value = ''; }} disabled={uploadingCredential !== null} /><span>{uploadingCredential === index ? 'Uploading…' : credential.proof_url ? <><DocumentTextIcon aria-hidden="true" />Proof attached</> : <><DocumentArrowUpIcon aria-hidden="true" />Attach PDF or image</>}</span></label>
              <button type="button" className="credential-remove" onClick={() => removeCredential(index)} aria-label="Remove credential"><TrashIcon aria-hidden="true" /></button>
            </div>)}</div>
          )}
        </section>

        <div className="service-profile-actions"><Link to="/seller/dashboard/services" className="service-profile-cancel">Back to services</Link><button type="submit" disabled={saving}>{saving ? 'Saving profile...' : 'Save professional profile'}</button></div>
      </form>
      <style>{`
        .service-profile-page { display: grid; gap: 1rem; color: #143a58; }
        .service-profile-hero { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:clamp(1.1rem,3vw,2rem); border:1px solid rgba(30,123,193,.16); border-radius:22px; background:linear-gradient(135deg,#eaf7ff,#fff); box-shadow:0 14px 32px rgba(20,74,116,.08); }
        .service-profile-eyebrow { display:inline-flex; align-items:center; gap:.35rem; margin:0 0 .45rem; color:#1676ba; font-size:.72rem; font-weight:850; letter-spacing:.07em; text-transform:uppercase; }.service-profile-eyebrow svg{width:1rem;height:1rem}.service-profile-hero h2{margin:0;color:#123a5b;font-size:clamp(1.25rem,2.5vw,1.8rem);letter-spacing:-.035em}.service-profile-hero>div>p:last-child{max-width:720px;margin:.55rem 0 0;color:#52718a;line-height:1.6;font-size:.9rem}
        .service-profile-progress{flex:0 0 auto;min-width:104px;padding:1rem;display:grid;place-items:center;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 1px rgba(31,129,202,.14)}.service-profile-progress strong{font-size:1.5rem;color:#0c6dae}.service-profile-progress span{font-size:.68rem;color:#628097;font-weight:750;text-transform:uppercase;letter-spacing:.05em}
        .service-profile-form{display:grid;gap:1rem}.service-profile-card{padding:clamp(1rem,2.5vw,1.5rem);border:1px solid rgba(24,105,165,.12);border-radius:20px;background:rgba(255,255,255,.88);box-shadow:0 10px 24px rgba(20,74,116,.05)}.service-profile-card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.service-profile-card-heading h3{margin:0;color:#163d5e;font-size:1rem}.service-profile-card-heading>span{padding:.32rem .55rem;border-radius:99px;background:#e9f7ff;color:#1672af;font-size:.68rem;font-weight:800}.service-profile-card-heading p{margin:.25rem 0 0;color:#638096;font-size:.8rem;line-height:1.45}
        .service-profile-card label{display:grid;gap:.42rem;margin-top:1rem;color:#2d5674;font-size:.82rem;font-weight:780}.service-profile-card label:first-of-type{margin-top:0}.service-profile-card input,.service-profile-card textarea,.service-profile-card select,.credential-row input{width:100%;border:1px solid #d4e2ed;border-radius:12px;background:#fbfdff;color:#173b59;font:inherit;padding:.72rem .8rem;outline:none}.service-profile-card textarea{resize:vertical;line-height:1.55}.service-profile-card input:focus,.service-profile-card textarea:focus,.service-profile-card select:focus,.credential-row input:focus{border-color:#2190d5;box-shadow:0 0 0 3px rgba(33,144,213,.14)}.service-profile-card small{color:#738da1;font-size:.72rem;font-weight:550}.service-profile-grid-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:1rem}.service-profile-grid-two label{margin-top:0}.service-profile-grid-two label:nth-child(n+3){margin-top:1rem}
        .service-profile-secondary,.credential-remove{display:inline-flex;align-items:center;justify-content:center;gap:.38rem;border:1px solid #b9ddef;border-radius:11px;background:#f1faff;color:#146da9;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.service-profile-secondary{padding:.58rem .72rem}.service-profile-secondary svg,.credential-remove svg,.credential-proof svg{width:1rem;height:1rem}.service-profile-empty{margin:0;color:#67849a;font-size:.86rem;line-height:1.5}.credential-list{display:grid;gap:.65rem}.credential-row{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) 72px minmax(132px,.9fr) 40px;gap:.55rem}.credential-proof{position:relative;display:inline-flex!important;min-height:42px;align-items:center;justify-content:center;margin:0!important;overflow:hidden;border:1px solid #b9ddef;border-radius:11px;background:#f1faff;color:#146da9!important;font-size:.72rem!important;cursor:pointer}.credential-proof input{position:absolute;inset:0;width:100%;opacity:0;cursor:pointer}.credential-proof span{display:inline-flex;align-items:center;gap:.32rem;padding:.4rem;white-space:nowrap}.credential-remove{padding:0;color:#b24b4b;border-color:#f1caca;background:#fff7f7}.service-profile-actions{display:flex;justify-content:flex-end;gap:.7rem}.service-profile-actions>a,.service-profile-actions>button{min-height:44px;padding:.7rem .95rem;border-radius:13px;font:inherit;font-size:.84rem;font-weight:800;text-decoration:none;cursor:pointer}.service-profile-cancel{display:inline-flex;align-items:center;color:#416782;border:1px solid #cddde8;background:#fff}.service-profile-actions>button{border:1px solid #146da9;background:linear-gradient(135deg,#0c639f,#2695d8);color:#fff;box-shadow:0 9px 20px rgba(18,108,168,.2)}.service-profile-actions>button:disabled{opacity:.62;cursor:wait}.service-profile-loading{padding:3rem;text-align:center;color:#5a7890}
        @media(max-width:820px){.credential-row{grid-template-columns:1fr 1fr 70px 40px}.credential-proof{grid-column:1/-1}}@media(max-width:680px){.service-profile-hero{align-items:flex-start}.service-profile-progress{min-width:78px;padding:.7rem}.service-profile-progress strong{font-size:1.15rem}.service-profile-grid-two{grid-template-columns:1fr}.service-profile-grid-two label:nth-child(n+2){margin-top:1rem}.credential-row{grid-template-columns:1fr 1fr 66px 38px}.credential-row input{padding:.65rem .55rem;font-size:.78rem}.service-profile-card-heading{align-items:center}.service-profile-card-heading .service-profile-secondary{flex:0 0 auto}.service-profile-actions{position:sticky;bottom:.5rem;padding:.65rem;border:1px solid rgba(31,121,184,.15);border-radius:15px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px)}}
      `}</style>
    </section></ServiceLocalized>
  );
};

export default ServiceProfile;

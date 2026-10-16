import { useEffect, useState } from 'react';
import { ArrowLeftIcon, BanknotesIcon, CheckCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMyServicePayoutProfile, saveMyServicePayoutProfile } from '../../../services/api';
import { useServiceI18n } from '../../../i18n/serviceI18n';

const initial = { account_holder: '', payout_method: 'bank_transfer', bank_name: '', rib: '', payout_phone: '' };

const ServicePayoutProfile = () => {
  const { t, locale } = useServiceI18n();
  const [profile, setProfile] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getMyServicePayoutProfile()
      .then(({ data }) => { if (active && data.profile) setProfile({ ...initial, ...data.profile }); })
      .catch((error) => { if (active) toast.error(error.response?.data?.error || t('payoutProfileLoadFailed')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveMyServicePayoutProfile(profile);
      toast.success(t('payoutProfileSaved'));
    } catch (error) { toast.error(error.response?.data?.error || t('payoutProfileSaveFailed')); }
    finally { setSaving(false); }
  };
  const bankTransfer = profile.payout_method === 'bank_transfer';

  if (loading) return <div className="service-payout-loading">{t('payoutProfileLoading')}</div>;
  return <section className="service-payout-profile" dir={locale.startsWith('ar') ? 'rtl' : 'ltr'}>
    <header><div><Link to=".."><ArrowLeftIcon aria-hidden="true" />{t('backDashboard')}</Link><p><BanknotesIcon aria-hidden="true" />{t('privateSettlement')}</p><h1>{t('payoutProfile')}</h1><span>{t('payoutProfileHelp')}</span></div></header>
    <aside><ShieldCheckIcon aria-hidden="true" /><p>{t('payoutProfilePrivacy')}</p></aside>
    <form onSubmit={save}>
      <label>{t('payoutMethod')}<select value={profile.payout_method} onChange={(event) => setProfile((current) => ({ ...current, payout_method: event.target.value }))}><option value="bank_transfer">{t('bankTransfer')}</option><option value="cash_collection">{t('cashCollection')}</option></select></label>
      <label>{t('accountHolder')}<input required minLength="3" maxLength="160" value={profile.account_holder} onChange={(event) => setProfile((current) => ({ ...current, account_holder: event.target.value }))} placeholder={t('accountHolderPlaceholder')} /></label>
      {bankTransfer && <><label>{t('bankName')}<input required minLength="2" maxLength="160" value={profile.bank_name} onChange={(event) => setProfile((current) => ({ ...current, bank_name: event.target.value }))} placeholder={t('bankNamePlaceholder')} /></label><label>{t('rib')}<input required inputMode="numeric" minLength="20" maxLength="34" value={profile.rib} onChange={(event) => setProfile((current) => ({ ...current, rib: event.target.value.replace(/\s+/g, '') }))} placeholder={t('ribPlaceholder')} /></label></>}
      <label>{t('payoutPhone')}<input maxLength="40" value={profile.payout_phone} onChange={(event) => setProfile((current) => ({ ...current, payout_phone: event.target.value }))} placeholder={t('payoutPhonePlaceholder')} /></label>
      <div className="service-payout-profile__notice"><CheckCircleIcon aria-hidden="true" />{t('payoutProfileNotice')}</div>
      <button disabled={saving} type="submit">{saving ? t('saving') : t('savePayoutProfile')}</button>
    </form>
    <style>{`.service-payout-profile{width:min(760px,calc(100% - 2rem));margin:0 auto;padding:1.5rem 0 4rem;color:#173d5c}.service-payout-profile header{padding:clamp(1.2rem,4vw,2.2rem);border:1px solid rgba(22,112,178,.16);border-radius:24px;background:linear-gradient(135deg,#e9f7ff,#fff);box-shadow:0 14px 28px rgba(18,77,117,.07)}.service-payout-profile header a{display:inline-flex;align-items:center;gap:.35rem;color:#176fa9;font-size:.78rem;font-weight:800;text-decoration:none}.service-payout-profile header a svg{width:1rem}.service-payout-profile header p{display:flex;align-items:center;gap:.4rem;margin:1rem 0 .25rem;color:#1479b8;font-size:.72rem;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.service-payout-profile header p svg{width:1rem}.service-payout-profile h1{margin:0;color:#143c5c;font-size:clamp(1.45rem,3vw,2.15rem);letter-spacing:-.045em}.service-payout-profile header span{display:block;max-width:600px;margin-top:.45rem;color:#5d7b91;line-height:1.55}.service-payout-profile aside{display:flex;gap:.55rem;margin:1rem 0;padding:.85rem 1rem;border:1px solid #bde0ef;border-radius:14px;background:#f1fbff;color:#3b6782;font-size:.84rem;line-height:1.5}.service-payout-profile aside svg{width:1.2rem;flex:none;color:#137bbc}.service-payout-profile aside p{margin:0}.service-payout-profile form{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;padding:clamp(1rem,3vw,1.4rem);border:1px solid #d9e9f2;border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 8px 20px rgba(19,73,111,.04)}.service-payout-profile label{display:grid;gap:.36rem;color:#365e78;font-size:.78rem;font-weight:850}.service-payout-profile label:first-child,.service-payout-profile label:last-of-type{grid-column:1/-1}.service-payout-profile input,.service-payout-profile select{min-width:0;border:1px solid #c9dfe9;border-radius:10px;padding:.68rem;background:#fff;color:#204c6a;font:inherit}.service-payout-profile__notice{display:flex;grid-column:1/-1;gap:.4rem;color:#56768a;font-size:.77rem;line-height:1.45}.service-payout-profile__notice svg{width:1rem;flex:none;color:#19804e}.service-payout-profile button{justify-self:end;grid-column:1/-1;min-height:42px;padding:.6rem .9rem;border:1px solid #126ea9;border-radius:11px;background:#1478ba;color:#fff;font:inherit;font-size:.8rem;font-weight:850;cursor:pointer}.service-payout-profile button:disabled{opacity:.6;cursor:wait}.service-payout-loading{padding:3rem;text-align:center;color:#638198}@media(max-width:620px){.service-payout-profile{width:min(100% - 1rem,760px);padding-top:1rem}.service-payout-profile form{grid-template-columns:1fr}.service-payout-profile label,.service-payout-profile label:first-child,.service-payout-profile label:last-of-type{grid-column:auto}.service-payout-profile button{width:100%;grid-column:auto;justify-self:stretch}}`}</style>
  </section>;
};

export default ServicePayoutProfile;

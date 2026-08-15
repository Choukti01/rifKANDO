import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  return (
    <div className="language-switcher" aria-label={t('common.languageSelector')}>
      <button type="button" onClick={() => i18n.changeLanguage('en')} className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`} aria-label={t('common.english')}>EN</button>
      <button type="button" onClick={() => i18n.changeLanguage('fr')} className={`lang-btn ${currentLang === 'fr' ? 'active' : ''}`} aria-label={t('common.french')}>FR</button>
      <button type="button" onClick={() => i18n.changeLanguage('ar')} className={`lang-btn ${currentLang === 'ar' ? 'active' : ''}`} aria-label={t('common.arabic')}>{'\u0627\u0644\u0639\u0631\u0628\u064a\u0629'}</button>
    </div>
  );
};

export default LanguageSwitcher;

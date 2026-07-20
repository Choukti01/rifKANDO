import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <div className="language-switcher" aria-label="Language selector">
      <button type="button" onClick={() => i18n.changeLanguage('en')} className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}>EN</button>
      <button type="button" onClick={() => i18n.changeLanguage('fr')} className={`lang-btn ${currentLang === 'fr' ? 'active' : ''}`}>FR</button>
      <button type="button" onClick={() => i18n.changeLanguage('ar')} className={`lang-btn ${currentLang === 'ar' ? 'active' : ''}`}>ع</button>
    </div>
  );
};

export default LanguageSwitcher;

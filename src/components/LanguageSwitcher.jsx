// frontend/src/components/LanguageSwitcher.jsx
import React, { useState, useEffect, useRef } from 'react';
import { translateText } from '../services/translate';

const LanguageSwitcher = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const translatedCache = useRef(new Map());

  const translateElement = async (element, targetLang) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_SKIP;
          if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName) ||
              parent.classList?.contains('no-translate')) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const nodes = [];
    let node;
    while (node = walker.nextNode()) nodes.push(node);
    for (const textNode of nodes) {
      const original = textNode.textContent.trim();
      if (!original) continue;
      let translated = translatedCache.current.get(original);
      if (!translated) {
        translated = await translateText(original, targetLang);
        translatedCache.current.set(original, translated);
      }
      textNode.textContent = translated;
    }
  };

  const translatePage = async (targetLang) => {
    setIsTranslating(true);
    translatedCache.current.clear();
    await translateElement(document.body, targetLang);
    setCurrentLang(targetLang);
    setIsTranslating(false);
  };

  const handleChange = (lang) => {
    if (lang === currentLang) return;
    localStorage.setItem('tempLang', lang);
    window.location.reload();
  };

  useEffect(() => {
    const lang = localStorage.getItem('tempLang');
    if (lang && lang !== 'en') {
      localStorage.removeItem('tempLang');
      translatePage(lang);
    } else {
      setCurrentLang('en');
    }
  }, []);

  return (
    <div className="language-switcher">
      <button onClick={() => handleChange('en')} className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}>EN</button>
      
      <button onClick={() => handleChange('ar')} className={`lang-btn ${currentLang === 'ar' ? 'active' : ''}`}>ع</button>
      {isTranslating && <span style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Translating...</span>}
    </div>
  );
};

export default LanguageSwitcher;
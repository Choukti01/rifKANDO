import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Brand terminology appears in navigation, legacy dashboard labels, system
// messages, and newly rendered marketplace content. This small boundary keeps
// the Arabic product name consistent without ever altering a member's input.
const LocalizedBrand = ({ children }) => {
  const { i18n } = useTranslation();
  const rootRef = useRef(null);
  const originals = useRef(new WeakMap());
  const language = i18n.resolvedLanguage || i18n.language || '';
  const isArabic = language.startsWith('ar');
  const isFrench = language.startsWith('fr');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const update = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent || parent.closest('input, textarea, [contenteditable="true"], script, style')) return;
        if (!originals.current.has(node)) originals.current.set(node, node.nodeValue);
        const source = originals.current.get(node);
        const replacement = isArabic ? 'جدها' : isFrench ? 'Trouvez-le' : null;
        const next = replacement ? source.replaceAll('FINDiT', replacement).replaceAll('FINDit', replacement) : source;
        if (node.nodeValue !== next) node.nodeValue = next;
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) node.childNodes.forEach(update);
    };

    const refresh = () => update(root);
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [isArabic, isFrench]);

  return <div ref={rootRef} className="localized-brand-interface">{children}</div>;
};

export default LocalizedBrand;

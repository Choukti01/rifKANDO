import i18n, { resources } from './index';
import { describe, expect, it } from 'vitest';

describe('rifKANDO localization startup integrity', () => {
  it('loads every supported language without an initialization failure', () => {
    expect(Object.keys(resources).sort()).toEqual(['ar', 'en', 'fr']);

    for (const locale of Object.keys(resources)) {
      const translation = resources[locale].translation;
      expect(translation).toBeTruthy();
      expect(translation.common).toBeTruthy();
      expect(translation.nav).toBeTruthy();
      expect(translation.footer).toBeTruthy();
      expect(translation.productForm).toBeTruthy();
      expect(translation.productDetails).toBeTruthy();
      expect(translation.productDetails.review).toBeTruthy();
      expect(i18n.getResourceBundle(locale, 'translation')).toBeTruthy();
    }
  });

  it('keeps the complete FINDit interface translated and branded per language', () => {
    const requiredFindItAreas = ['public', 'form', 'buyer', 'seller', 'status'];

    for (const area of requiredFindItAreas) {
      expect(resources.fr.translation.findit?.[area]).toBeTruthy();
      expect(resources.ar.translation.findit?.[area]).toBeTruthy();
    }

    expect(resources.ar.translation.nav.findit).toBe('جدها');
    expect(resources.ar.translation.findit.navigation).toBe('جدها');
    expect(resources.fr.translation.nav.findit).toBe('Trouvez-le');
    expect(resources.fr.translation.findit.navigation).toBe('Trouvez-le');
    expect(resources.fr.translation.findit.public.title).not.toBe(resources.en.translation.findit.public.title);
    expect(resources.fr.translation.findit.form.publish).not.toBe(resources.en.translation.findit.form.publish);
  });

  it('does not leave any FINDit interface leaf on the English fallback path', () => {
    const findMissingLeaves = (reference, translated, path = '') => Object.entries(reference).flatMap(([key, value]) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (value && typeof value === 'object') return findMissingLeaves(value, translated?.[key], nextPath);
      return typeof translated?.[key] === 'string' && translated[key].trim() ? [] : [nextPath];
    });

    expect(findMissingLeaves(resources.en.translation.findit, resources.fr.translation.findit)).toEqual([]);
    expect(findMissingLeaves(resources.en.translation.findit, resources.ar.translation.findit)).toEqual([]);
  });

  it('keeps account, seller workspace, and internal operation navigation translated', () => {
    const requiredAreas = ['auth', 'sellerDashboard', 'operations'];

    for (const locale of ['fr', 'ar']) {
      for (const area of requiredAreas) {
        expect(resources[locale].translation[area]).toBeTruthy();
        expect(Object.keys(resources[locale].translation[area]).length).toBeGreaterThan(0);
      }
    }

    expect(resources.fr.translation.auth.signIn).toBe('Se connecter');
    expect(resources.fr.translation.sellerDashboard.orders).toBe('Commandes');
    expect(resources.ar.translation.operations.codDesk).toContain('الدفع عند الاستلام');
  });
});

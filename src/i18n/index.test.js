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
});

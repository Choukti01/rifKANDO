import { describe, expect, it } from 'vitest';
import { getListingQuality, requiredPhotoCount } from './productListingQuality';

const completeDetails = { title: 'Wireless headphones', description: 'Comfortable headphones with a clear and complete product description.', origin_city: 'Nador' };

describe('product listing quality', () => {
  it('requires one photo for new listings', () => {
    const quality = getListingQuality({ ...completeDetails, condition: 'new' }, [{ type: 'image' }]);
    expect(quality.ready).toBe(true);
    expect(requiredPhotoCount('new')).toBe(1);
  });

  it('requires two product photos for Used as New and Joutiya listings', () => {
    const incomplete = getListingQuality({ ...completeDetails, condition: 'used_as_new' }, [{ type: 'image' }]);
    const complete = getListingQuality({ ...completeDetails, condition: 'joutiya' }, [{ type: 'image' }, { type: 'image' }]);
    expect(incomplete.checks.photos).toBe(false);
    expect(complete.ready).toBe(true);
    expect(requiredPhotoCount('joutiya')).toBe(2);
  });

  it('does not allow a video as the listing cover', () => {
    const quality = getListingQuality({ ...completeDetails, condition: 'new' }, [{ type: 'video' }, { type: 'image' }]);
    expect(quality.checks.cover).toBe(false);
    expect(quality.ready).toBe(false);
  });
});

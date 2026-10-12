export const requiredPhotoCount = (condition) => (condition === 'new' ? 1 : 2);

export const getListingQuality = ({ title = '', description = '', origin_city: originCity = '', condition = 'new' }, media = []) => {
  const images = media.filter((item) => item?.type === 'image');
  const requiredImages = requiredPhotoCount(condition);
  const checks = {
    details: title.trim().length >= 2 && description.trim().length >= 10,
    city: originCity.trim().length >= 2,
    cover: media[0]?.type === 'image',
    photos: images.length >= requiredImages,
  };

  return { checks, imageCount: images.length, requiredImages, ready: Object.values(checks).every(Boolean) };
};

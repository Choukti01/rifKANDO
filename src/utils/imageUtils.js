export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_URL || 'https://rifkando-backend.onrender.com/api';
  const baseWithoutApi = baseUrl.replace(/\/api$/, '');
  return `${baseWithoutApi}${path}`;
};
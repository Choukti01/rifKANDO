export const getImageUrl = (path) => {
  if (!path) return '';   // ✅ return empty string, not null
  
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // In development, use local backend
  if (import.meta.env.DEV) {
    return `http://localhost:5000${path}`;
  }
  
  // In production, use the environment variable
  const baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl) {
    console.error('VITE_API_URL is not set in production!');
    return path; // fallback to relative path (may still break)
  }
  
  // Remove trailing /api if present, then add the path
  const baseWithoutApi = baseUrl.replace(/\/api$/, '');
  return `${baseWithoutApi}${path}`;
};

export default getImageUrl;
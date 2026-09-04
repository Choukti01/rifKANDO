import axios from 'axios';
import { API_URL } from '../config/apiUrl';

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
const nonRefreshableAuthPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/google',
  '/auth/phone/register/request-code',
  '/auth/phone/register/verify',
  '/auth/phone/login/request-code',
  '/auth/phone/login/verify',
  '/auth/refresh',
  '/auth/logout',
  '/auth/logout-all',
];

let csrfToken = null;
let refreshPromise = null;

export const setCsrfToken = (value) => {
  csrfToken = typeof value === 'string' && value.length >= 32 ? value : null;
};

export const clearCsrfToken = () => {
  csrfToken = null;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  // Cookie sessions intentionally do not accept a browser-supplied bearer
  // token. Strip stale per-call headers during the migration as a safeguard.
  if (typeof config.headers?.delete === 'function') {
    config.headers.delete('Authorization');
  } else {
    delete config.headers?.Authorization;
    delete config.headers?.authorization;
  }

  if (unsafeMethods.has(String(config.method || 'get').toLowerCase()) && csrfToken) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

const isRefreshableRequest = (config = {}) => {
  if (config._retryAfterSessionRefresh || config._skipSessionRefresh) return false;
  return !nonRefreshableAuthPaths.some((path) => String(config.url || '').startsWith(path));
};

const expireClientSession = () => {
  clearCsrfToken();
  window.dispatchEvent(new Event('rifkando:session-expired'));
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || !isRefreshableRequest(originalRequest)) {
      if (error.response?.status === 401 && !originalRequest?._skipSessionExpiryEvent) {
        expireClientSession();
      }
      return Promise.reject(error);
    }

    try {
      refreshPromise ||= api.post('/auth/refresh', {}, {
        _skipSessionRefresh: true,
        _skipSessionExpiryEvent: true,
      });
      const refreshResponse = await refreshPromise;
      setCsrfToken(refreshResponse.data.csrfToken);
      originalRequest._retryAfterSessionRefresh = true;
      return api(originalRequest);
    } catch (refreshError) {
      expireClientSession();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

// ==================== AUTH APIs ====================
export const getMe = () => api.get('/auth/me');
export const getAuthMethods = () => api.get('/auth/methods');

// ==================== PRODUCT APIs ====================
export const getProducts = () => api.get('/products');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (productData) => api.post('/products', productData);
export const updateProduct = (id, productData) => api.put(`/products/${id}`, productData);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getMyProducts = () => api.get('/my-products');

// ==================== COURSE APIs ====================
export const getCourses = (params) => api.get('/courses', { params });
export const getCourse = (id) => api.get(`/courses/${id}`);
export const createCourse = (courseData) => api.post('/courses', courseData);
export const updateCourse = (id, courseData) => api.put(`/courses/${id}`, courseData);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);
export const getMyCourses = () => api.get('/my-courses');
export const enrollCourse = (id) => api.post(`/courses/${id}/enroll`);
export const updateLessonProgress = (courseId, lessonId, completed) => 
  api.put(`/courses/${courseId}/lessons/${lessonId}/progress`, { completed });

// Lesson APIs
export const addLesson = (courseId, lessonData) => api.post(`/courses/${courseId}/lessons`, lessonData);
export const updateLesson = (courseId, lessonId, lessonData) => api.put(`/courses/${courseId}/lessons/${lessonId}`, lessonData);
export const deleteLesson = (courseId, lessonId) => api.delete(`/courses/${courseId}/lessons/${lessonId}`);

// ==================== SERVICE APIs ====================
export const getServices = (params) => api.get('/services', { params });
export const getService = (id) => api.get(`/services/${id}`);
export const createService = (serviceData) => api.post('/services', serviceData);
export const updateService = (id, serviceData) => api.put(`/services/${id}`, serviceData);
export const deleteService = (id) => api.delete(`/services/${id}`);
export const getMyServices = () => api.get('/my-services');
export const orderService = (id, orderData) => api.post(`/services/${id}/order`, orderData);

// ==================== DIGITAL PRODUCT APIs ====================
export const getDigitalProducts = (params) => api.get('/digital', { params });
export const getDigitalProduct = (id) => api.get(`/digital/${id}`);
export const createDigitalProduct = (productData) => api.post('/digital', productData);
export const updateDigitalProduct = (id, productData) => api.put(`/digital/${id}`, productData);
export const deleteDigitalProduct = (id) => api.delete(`/digital/${id}`);
export const getMyDigitalProducts = () => api.get('/my-digital');
export const purchaseDigitalProduct = (id) => api.post(`/digital/${id}/purchase`);
export const getMyPurchases = () => api.get('/my-purchases');
export const getDigitalProductForManagement = (id) => api.get(`/digital/${id}/manage`);
export const uploadDigitalFile = (formData, onUploadProgress) => api.post('/upload-digital-file', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress,
});
export const requestDigitalAccess = (id, message = '') => api.post(`/digital/${id}/request`, { message });
export const getDigitalAccessRequests = () => api.get('/seller/digital-requests');
export const decideDigitalAccessRequest = (id, action, reason = '') => api.post(`/seller/digital-requests/${id}/decision`, { action, reason });
export const getDigitalDownloadAccess = (id) => api.get(`/digital/${id}/can-download`);
export const downloadDigitalProduct = (id) => api.get(`/digital/${id}/download`, { responseType: 'blob' });

// ==================== FINDit APIs ====================
export const getFinditRequests = (params) => api.get('/findit/requests', { params });
export const getFinditRequest = (id) => api.get(`/findit/requests/${id}`);
export const createFinditRequest = (requestData) => api.post('/findit/requests', requestData);
export const getMyFinditRequests = () => api.get('/findit/my-requests');
export const cancelFinditRequest = (id) => api.post(`/findit/requests/${id}/cancel`);
export const uploadFinditMedia = (formData, onUploadProgress) => api.post('/upload-findit-media', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress,
});
export const getSellerFinditOffers = () => api.get('/seller/findit/offers');
export const createFinditOffer = (requestId, offerData) => api.post(`/findit/requests/${requestId}/offers`, offerData);
export const updateFinditOffer = (id, offerData) => api.put(`/findit/offers/${id}`, offerData);
export const withdrawFinditOffer = (id) => api.delete(`/findit/offers/${id}`);
export const acceptFinditOffer = (id, checkoutData, idempotencyKey) => api.post(`/findit/offers/${id}/checkout`, checkoutData, {
  headers: { 'Idempotency-Key': idempotencyKey },
});

// ==================== CART APIs ====================
export const getCart = () => api.get('/cart');
export const addToCart = (productId, quantity) => api.post('/cart', { product_id: productId, quantity });
export const updateCartItem = (productId, quantity) => api.put(`/cart/${productId}`, { quantity });
export const removeFromCart = (productId) => api.delete(`/cart/${productId}`);
export const clearCart = () => api.delete('/cart');
export const getCartCount = () => api.get('/cart/count');

// ==================== ORDER APIs ====================
export const createOrder = (orderData) => api.post('/orders', orderData);
export const getOrders = () => api.get('/orders');
export const getOrder = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (id, status) => api.put(`/orders/${id}/status`, { status });

// ==================== FAVORITES APIs ====================
export const getFavorites = () => api.get('/favorites');
export const addToFavorites = (itemId, itemType) => api.post('/favorites', { item_id: itemId, item_type: itemType });
export const removeFromFavorites = (itemId, itemType) => api.delete(`/favorites/${itemId}/${itemType}`);
export const checkFavorite = (itemId, itemType) => api.get(`/favorites/check/${itemId}/${itemType}`);

// ==================== USER PROFILE APIs ====================
export const updateProfile = (userData) => api.patch('/users/update-me', userData);

export default api;

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIs ====================
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const getMe = () => api.get('/auth/me');

// ==================== PRODUCT APIs ====================
export const getProducts = () => api.get('/products');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (productData) => api.post('/products', productData);
export const updateProduct = (id, productData) => api.put(`/products/${id}`, productData);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getMyProducts = () => api.get('/my-products');

// ==================== COURSE APIs ====================
export const getCourses = () => api.get('/courses');
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
export const getServices = () => api.get('/services');
export const getService = (id) => api.get(`/services/${id}`);
export const createService = (serviceData) => api.post('/services', serviceData);
export const updateService = (id, serviceData) => api.put(`/services/${id}`, serviceData);
export const deleteService = (id) => api.delete(`/services/${id}`);
export const getMyServices = () => api.get('/my-services');
export const orderService = (id, orderData) => api.post(`/services/${id}/order`, orderData);

// ==================== DIGITAL PRODUCT APIs ====================
export const getDigitalProducts = () => api.get('/digital');
export const getDigitalProduct = (id) => api.get(`/digital/${id}`);
export const createDigitalProduct = (productData) => api.post('/digital', productData);
export const updateDigitalProduct = (id, productData) => api.put(`/digital/${id}`, productData);
export const deleteDigitalProduct = (id) => api.delete(`/digital/${id}`);
export const getMyDigitalProducts = () => api.get('/my-digital');
export const purchaseDigitalProduct = (id) => api.post(`/digital/${id}/purchase`);
export const getMyPurchases = () => api.get('/my-purchases');

// ==================== BOOKING APIs ====================
export const getBookings = () => api.get('/bookings');
export const getBooking = (id) => api.get(`/bookings/${id}`);
export const createBooking = (bookingData) => api.post('/bookings', bookingData);
export const updateBooking = (id, bookingData) => api.put(`/bookings/${id}`, bookingData);
export const deleteBooking = (id) => api.delete(`/bookings/${id}`);
export const getMyBookings = () => api.get('/my-bookings');
export const bookAppointment = (id, appointmentData) => api.post(`/bookings/${id}/book`, appointmentData);
export const getMyAppointments = () => api.get('/my-appointments');

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
export const updatePassword = (passwordData) => api.patch('/users/update-password', passwordData);




// ==================== ADVANCED AUTH APIs ====================

export const verifyEmail = (email, code) =>
  api.post('/auth/verify-email', {
    email,
    code
  });



export default api;
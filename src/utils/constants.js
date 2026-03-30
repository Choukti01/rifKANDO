export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const CATEGORIES = {
  PRODUCTS: {
    ELECTRONICS: 'electronics',
    FASHION: 'fashion',
    HANDICRAFTS: 'handicrafts',
    BOOKS: 'books',
    HOME: 'home'
  },
  COURSES: {
    PROGRAMMING: 'programming',
    DESIGN: 'design',
    MARKETING: 'marketing',
    BUSINESS: 'business',
    LANGUAGES: 'languages'
  },
  SERVICES: {
    CONSULTING: 'consulting',
    FREELANCE: 'freelance',
    TUTORING: 'tutoring',
    DESIGN: 'design'
  }
}

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
}

export const PAYMENT_METHODS = {
  CMI: 'cmi',
  CASH: 'cash',
  WALLET: 'wallet'
}

export const SELLER_TYPES = {
  PRODUCT: 'product',
  COURSE: 'course',
  SERVICE: 'service',
  DIGITAL: 'digital',
  BOOKING: 'booking'
}
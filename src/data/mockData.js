export const mockProducts = [
  {
    id: 1,
    title: 'iPhone 13 Pro',
    price: 9500,
    oldPrice: 10500,
    description: 'The latest iPhone with A15 Bionic chip and Pro camera system.',
    seller: 'TechStore',
    sellerId: 101,
    rating: 4.8,
    reviews: 128,
    images: ['📱'],
    category: 'electronics',
    inStock: true,
    quantity: 15,
    sold: 234,
    specifications: {
      display: '6.1-inch Super Retina XDR',
      processor: 'A15 Bionic',
      camera: 'Triple 12MP system',
      battery: 'Up to 22 hours'
    }
  },
  {
    id: 2,
    title: 'Nike Air Max',
    price: 890,
    description: 'Comfortable running shoes with air cushion technology.',
    seller: 'Sportify',
    sellerId: 102,
    rating: 4.5,
    reviews: 89,
    images: ['👟'],
    category: 'fashion',
    inStock: true,
    quantity: 45,
    sold: 567,
    specifications: {
      size: 'US 8-12',
      material: 'Mesh and Synthetic',
      color: 'Black/White'
    }
  }
]

export const mockCourses = [
  {
    id: 1,
    title: 'Complete React.js Course',
    price: 499,
    oldPrice: 999,
    description: 'Learn React.js from scratch and build real-world applications.',
    instructor: 'Ahmed Alawi',
    instructorId: 201,
    rating: 4.9,
    reviews: 1234,
    students: 12340,
    duration: '15 hours',
    lessons: 45,
    level: 'beginner',
    image: '📚',
    whatYoullLearn: [
      'Build complete React applications',
      'Master React Hooks',
      'Understand React Router',
      'Connect with APIs'
    ]
  }
]

export const mockServices = [
  {
    id: 1,
    title: 'Professional Logo Design',
    price: 800,
    description: 'Get a unique, professional logo for your brand.',
    provider: 'Creative Studio',
    providerId: 301,
    rating: 4.9,
    reviews: 234,
    deliveryTime: '3 days',
    revisions: 2,
    image: '🎨',
    packages: [
      { name: 'basic', price: 800, deliveryTime: '3 days', revisions: 2 },
      { name: 'standard', price: 1200, deliveryTime: '5 days', revisions: 5 },
      { name: 'premium', price: 2000, deliveryTime: '7 days', revisions: 'Unlimited' }
    ]
  }
]

export const mockDigital = [
  {
    id: 1,
    title: 'Business Website Template',
    price: 299,
    description: 'Modern, responsive business website template.',
    seller: 'DesignMarket',
    rating: 4.8,
    downloads: 1234,
    image: '📄',
    type: 'template',
    fileSize: '5.2 MB',
    license: 'Standard'
  }
]

export const mockBookings = [
  {
    id: 1,
    title: 'Business Consultation',
    price: 500,
    duration: '1 hour',
    provider: 'Ahmed Benjelloun',
    rating: 4.9,
    image: '💼',
    type: 'consultation'
  }
]
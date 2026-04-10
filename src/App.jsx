import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Layout
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

// Pages
import HomePage from './pages/home/HomePage'
import ProductsPage from './pages/marketplace/ProductsPage'
import ProductDetailsPage from './pages/marketplace/ProductDetailsPage'
import CoursesPage from './pages/marketplace/CoursesPage'
import CourseDetailsPage from './pages/marketplace/CourseDetailsPage'
import ServicesPage from './pages/marketplace/ServicesPage'
import ServiceDetailsPage from './pages/marketplace/ServiceDetailsPage'
import DigitalPage from './pages/marketplace/DigitalPage'
import DigitalDetailsPage from './pages/marketplace/DigitalDetailsPage'
import BookingsPage from './pages/marketplace/BookingsPage'
import BookingDetailsPage from './pages/marketplace/BookingDetailsPage'
import CartPage from './pages/buyer/CartPage'
import FavoritesPage from './pages/buyer/FavoritesPage'
import CheckoutPage from './pages/buyer/CheckoutPage'
import OrdersPage from './pages/buyer/OrdersPage'
import OrderDetailsPage from './pages/buyer/OrderDetailsPage'
import MyPurchasesPage from './pages/buyer/MyPurchasesPage'
import MyAppointmentsPage from './pages/buyer/MyAppointmentsPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import SellerTypePage from './pages/seller/SellerTypePage'
import ProfilePage from './pages/profile/ProfilePage'
import PublicProfilePage from './pages/profile/PublicProfilePage'   // NEW IMPORT
import SearchPage from './pages/search/SearchPage'

// Seller Dashboard Pages
import DashboardLayout from './pages/seller/dashboard/DashboardLayout'
import Overview from './pages/seller/dashboard/Overview'
import Earnings from './pages/seller/dashboard/Earnings'
import ProductsDashboard from './pages/seller/products/ProductsDashboard'
import AddProduct from './pages/seller/products/AddProduct'
import CoursesDashboard from './pages/seller/courses/CoursesDashboard'
import AddCourse from './pages/seller/courses/AddCourse'
import ServicesDashboard from './pages/seller/services/ServicesDashboard'
import AddService from './pages/seller/services/AddService'
import DigitalDashboard from './pages/seller/digital/DigitalDashboard'
import AddDigitalProduct from './pages/seller/digital/AddDigitalProduct'
import BookingsDashboard from './pages/seller/bookings/BookingsDashboard'
import AddBooking from './pages/seller/bookings/AddBooking'

// Footer Pages
import SellerGuidelines from './pages/seller/SellerGuidelines'
import PricingPage from './pages/PricingPage'
import HelpCenter from './pages/HelpCenter'
import ContactPage from './pages/ContactPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'

// Context Providers
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { FavoritesProvider } from './contexts/FavoritesContext'

// Protected Route Component
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Navbar />
              <main style={{ flexGrow: 1, paddingTop: '80px' }}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/product/:id" element={<ProductDetailsPage />} />
                  <Route path="/courses" element={<CoursesPage />} />
                  <Route path="/course/:id" element={<CourseDetailsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/service/:id" element={<ServiceDetailsPage />} />
                  <Route path="/digital" element={<DigitalPage />} />
                  <Route path="/digital/:id" element={<DigitalDetailsPage />} />
                  <Route path="/bookings" element={<BookingsPage />} />
                  <Route path="/booking/:id" element={<BookingDetailsPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  
                  {/* Auth Pages */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  
                  {/* Footer Pages */}
                  <Route path="/seller-guidelines" element={<SellerGuidelines />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />

                  {/* Public Profile Route (view seller info) */}
                  <Route path="/profile/:userId" element={<PublicProfilePage />} />

                  {/* Protected Routes - Require Authentication */}
                  <Route path="/cart" element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/favorites" element={
                    <ProtectedRoute>
                      <FavoritesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/checkout" element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/orders" element={
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/orders/:id" element={
                    <ProtectedRoute>
                      <OrderDetailsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-purchases" element={
                    <ProtectedRoute>
                      <MyPurchasesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-appointments" element={
                    <ProtectedRoute>
                      <MyAppointmentsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/choose-seller-type" element={
                    <ProtectedRoute>
                      <SellerTypePage />
                    </ProtectedRoute>
                  } />

                  {/* Seller Dashboard Routes - Require Seller Role */}
                  <Route path="/seller/dashboard" element={
                    <ProtectedRoute requiredRole="seller">
                      <DashboardLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Overview />} />
                    <Route path="overview" element={<Overview />} />
                    <Route path="earnings" element={<Earnings />} />
                    <Route path="products" element={<ProductsDashboard />} />
                    <Route path="products/add" element={<AddProduct />} />
                    <Route path="courses" element={<CoursesDashboard />} />
                    <Route path="courses/add" element={<AddCourse />} />
                    <Route path="services" element={<ServicesDashboard />} />
                    <Route path="services/add" element={<AddService />} />
                    <Route path="digital" element={<DigitalDashboard />} />
                    <Route path="digital/add" element={<AddDigitalProduct />} />
                    <Route path="bookings" element={<BookingsDashboard />} />
                    <Route path="bookings/add" element={<AddBooking />} />
                  </Route>
                </Routes>
              </main>
              <Footer />
            </div>
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                },
              }}
            />
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
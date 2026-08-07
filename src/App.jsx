import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

import ChatPage from './pages/messages/ChatPage';
import MessagesInbox from './pages/messages/MessagesInbox';

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
import PublicProfilePage from './pages/profile/PublicProfilePage'
import SearchPage from './pages/search/SearchPage'

import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';

import SellerOrders from './pages/seller/dashboard/Orders';
import AdminDashboard from './pages/admin/AdminDashboard';
import VerifySellers from './pages/admin/VerifySellers';
import ReviewVerifications from './pages/admin/ReviewVerifications';

import PackagesManager from './pages/seller/services/PackagesManager';
import LessonsManager from './pages/seller/courses/LessonsManager';

// Seller Dashboard Pages
import DashboardLayout from './pages/seller/dashboard/DashboardLayout'
import Overview from './pages/seller/dashboard/Overview'

import ProductsDashboard from './pages/seller/products/ProductsDashboard'
import AddProduct from './pages/seller/products/AddProduct'
import EditProduct from './pages/seller/products/EditProduct'
import CoursesDashboard from './pages/seller/courses/CoursesDashboard'
import AddCourse from './pages/seller/courses/AddCourse'
import EditCourse from './pages/seller/courses/EditCourse'
import ServicesDashboard from './pages/seller/services/ServicesDashboard'
import AddService from './pages/seller/services/AddService'
import EditService from './pages/seller/services/EditService'
import DigitalDashboard from './pages/seller/digital/DigitalDashboard'
import AddDigitalProduct from './pages/seller/digital/AddDigitalProduct'
import EditDigitalProduct from './pages/seller/digital/EditDigitalProduct'
import BookingsDashboard from './pages/seller/bookings/BookingsDashboard'
import AddBooking from './pages/seller/bookings/AddBooking'
import EditBooking from './pages/seller/bookings/EditBooking'
import Settings from './pages/seller/dashboard/Settings'
import Wallet from './pages/seller/dashboard/Wallet'
import SellerOffers from './pages/seller/dashboard/Offers'
import VerificationUpload from './pages/seller/dashboard/VerificationUpload'   

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
import PageTransition from './components/common/PageTransition'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const location = useLocation()

  return (
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Navbar />
              <main className="app-main">
                <AnimatePresence mode="wait" initial={false}>
                  <PageTransition key={location.pathname}>
                    <Routes location={location}>
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

                  <Route path="/admin" element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }>
                    <Route path="verify-sellers" element={<VerifySellers />} />
                    <Route path="review-verifications" element={<ReviewVerifications />} />
                  </Route>

                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/failed" element={<PaymentFailed />} />

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

                  {/* Public Profile Route */}
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
                    <Route path="products" element={<ProductsDashboard />} />
                    <Route path="products/add" element={<AddProduct />} />
                    <Route path="products/:id/edit" element={<EditProduct />} />
                    <Route path="courses" element={<CoursesDashboard />} />
                    <Route path="courses/add" element={<AddCourse />} />
                    <Route path="courses/:id/edit" element={<EditCourse />} />
                    <Route path="courses/:id/lessons" element={<LessonsManager />} />
                    <Route path="services" element={<ServicesDashboard />} />
                    <Route path="services/add" element={<AddService />} />
                    <Route path="services/:id/edit" element={<EditService />} />
                    <Route path="services/:id/packages" element={<PackagesManager />} />
                    <Route path="digital" element={<DigitalDashboard />} />
                    <Route path="digital/add" element={<AddDigitalProduct />} />
                    <Route path="digital/:id/edit" element={<EditDigitalProduct />} />
                    <Route path="bookings" element={<BookingsDashboard />} />
                    <Route path="bookings/add" element={<AddBooking />} />
                    <Route path="bookings/:id/edit" element={<EditBooking />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="wallet" element={<Wallet />} />
                    <Route path="orders" element={<SellerOrders />} />
                    <Route path="offers" element={<SellerOffers />} />
                    <Route path="messages" element={<MessagesInbox />} />
                    <Route path="messages/:userId" element={<ChatPage />} />
                    <Route path="verification" element={<VerificationUpload />} />
                  </Route>
                    </Routes>
                  </PageTransition>
                </AnimatePresence>
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
  )
}

export default App

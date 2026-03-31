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
import BookingsPage from './pages/marketplace/BookingsPage'
import CartPage from './pages/buyer/CartPage'
import FavoritesPage from './pages/buyer/FavoritesPage'
import CheckoutPage from './pages/buyer/CheckoutPage'
import OrdersPage from './pages/buyer/OrdersPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import SellerTypePage from './pages/seller/SellerTypePage'
import ProfilePage from './pages/profile/ProfilePage'
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
                  {/* Main Pages */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/product/:id" element={<ProductDetailsPage />} />
                  <Route path="/courses" element={<CoursesPage />} />
                  <Route path="/course/:id" element={<CourseDetailsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/service/:id" element={<ServiceDetailsPage />} />
                  <Route path="/digital" element={<DigitalPage />} />
                  <Route path="/bookings" element={<BookingsPage />} />
                  
                  {/* Buyer Pages */}
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  
                  {/* Auth Pages */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  
                  {/* Seller Pages */}
                  <Route path="/choose-seller-type" element={<SellerTypePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  
                  {/* Footer Pages */}
                  <Route path="/seller-guidelines" element={<SellerGuidelines />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />

                  {/* Seller Dashboard Routes */}
                  <Route path="/seller/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Overview />} />
                    <Route path="overview" element={<Overview />} />
                    <Route path="earnings" element={<Earnings />} />
                    <Route path="products" element={<ProductsDashboard />} />
                    <Route path="products/add" element={<AddProduct />} />
                    <Route path="courses" element={<CoursesDashboard />} />
                    <Route path="courses/add" element={<AddCourse />} />
                    <Route path="services" element={<ServicesDashboard />} />
                    <Route path="services/add" element={<AddService />} />
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
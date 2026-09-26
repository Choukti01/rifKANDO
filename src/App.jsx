import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

// Layout
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

import HomePage from './pages/home/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
const ChatPage = lazy(() => import('./pages/messages/ChatPage'))
const MessagesInbox = lazy(() => import('./pages/messages/MessagesInbox'))
const ProductsPage = lazy(() => import('./pages/marketplace/ProductsPage'))
const ProductDetailsPage = lazy(() => import('./pages/marketplace/ProductDetailsPage'))
// Parked launch modules. Their implementations remain untouched in source.
// const CoursesPage = lazy(() => import('./pages/marketplace/CoursesPage'))
// const CourseDetailsPage = lazy(() => import('./pages/marketplace/CourseDetailsPage'))
// const ServicesPage = lazy(() => import('./pages/marketplace/ServicesPage'))
// const ServiceDetailsPage = lazy(() => import('./pages/marketplace/ServiceDetailsPage'))
// const DigitalPage = lazy(() => import('./pages/marketplace/DigitalPage'))
// const DigitalDetailsPage = lazy(() => import('./pages/marketplace/DigitalDetailsPage'))
const FindItPage = lazy(() => import('./pages/marketplace/FindItPage'))
const CartPage = lazy(() => import('./pages/buyer/CartPage'))
const FavoritesPage = lazy(() => import('./pages/buyer/FavoritesPage'))
const CheckoutPage = lazy(() => import('./pages/buyer/CheckoutPage'))
const OrdersPage = lazy(() => import('./pages/buyer/OrdersPage'))
const OrderDetailsPage = lazy(() => import('./pages/buyer/OrderDetailsPage'))
// const MyPurchasesPage = lazy(() => import('./pages/buyer/MyPurchasesPage'))
const FindItDashboardPage = lazy(() => import('./pages/buyer/FindItDashboardPage'))
const SellerTypePage = lazy(() => import('./pages/seller/SellerTypePage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const PublicProfilePage = lazy(() => import('./pages/profile/PublicProfilePage'))
const SearchPage = lazy(() => import('./pages/search/SearchPage'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'))
const SellerOrders = lazy(() => import('./pages/seller/dashboard/Orders'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const CODReconciliation = lazy(() => import('./pages/admin/CODReconciliation'))
const OperationsTeamPage = lazy(() => import('./pages/admin/OperationsTeamPage'))
const CODOperationsDesk = lazy(() => import('./pages/operations/CODOperationsDesk'))
// const PackagesManager = lazy(() => import('./pages/seller/services/PackagesManager'))
// const LessonsManager = lazy(() => import('./pages/seller/courses/LessonsManager'))
const DashboardLayout = lazy(() => import('./pages/seller/dashboard/DashboardLayout'))
const Overview = lazy(() => import('./pages/seller/dashboard/Overview'))
const ProductsDashboard = lazy(() => import('./pages/seller/products/ProductsDashboard'))
const AddProduct = lazy(() => import('./pages/seller/products/AddProduct'))
const EditProduct = lazy(() => import('./pages/seller/products/EditProduct'))
// const CoursesDashboard = lazy(() => import('./pages/seller/courses/CoursesDashboard'))
// const AddCourse = lazy(() => import('./pages/seller/courses/AddCourse'))
// const EditCourse = lazy(() => import('./pages/seller/courses/EditCourse'))
// const ServicesDashboard = lazy(() => import('./pages/seller/services/ServicesDashboard'))
// const AddService = lazy(() => import('./pages/seller/services/AddService'))
// const EditService = lazy(() => import('./pages/seller/services/EditService'))
// const DigitalDashboard = lazy(() => import('./pages/seller/digital/DigitalDashboard'))
// const AddDigitalProduct = lazy(() => import('./pages/seller/digital/AddDigitalProduct'))
// const EditDigitalProduct = lazy(() => import('./pages/seller/digital/EditDigitalProduct'))
const SellerFindItPage = lazy(() => import('./pages/seller/findit/SellerFindItPage'))
const Settings = lazy(() => import('./pages/seller/dashboard/Settings'))
const Wallet = lazy(() => import('./pages/seller/dashboard/Wallet'))
const SellerOffers = lazy(() => import('./pages/seller/dashboard/Offers'))
const SellerGuidelines = lazy(() => import('./pages/seller/SellerGuidelines'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const HelpCenter = lazy(() => import('./pages/HelpCenter'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))

// Context Providers
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { FavoritesProvider } from './contexts/FavoritesContext'

// Protected Route Component
import ProtectedRoute from './components/common/ProtectedRoute'
import PageTransition from './components/common/PageTransition'
import UnderDevelopment from './components/common/UnderDevelopment'
import MarketplaceClosed from './components/common/MarketplaceClosed'
import NotFoundPage from './components/common/NotFoundPage'
import { API_ORIGIN } from './config/apiUrl'

const PageLoadingFallback = () => (
  <div
    aria-busy="true"
    aria-live="polite"
    role="status"
    style={{
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'center',
      minHeight: '45vh',
      padding: '2rem',
    }}
  >
    <div style={{ color: '#216275', fontWeight: 600 }}>Loading page...</div>
  </div>
)

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const location = useLocation()
  const [apiAvailable, setApiAvailable] = useState(null)
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const checkAvailability = async () => {
      try {
        const response = await fetch(`${API_ORIGIN}/health`, {
          cache: 'no-store',
          // A tunnel or serverless database can take longer than five seconds
          // to wake up. Avoid showing a false outage while the API is healthy.
          signal: AbortSignal.timeout(12_000),
        })
        if (active) setApiAvailable(response.ok)
      } catch {
        if (active) setApiAvailable(false)
      }
    }
    checkAvailability()
    const timer = window.setInterval(checkAvailability, 15_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [availabilityAttempt])

  if (apiAvailable === null) return <PageLoadingFallback />
  if (!apiAvailable) return <MarketplaceClosed onRetry={() => { setApiAvailable(null); setAvailabilityAttempt((attempt) => attempt + 1) }} />

  return (
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Navbar />
              <main className="app-main">
                <AnimatePresence mode="wait" initial={false}>
                  <PageTransition key={location.pathname}>
                    <Suspense fallback={<PageLoadingFallback />}>
                    <Routes location={location}>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/product/:id" element={<ProductDetailsPage />} />
                  {/* Focused launch: the original course, service, and digital pages remain in source but are intentionally parked. */}
                  <Route path="/courses" element={<UnderDevelopment sectionKey="courses" />} />
                  <Route path="/course/:id" element={<UnderDevelopment sectionKey="courses" />} />
                  <Route path="/services" element={<UnderDevelopment sectionKey="services" />} />
                  <Route path="/service/:id" element={<UnderDevelopment sectionKey="services" />} />
                  <Route path="/digital" element={<UnderDevelopment sectionKey="digital" />} />
                  <Route path="/digital/:id" element={<UnderDevelopment sectionKey="digital" />} />
                  <Route path="/findit" element={<FindItPage />} />
                  <Route path="/bookings" element={<UnderDevelopment sectionKey="bookings" />} />
                  <Route path="/booking/:id" element={<UnderDevelopment sectionKey="bookings" />} />
                  <Route path="/search" element={<SearchPage />} />

                  <Route path="/admin" element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/cod-reconciliation" element={
                    <ProtectedRoute requiredRoles={['finance', 'admin', 'super_admin']}>
                      <CODReconciliation />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/operations-team" element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                      <OperationsTeamPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/operations/cod" element={
                    <ProtectedRoute requiredRoles={['operations', 'finance', 'admin', 'super_admin']}>
                      <CODOperationsDesk />
                    </ProtectedRoute>
                  } />
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
                      <UnderDevelopment sectionKey="digital" />
                    </ProtectedRoute>
                  } />
                  <Route path="/findit/dashboard" element={
                    <ProtectedRoute>
                      <FindItDashboardPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-appointments" element={<Navigate to="/findit/dashboard" replace />} />
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
                    {/* The seller implementations below are retained in source and reactivated when their launch checks are complete. */}
                    <Route path="courses/*" element={<UnderDevelopment sectionKey="courses" sellerWorkspace />} />
                    <Route path="services/*" element={<UnderDevelopment sectionKey="services" sellerWorkspace />} />
                    <Route path="digital/*" element={<UnderDevelopment sectionKey="digital" sellerWorkspace />} />
                    <Route path="findit" element={<SellerFindItPage />} />
                    <Route path="bookings/*" element={<UnderDevelopment sectionKey="bookings" sellerWorkspace />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="wallet" element={<Wallet />} />
                    <Route path="orders" element={<SellerOrders />} />
                    <Route path="offers" element={<SellerOffers />} />
                    <Route path="messages" element={<MessagesInbox />} />
                    <Route path="messages/:userId" element={<ChatPage />} />
                    <Route path="favorites" element={<FavoritesPage />} />
                    <Route path="cart" element={<CartPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                    </Suspense>
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

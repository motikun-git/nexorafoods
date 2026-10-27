import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import RequireAdmin from './components/auth/RequireAdmin.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider, useCart } from './context/CartContext.jsx'
import { CategoriesProvider } from './context/CategoriesContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import SiteLayout from './layouts/SiteLayout.jsx'
import AdminCategories from './pages/admin/AdminCategories.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminMessages from './pages/admin/AdminMessages.jsx'
import AdminOrderDetail from './pages/admin/AdminOrderDetail.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminProductForm from './pages/admin/AdminProductForm.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import AboutPage from './pages/AboutPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import ProductPage from './pages/ProductPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ShopPage from './pages/ShopPage.jsx'

// Old /cart links open the cart drawer on the shop page.
function CartRoute() {
  const { openDrawer } = useCart()
  useEffect(() => openDrawer(), [openDrawer])
  return <Navigate to="/shop" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <CategoriesProvider>
            <CartProvider>
              <Routes>
                <Route element={<SiteLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="shop" element={<ShopPage />} />
                  <Route path="product/:slug" element={<ProductPage />} />
                  <Route path="cart" element={<CartRoute />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route
                    path="account"
                    element={
                      <RequireAuth>
                        <AccountPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="checkout"
                    element={
                      <RequireAuth reason="checkout">
                        <CheckoutPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="orders/:orderNumber"
                    element={
                      <RequireAuth>
                        <OrderPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Admin area: its own layout, admins only */}
                <Route
                  path="admin"
                  element={
                    <RequireAdmin>
                      <AdminLayout />
                    </RequireAdmin>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/:orderNumber" element={<AdminOrderDetail />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProductForm />} />
                  <Route path="products/:id" element={<AdminProductForm key="edit" />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </CartProvider>
          </CategoriesProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}

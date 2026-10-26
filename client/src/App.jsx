import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import RequireAuth from './components/auth/RequireAuth.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider, useCart } from './context/CartContext.jsx'
import { CategoriesProvider } from './context/CategoriesContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import SiteLayout from './layouts/SiteLayout.jsx'
import AccountPage from './pages/AccountPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import ComingSoonPage from './pages/ComingSoonPage.jsx'
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
                  <Route path="about" element={<ComingSoonPage title="About us" />} />
                  <Route path="contact" element={<ComingSoonPage title="Contact us" />} />
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

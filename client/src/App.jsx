import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { CartProvider, useCart } from './context/CartContext.jsx'
import { CategoriesProvider } from './context/CategoriesContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import SiteLayout from './layouts/SiteLayout.jsx'
import ComingSoonPage from './pages/ComingSoonPage.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
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
        <CategoriesProvider>
          <CartProvider>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route index element={<HomePage />} />
                <Route path="shop" element={<ShopPage />} />
                <Route path="product/:slug" element={<ComingSoonPage title="Product details" />} />
                <Route path="cart" element={<CartRoute />} />
                <Route path="checkout" element={<ComingSoonPage title="Checkout" />} />
                <Route path="about" element={<ComingSoonPage title="About us" />} />
                <Route path="contact" element={<ComingSoonPage title="Contact us" />} />
                <Route path="login" element={<ComingSoonPage title="My account" />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </CartProvider>
        </CategoriesProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}

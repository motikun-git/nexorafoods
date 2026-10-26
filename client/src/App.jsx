import { BrowserRouter, Route, Routes } from 'react-router'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { CategoriesProvider } from './context/CategoriesContext.jsx'
import SiteLayout from './layouts/SiteLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import ComingSoonPage from './pages/ComingSoonPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <CategoriesProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ComingSoonPage title="Shop" />} />
              <Route path="product/:slug" element={<ComingSoonPage title="Product details" />} />
              <Route path="cart" element={<ComingSoonPage title="Your cart" />} />
              <Route path="about" element={<ComingSoonPage title="About us" />} />
              <Route path="contact" element={<ComingSoonPage title="Contact us" />} />
              <Route path="login" element={<ComingSoonPage title="My account" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </CategoriesProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}

'use client'

import { AuthProvider } from '../context/AuthContext.jsx'
import { CartProvider } from '../context/CartContext.jsx'
import { CategoriesProvider } from '../context/CategoriesContext.jsx'
import { SettingsProvider } from '../context/SettingsContext.jsx'
import SiteLayout from '../layouts/SiteLayout.jsx'

// Everything the store needs in the browser, around every page.
export default function Providers({ children }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CategoriesProvider>
          <CartProvider>
            <SiteLayout>{children}</SiteLayout>
          </CartProvider>
        </CategoriesProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}

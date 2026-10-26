import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import CartDrawer from '../components/cart/CartDrawer.jsx'
import FloatingCartButton from '../components/cart/FloatingCartButton.jsx'
import Footer from '../components/layout/Footer.jsx'
import Header from '../components/layout/Header.jsx'
import Toast from '../components/ui/Toast.jsx'

// Pages where the floating "View cart" button would get in the way.
const NO_FLOATING_CART = ['/checkout', '/cart']

// Shared frame for every customer page: header, page content, footer, cart.
export default function SiteLayout() {
  const { pathname } = useLocation()
  const showFloatingCart = !NO_FLOATING_CART.some((path) => pathname.startsWith(path))

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-pop"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Space so the floating button never covers the end of the footer */}
      {showFloatingCart ? <div className="h-20 bg-primary-dark sm:h-24" aria-hidden="true" /> : null}

      {showFloatingCart ? <FloatingCartButton /> : null}
      <CartDrawer />
      <Toast />
    </div>
  )
}

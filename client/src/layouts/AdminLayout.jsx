import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import Drawer from '../components/ui/Drawer.jsx'
import Icon from '../components/ui/Icon.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

export const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'truck' },
  { to: '/admin/products', label: 'Products', icon: 'leaf' },
  { to: '/admin/categories', label: 'Categories', icon: 'menu' },
  { to: '/admin/settings', label: 'Settings', icon: 'shield' },
]

function AdminNav({ onNavigate }) {
  return (
    <nav aria-label="Admin navigation">
      <ul className="space-y-1">
        {ADMIN_LINKS.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-ink hover:bg-primary-soft hover:text-primary'
                }`
              }
            >
              <Icon name={link.icon} className="size-5" />
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Frame for every /admin page: side menu (desktop) or drawer (phone).
export default function AdminLayout() {
  const { storeName, logo } = useSettings()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  const brand = (
    <Link to="/admin" className="flex items-center gap-2">
      {logo ? <img src={logo} alt="" className="size-8" /> : null}
      <span className="font-extrabold text-primary">{storeName}</span>
      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold uppercase text-accent-dark">Admin</span>
    </Link>
  )

  return (
    <div className="min-h-svh bg-cream lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line bg-white lg:flex lg:h-svh lg:flex-col lg:sticky lg:top-0">
        <div className="border-b border-line p-4">{brand}</div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNav />
        </div>
        <div className="border-t border-line p-3 text-sm">
          <p className="truncate px-3 text-muted">{user.name}</p>
          <Link to="/" className="mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-cream">
            <Icon name="external" className="size-4" />
            View store
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phone / tablet top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white px-2 lg:hidden">
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open admin menu">
            <Icon name="menu" className="size-6" />
          </button>
          {brand}
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <Drawer open={menuOpen} onClose={closeMenu} title="Admin menu">
        <div className="p-3">
          <AdminNav onNavigate={closeMenu} />
          <Link to="/" onClick={closeMenu} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-cream">
            <Icon name="external" className="size-4" />
            View store
          </Link>
        </div>
      </Drawer>
      <Toast />
    </div>
  )
}

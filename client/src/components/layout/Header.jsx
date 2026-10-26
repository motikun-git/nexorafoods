import { useCallback, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useCart } from '../../context/CartContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatPhone } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'
import Logo from '../ui/Logo.jsx'
import CategoryMenu from './CategoryMenu.jsx'
import MobileMenu from './MobileMenu.jsx'
import SearchForm from './SearchForm.jsx'
import { NAV_LINKS } from './navLinks.js'

/*
 * Layout by screen size (no fixed pixel positions anywhere):
 *  phone  (< 768px):  [menu] [logo] ........ [account] [cart]
 *                     [ full-width search .................. ]
 *  tablet (768-1023): [menu] [logo] [ search ] [account] [cart]
 *  desktop (>= 1024): top bar + [logo] [ search ] [help] [account] [cart]
 *                     [All Categories] Home Shop About Contact
 */
export default function Header() {
  const { tagline, contact } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const { cart, openDrawer } = useCart()
  const cartCount = cart.count

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        {/* Top bar (desktop only) */}
        <div className="hidden bg-primary text-white lg:block">
          <div className="container-page flex h-9 items-center justify-between text-xs">
            <p className="font-medium tracking-wide">{tagline}</p>
            <div className="flex items-center gap-5">
              {contact?.phone ? (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-accent">
                  <Icon name="phone" className="size-3.5" />
                  {formatPhone(contact.phone)}
                </a>
              ) : null}
              {contact?.email ? (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-accent">
                  <Icon name="mail" className="size-3.5" />
                  {contact.email}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main row */}
        <div className="container-page flex h-16 items-center gap-2 sm:gap-3 lg:h-20 lg:gap-6">
          <button
            type="button"
            className="icon-btn -ml-2 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Icon name="menu" className="size-6" />
          </button>

          <Logo className="mr-auto md:mr-0 md:shrink-0" />

          <SearchForm id="search-desktop" className="mx-auto hidden min-w-0 max-w-xl flex-1 md:flex" />

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 md:ml-auto lg:ml-0">
            <Link to="/contact" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium hover:text-primary xl:flex">
              <Icon name="chat" />
              Help
            </Link>
            <Link to="/login" className="icon-btn sm:w-auto sm:gap-2 sm:px-3" aria-label="My account">
              <Icon name="user" />
              <span className="hidden text-sm font-medium sm:inline">Account</span>
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              className="icon-btn relative -mr-2 sm:mr-0 sm:w-auto sm:gap-2 sm:px-3"
              aria-label={`Open cart, ${cartCount} items`}
            >
              <span className="relative">
                <Icon name="cart" className="size-6" />
                <span className="absolute -right-2 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-5 text-ink">
                  {cartCount}
                </span>
              </span>
              <span className="hidden text-sm font-medium sm:inline">Cart</span>
            </button>
          </div>
        </div>

        {/* Phone: search on its own full-width row */}
        <div className="container-page pb-3 md:hidden">
          <SearchForm id="search-mobile" />
        </div>

        {/* Desktop navigation row */}
        <div className="hidden border-t border-line lg:block">
          <nav aria-label="Main navigation" className="container-page flex h-14 items-center gap-8">
            <CategoryMenu />
            <ul className="flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `relative py-2 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:transition-transform ${
                        isActive
                          ? 'text-primary after:scale-x-100 after:bg-accent'
                          : 'text-ink hover:text-primary after:scale-x-0 after:bg-accent'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </>
  )
}

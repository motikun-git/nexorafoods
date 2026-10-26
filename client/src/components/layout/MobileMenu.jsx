import { NavLink, useSearchParams } from 'react-router'
import { useCategories } from '../../context/CategoriesContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatPhone } from '../../lib/format.js'
import Drawer from '../ui/Drawer.jsx'
import Icon from '../ui/Icon.jsx'
import CategoryTree from './CategoryTree.jsx'
import { NAV_LINKS } from './navLinks.js'

// Mobile / tablet menu: same destinations as the desktop header.
export default function MobileMenu({ open, onClose }) {
  const { tree, loading, error, reload } = useCategories()
  const { contact } = useSettings()
  const [params] = useSearchParams()

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Menu"
      side="left"
      footer={
        contact?.phone ? (
          <a href={`tel:${contact.phone}`} className="btn-outline w-full">
            <Icon name="phone" className="size-4" />
            Call {formatPhone(contact.phone)}
          </a>
        ) : null
      }
    >
      <nav aria-label="Mobile navigation" className="p-3">
        <ul className="grid grid-cols-2 gap-2">
          {[...NAV_LINKS, { to: '/login', label: 'My Account' }, { to: '/cart', label: 'Cart' }].map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors ${
                    isActive ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink hover:border-primary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="mobile-categories" className="border-t border-line p-3">
        <h3 id="mobile-categories" className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-muted">
          Categories
        </h3>
        {loading ? <p className="px-3 text-sm text-muted">Loading…</p> : null}
        {error ? (
          <button type="button" onClick={reload} className="px-3 text-sm font-semibold text-primary underline">
            Couldn&apos;t load categories. Try again
          </button>
        ) : null}
        <CategoryTree nodes={tree} activeSlug={params.get('category')} onNavigate={onClose} />
      </section>
    </Drawer>
  )
}

import { Link } from 'react-router'
import { useCategories } from '../../context/CategoriesContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatPhone } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'
import Logo from '../ui/Logo.jsx'
import { categoryLink } from './CategoryMenu.jsx'
import { NAV_LINKS } from './navLinks.js'

const SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' }

export default function Footer() {
  const { storeName, description, contact = {}, socials = {} } = useSettings()
  const { tree } = useCategories()
  const socialLinks = Object.entries(socials).filter(([key, url]) => url && SOCIAL_LABELS[key])
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 bg-primary-dark text-white/80">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr] lg:gap-8">
        <div>
          <div className="inline-flex rounded-2xl bg-white px-3 py-2">
            <Logo />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{description}</p>
          {socialLinks.length ? (
            <>
              <h3 className="mt-6 text-sm font-bold text-white">Follow us</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {socialLinks.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/20 px-3.5 text-sm text-white transition-colors hover:border-accent hover:text-accent"
                    >
                      {SOCIAL_LABELS[key]}
                      <Icon name="external" className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Quick links</h3>
          <ul className="mt-4 space-y-1">
            {[...NAV_LINKS, { to: '/login', label: 'My account' }].map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-flex min-h-9 items-center text-sm hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Popular categories</h3>
          <ul className="mt-4 space-y-1">
            {tree.slice(0, 6).map((category) => (
              <li key={category._id}>
                <Link to={categoryLink(category.slug)} className="inline-flex min-h-9 items-center text-sm hover:text-accent">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Contact information</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {contact.phone ? (
              <li>
                <a href={`tel:${contact.phone}`} className="flex items-start gap-3 hover:text-accent">
                  <Icon name="phone" className="mt-0.5 size-4 shrink-0" />
                  {formatPhone(contact.phone)}
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li>
                <a href={`mailto:${contact.email}`} className="flex items-start gap-3 break-all hover:text-accent">
                  <Icon name="mail" className="mt-0.5 size-4 shrink-0" />
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact.website ? (
              <li>
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-accent">
                  <Icon name="globe" className="mt-0.5 size-4 shrink-0" />
                  {contact.website.replace(/^https?:\/\//, '')}
                </a>
              </li>
            ) : null}
            {contact.address ? (
              <li className="flex items-start gap-3">
                <Icon name="pin" className="mt-0.5 size-4 shrink-0" />
                <span>
                  {contact.address}
                  {contact.mapUrl ? (
                    <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block font-semibold text-accent hover:underline">
                      Open in Google Maps
                    </a>
                  ) : null}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="container-page py-5 text-center text-xs text-white/60">
          © {year} {storeName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

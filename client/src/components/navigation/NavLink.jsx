'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/*
 * A link that knows when it points to the current page (for menus).
 *   <NavLink href="/shop" className={({ isActive }) => ...}>Shop</NavLink>
 * "end" = only the exact address counts (used for "/", the home page).
 */
export default function NavLink({ href, end = false, className, children, ...rest }) {
  const pathname = usePathname()
  const isActive = end || href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link href={href} className={typeof className === 'function' ? className({ isActive }) : className} aria-current={isActive ? 'page' : undefined} {...rest}>
      {children}
    </Link>
  )
}

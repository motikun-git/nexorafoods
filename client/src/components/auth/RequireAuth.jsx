'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Redirect from '../navigation/Redirect.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import Spinner from '../ui/Spinner.jsx'

/*
 * Wrap a page that needs a logged-in customer. Guests are sent to the
 * login page and come back here afterwards (?next=...).
 * The server checks the login again for every request - this only
 * improves the experience.
 */
export default function RequireAuth({ children, reason }) {
  const { user, ready } = useAuth()
  const pathname = usePathname()
  const search = useSearchParams().toString()

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner label="Checking your account" />
      </div>
    )
  }

  if (!user) {
    const next = encodeURIComponent(pathname + (search ? `?${search}` : ''))
    return <Redirect to={`/login?next=${next}${reason ? `&reason=${reason}` : ''}`} />
  }

  return children
}

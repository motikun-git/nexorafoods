import { Navigate, useLocation } from 'react-router'
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
  const location = useLocation()

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner label="Checking your account" />
      </div>
    )
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}${reason ? `&reason=${reason}` : ''}`} replace />
  }

  return children
}

import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../../context/AuthContext.jsx'
import Spinner from '../ui/Spinner.jsx'

/*
 * Admin pages: guests go to login, customers see "no access".
 * The SERVER checks admin rights again on every request - this wrapper
 * only decides what to show in the browser.
 */
export default function RequireAdmin({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner label="Checking your account" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (user.role !== 'admin') {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-extrabold">No access</h1>
          <p className="mt-2 text-muted">This area is only for store administrators.</p>
          <Link to="/" className="btn-primary mt-6">
            Back to store
          </Link>
        </div>
      </div>
    )
  }
  return children
}

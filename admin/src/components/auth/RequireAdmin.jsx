import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../context/AuthContext.jsx'
import { storeUrl } from '../../lib/storeUrl.js'
import Spinner from '../ui/Spinner.jsx'

/*
 * Admin pages: guests go to login, customers see "no access".
 * The SERVER checks admin rights again on every request - this wrapper
 * only decides what to show in the browser.
 */
export default function RequireAdmin({ children }) {
  const { user, ready, logout } = useAuth()
  const location = useLocation()
  const [switchingAccount, setSwitchingAccount] = useState(false)

  // Logging out sends the person to the admin login (the guest branch below).
  async function onSwitchAccount() {
    setSwitchingAccount(true)
    try {
      await logout()
    } finally {
      setSwitchingAccount(false)
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner label="Checking your account" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (user.role !== 'admin') {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-extrabold">No access</h1>
          <p className="mt-2 text-muted">This area is only for store administrators.</p>
          <p className="mt-1 text-sm text-muted">
            You are logged in as <span className="font-semibold text-ink">{user.email}</span>.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onSwitchAccount} disabled={switchingAccount} className="btn-primary">
              {switchingAccount ? 'Logging out…' : 'Log in with another account'}
            </button>
            <a href={storeUrl('/')} className="btn-outline">
              Back to store
            </a>
          </div>
        </div>
      </div>
    )
  }
  return children
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Icon from '../components/ui/Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// "My account": profile details. Order history is added with checkout.
export default function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  async function onLogout() {
    setLoggingOut(true)
    // Leave this protected page first; otherwise the "please log in"
    // redirect would run as soon as the user is logged out.
    navigate('/', { replace: true })
    await logout()
  }

  return (
    <section className="container-page py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My account</h1>
      <p className="mt-1 text-muted">Hello, {user.name.split(' ')[0]}!</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-line bg-white p-6">
          <span className="grid size-16 place-items-center rounded-full bg-primary text-2xl font-extrabold text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <h2 className="mt-4 text-lg font-bold">{user.name}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt>
                <Icon name="mail" className="size-4 text-muted" />
                <span className="sr-only">Email</span>
              </dt>
              <dd className="break-all">{user.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt>
                <Icon name="phone" className="size-4 text-muted" />
                <span className="sr-only">Mobile</span>
              </dt>
              <dd>{user.phone}</dd>
            </div>
          </dl>
          <button type="button" onClick={onLogout} disabled={loggingOut} className="btn-outline mt-6 w-full">
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-bold">My orders</h2>
          <p className="mt-2 text-sm text-muted">Your orders will appear here after checkout.</p>
          <Link to="/shop" className="btn-primary mt-6">
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  )
}

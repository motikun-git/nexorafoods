import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Icon from '../components/ui/Icon.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { formatPrice } from '../lib/format.js'
import { StatusBadge, formatDate } from '../lib/orders.jsx'

// "My account": profile details and order history.
export default function AccountPage() {
  const { user, logout } = useAuth()
  const { currency } = useSettings()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [page, setPage] = useState(1)
  const orders = useApi(`/orders?page=${page}`)
  const list = orders.data?.data || []
  const pagination = orders.data?.pagination

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
        <div className="self-start rounded-2xl border border-line bg-white p-6">
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

        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">My orders</h2>

          {orders.loading && !orders.data ? <Spinner className="mt-4" label="Loading orders" /> : null}
          {orders.error ? (
            <p className="mt-3 text-sm text-red-600">
              Orders could not be loaded.{' '}
              <button type="button" onClick={orders.reload} className="font-semibold underline">
                Try again
              </button>
            </p>
          ) : null}

          {orders.data && list.length === 0 ? (
            <div className="mt-4">
              <p className="text-sm text-muted">You haven’t placed any orders yet.</p>
              <Link to="/shop" className="btn-primary mt-4">
                Start shopping
              </Link>
            </div>
          ) : null}

          {list.length ? (
            <ul className="mt-4 divide-y divide-line">
              {list.map((order) => (
                <li key={order._id}>
                  <Link
                    to={`/orders/${order.orderNumber}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-cream"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {formatDate(order.createdAt)} · {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-bold">
                      {formatPrice(order.total, currency)}
                      <Icon name="chevronRight" className="size-4 text-muted" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Newer
              </button>
              <span className="text-muted">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Older
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router'
import Spinner from '../../components/ui/Spinner.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import { formatPrice } from '../../lib/format.js'
import { StatusBadge, formatDate } from '../../lib/orders.jsx'

function Stat({ label, value, hint, to, tone = 'text-ink' }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold sm:text-3xl ${tone}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  )
  const className = 'block rounded-2xl border border-line bg-white p-4 sm:p-5'
  return to ? (
    <Link to={to} className={`${className} transition hover:border-primary hover:shadow-card`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

export default function AdminDashboard() {
  const { data, error, loading, reload } = useApi('/admin/summary')
  const { currency } = useSettings()
  const s = data?.data

  if (loading && !s) return <Spinner label="Loading dashboard" />
  if (error) {
    return (
      <p className="text-red-600">
        {error.message}{' '}
        <button type="button" className="font-semibold underline" onClick={reload}>
          Try again
        </button>
      </p>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="New orders (pending)" value={s.statusCounts.pending || 0} to="/admin/orders?status=pending" tone="text-accent-dark" />
        <Stat label="Open orders" value={s.openOrders} hint="Not yet delivered" to="/admin/orders" />
        <Stat label="Orders today" value={s.ordersToday} />
        <Stat
          label="Delivered sales (30 days)"
          value={formatPrice(s.deliveredRevenue30Days, currency)}
          hint={`${s.deliveredOrders30Days} delivered orders · not profit`}
          tone="text-primary"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          {s.recentOrders.length === 0 ? <p className="mt-3 text-sm text-muted">No orders yet.</p> : null}
          <ul className="mt-2 divide-y divide-line">
            {s.recentOrders.map((order) => (
              <li key={order._id}>
                <Link to={`/admin/orders/${order.orderNumber}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                  <span className="min-w-0">
                    <span className="block font-semibold">{order.orderNumber}</span>
                    <span className="block truncate text-xs text-muted">
                      {order.shipping?.name} · {formatDate(order.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold">{formatPrice(order.total, currency)}</span>
                    <StatusBadge status={order.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Stock alerts</h2>
            <Link to="/admin/products?stock=low" className="text-sm font-semibold text-primary hover:underline">
              Manage stock
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            {s.outOfStockCount} out of stock · {s.lowStock.length} running low (≤ {s.lowStockThreshold}) · {s.productCount} products in total
          </p>
          <ul className="mt-2 divide-y divide-line">
            {s.lowStock.map((p) => (
              <li key={p._id} className="flex justify-between py-2.5 text-sm">
                <span className="truncate">{p.name}</span>
                <span className="font-bold text-accent-dark">
                  {p.stock} {p.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Pagination from '../../components/shop/Pagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import { formatPrice } from '../../lib/format.js'
import { ORDER_STATUS, StatusBadge, formatDate } from '../../lib/orders.jsx'

const TABS = ['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [params, setParams] = useSearchParams()
  const { currency } = useSettings()
  const [search, setSearch] = useState(params.get('search') || '')
  useEffect(() => setSearch(params.get('search') || ''), [params])

  const query = new URLSearchParams()
  for (const key of ['status', 'search', 'page']) if (params.get(key)) query.set(key, params.get(key))
  const { data, error, loading, reload } = useApi(`/admin/orders?${query}`)
  const orders = data?.data || []
  const counts = data?.statusCounts || {}
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  function update(changes) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k))
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Orders</h1>

      {/* Status tabs (scroll sideways on phones) */}
      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((status) => {
          const active = (params.get('status') || '') === status
          return (
            <button
              key={status || 'all'}
              type="button"
              onClick={() => update({ status })}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                active ? 'border-primary bg-primary text-white' : 'border-line bg-white hover:border-primary'
              }`}
            >
              {status ? ORDER_STATUS[status].label : 'All'} ({status ? counts[status] || 0 : total})
            </button>
          )
        })}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          update({ search: search.trim() })
        }}
      >
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <input
          id="order-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Order number, phone or name"
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-white px-4 text-base sm:text-sm"
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      <div className="mt-5">
        {loading && !data ? <Spinner label="Loading orders" /> : null}
        {error ? (
          <p className="text-red-600">
            {error.message}{' '}
            <button type="button" onClick={reload} className="underline">
              Try again
            </button>
          </p>
        ) : null}
        {data && orders.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">No orders found.</p> : null}

        {orders.length ? (
          <ul className="overflow-hidden rounded-2xl border border-line bg-white">
            {orders.map((order) => (
              <li key={order._id} className="border-b border-line last:border-0">
                <Link
                  to={`/admin/orders/${order.orderNumber}`}
                  className="grid gap-1 p-4 transition-colors hover:bg-cream sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:items-center sm:gap-4"
                >
                  <span>
                    <span className="block font-bold">{order.orderNumber}</span>
                    <span className="text-xs text-muted">{formatDate(order.createdAt)}</span>
                  </span>
                  <span className="text-sm">
                    {order.shipping.name} · <span className="text-muted">{order.shipping.phone}</span>
                  </span>
                  <span className="text-sm font-bold">
                    {formatPrice(order.total, currency)}{' '}
                    <span className="font-normal text-muted">· {order.items.reduce((n, i) => n + i.quantity, 0)} items</span>
                  </span>
                  <span>
                    <StatusBadge status={order.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {data?.pagination ? (
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(page) => update({ page: String(page) })} />
        ) : null}
      </div>
    </div>
  )
}

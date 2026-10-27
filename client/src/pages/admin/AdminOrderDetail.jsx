import { useState } from 'react'
import { Link, useParams } from 'react-router'
import Spinner from '../../components/ui/Spinner.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import { apiRequest } from '../../lib/api.js'
import { formatPrice } from '../../lib/format.js'
import { AREA_LABEL, ORDER_STATUS, StatusBadge, formatDate } from '../../lib/orders.jsx'

// Button text for each possible next status.
const ACTION_LABEL = {
  confirmed: 'Confirm order',
  processing: 'Start packing',
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered (paid)',
  cancelled: 'Cancel order',
}

export default function AdminOrderDetail() {
  const { orderNumber } = useParams()
  const { data, error, loading } = useApi(`/admin/orders/${encodeURIComponent(orderNumber)}`)
  const { currency } = useSettings()
  const { notify } = useCart()
  const [order, setOrder] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const current = order || data?.data
  if (loading && !current) return <Spinner label="Loading order" />
  if (error) {
    return (
      <div>
        <p className="text-red-600">{error.message}</p>
        <Link to="/admin/orders" className="btn-outline mt-4">
          Back to orders
        </Link>
      </div>
    )
  }

  async function changeStatus(status) {
    if (status === 'cancelled' && !confirmCancel) {
      setConfirmCancel(true)
      return
    }
    setSaving(status)
    try {
      const body = await apiRequest(`/admin/orders/${current.orderNumber}/status`, {
        method: 'PATCH',
        body: { status, note },
      })
      setOrder(body.data)
      setNote('')
      setConfirmCancel(false)
      notify(`Order ${ORDER_STATUS[status].label.toLowerCase()}`, 'success')
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(null)
    }
  }

  const next = current.allowedNextStatuses || []

  return (
    <div className="max-w-5xl">
      <Link to="/admin/orders" className="text-sm font-semibold text-primary hover:underline">
        ← All orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{current.orderNumber}</h1>
        <StatusBadge status={current.status} />
        <span className="text-sm text-muted">{formatDate(current.createdAt)}</span>
      </div>

      {/* Actions */}
      {next.length ? (
        <section className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-5">
          <h2 className="font-bold">Update status</h2>
          <label htmlFor="status-note" className="mt-3 block text-sm font-medium">
            Note (optional, saved in the history)
          </label>
          <input
            id="status-note"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Sent with Pathao, tracking 12345"
            className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-base sm:text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {next.map((status) => (
              <button
                key={status}
                type="button"
                disabled={Boolean(saving)}
                onClick={() => changeStatus(status)}
                className={status === 'cancelled' ? 'btn-outline hover:border-red-500 hover:text-red-600' : 'btn-primary'}
              >
                {saving === status ? 'Saving…' : ACTION_LABEL[status]}
              </button>
            ))}
          </div>
          {confirmCancel ? (
            <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Cancel this order? The stock will be returned.
              <button type="button" className="btn bg-red-600 text-white hover:bg-red-700" onClick={() => changeStatus('cancelled')}>
                Yes, cancel
              </button>
              <button type="button" className="font-semibold underline" onClick={() => setConfirmCancel(false)}>
                Keep order
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          <h2 className="font-bold">Items</h2>
          <ul className="mt-2 divide-y divide-line">
            {current.items.map((item) => (
              <li key={item.product} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-xs text-muted">
                    {item.quantity} × {formatPrice(item.finalPrice, currency)} / {item.unit}
                  </span>
                </span>
                <span className="font-semibold">{formatPrice(item.lineTotal, currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatPrice(current.subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd>{formatPrice(current.deliveryCharge, currency)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Total ({current.paymentStatus === 'paid' ? 'paid' : 'cash on delivery'})</dt>
              <dd className="text-primary">{formatPrice(current.total, currency)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-4 text-sm sm:p-5">
            <h2 className="font-bold">Deliver to</h2>
            <p className="mt-2 font-medium">{current.shipping.name}</p>
            <a href={`tel:${current.shipping.phone}`} className="font-semibold text-primary underline">
              {current.shipping.phone}
            </a>
            <p className="mt-2">{current.shipping.addressLine}</p>
            <p className="text-muted">
              {current.shipping.city} · {AREA_LABEL[current.shipping.area]}
            </p>
            {current.shipping.note ? <p className="mt-2 rounded-lg bg-accent-soft p-2">Note: {current.shipping.note}</p> : null}
            {current.user ? (
              <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                Account: {current.user.name} · {current.user.email}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-white p-4 text-sm sm:p-5">
            <h2 className="font-bold">History</h2>
            <ol className="mt-2 space-y-2">
              {[...current.statusHistory].reverse().map((entry, i) => (
                <li key={i}>
                  <StatusBadge status={entry.status} />
                  <span className="ml-2 text-xs text-muted">{formatDate(entry.at)}</span>
                  {entry.note ? <p className="mt-0.5 text-xs">{entry.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}

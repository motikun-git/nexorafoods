import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import Icon from '../components/ui/Icon.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { apiRequest } from '../lib/api.js'
import { formatPrice } from '../lib/format.js'
import { AREA_LABEL, ORDER_STATUS, ORDER_STEPS, StatusBadge, formatDate } from '../lib/orders.jsx'

// One order: confirmation after checkout, and details from "My orders".
export default function OrderPage() {
  const { orderNumber } = useParams()
  const [params] = useSearchParams()
  const justPlaced = params.get('placed') === '1'
  const { data, error, loading } = useApi(`/orders/${encodeURIComponent(orderNumber)}`)
  const { currency } = useSettings()
  const [order, setOrder] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const current = order || data?.data

  if (loading && !current) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner label="Loading order" />
      </div>
    )
  }

  if (error) {
    return (
      <section className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold">Order not found</h1>
        <p className="mt-2 text-muted">{error.status === 404 ? 'We couldn’t find this order in your account.' : error.message}</p>
        <Link to="/account" className="btn-primary mt-6">
          My orders
        </Link>
      </section>
    )
  }

  async function cancelOrder() {
    if (!window.confirm('Cancel this order?')) return
    setCancelling(true)
    setCancelError('')
    try {
      const body = await apiRequest(`/orders/${current.orderNumber}/cancel`, { method: 'POST' })
      setOrder(body.data)
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const stepIndex = ORDER_STEPS.indexOf(current.status)
  const cancelled = current.status === 'cancelled'

  return (
    <div className="container-page max-w-4xl py-6 sm:py-10">
      {justPlaced ? (
        <div className="mb-8 rounded-3xl bg-primary px-6 py-8 text-center text-white sm:py-10">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-primary">
            <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Thank you! Your order is placed.</h1>
          <p className="mt-2 text-white/85">
            Order number <strong className="text-white">{current.orderNumber}</strong>. We will call you to confirm the delivery.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!justPlaced ? <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Order {current.orderNumber}</h1> : null}
          <p className="mt-1 text-sm text-muted">Placed on {formatDate(current.createdAt)}</p>
        </div>
        <StatusBadge status={current.status} />
      </div>

      {/* Progress */}
      {!cancelled ? (
        <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Order progress">
          {ORDER_STEPS.map((step, i) => {
            const done = i <= stepIndex
            return (
              <li key={step} className="text-center">
                <span className={`block h-1.5 rounded-full ${done ? 'bg-primary' : 'bg-line'}`} />
                <span className={`mt-2 block text-[11px] sm:text-xs ${done ? 'font-semibold text-primary' : 'text-muted'}`}>
                  {ORDER_STATUS[step].label}
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">This order was cancelled.</p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="items-title" className="rounded-2xl border border-line bg-white p-5">
          <h2 id="items-title" className="font-bold">
            Items
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {current.items.map((item) => (
              <li key={item.product} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <Link to={`/product/${item.slug}`} className="block truncate font-medium hover:text-primary">
                    {item.name}
                  </Link>
                  <span className="text-xs text-muted">
                    {item.quantity} × {formatPrice(item.finalPrice, currency)} / {item.unit}
                  </span>
                </span>
                <span className="shrink-0 font-semibold">{formatPrice(item.lineTotal, currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatPrice(current.subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd>{current.deliveryCharge === 0 ? 'Free' : formatPrice(current.deliveryCharge, currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="text-primary">{formatPrice(current.total, currency)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="ship-title" className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h2 id="ship-title" className="font-bold">
              Delivery
            </h2>
            <p className="mt-2 font-medium">{current.shipping.name}</p>
            <p className="text-muted">{current.shipping.phone}</p>
            <p className="mt-2">{current.shipping.addressLine}</p>
            <p className="text-muted">
              {current.shipping.city} · {AREA_LABEL[current.shipping.area]}
            </p>
            {current.shipping.note ? <p className="mt-2 text-xs text-muted">Note: {current.shipping.note}</p> : null}
          </section>

          <section aria-labelledby="pay-title" className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h2 id="pay-title" className="font-bold">
              Payment
            </h2>
            <p className="mt-2">Cash on Delivery</p>
            <p className="text-muted">{current.paymentStatus === 'paid' ? 'Paid' : `Pay ${formatPrice(current.total, currency)} on delivery`}</p>
          </section>

          {current.status === 'pending' ? (
            <div>
              <button type="button" onClick={cancelOrder} disabled={cancelling} className="btn-outline w-full hover:border-red-500 hover:text-red-600">
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
              {cancelError ? <p className="mt-2 text-sm text-red-600">{cancelError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/shop" className="btn-primary">
          Continue shopping
          <Icon name="arrowRight" className="size-4" />
        </Link>
        <Link to="/account" className="btn-outline">
          My orders
        </Link>
      </div>
    </div>
  )
}

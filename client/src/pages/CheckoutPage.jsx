import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import FormField from '../components/ui/FormField.jsx'
import Icon from '../components/ui/Icon.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { apiRequest } from '../lib/api.js'
import { formatPrice } from '../lib/format.js'

function newCheckoutKey() {
  return crypto.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random().toString(36).slice(2)}`
}

function validate(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Enter the receiver’s name.'
  const phone = form.phone.replace(/\D/g, '').replace(/^880/, '0')
  if (!/^01[3-9]\d{8}$/.test(phone)) errors.phone = 'Enter an 11-digit mobile number starting with 01.'
  if (form.city.trim().length < 2) errors.city = 'Enter your city or district.'
  if (form.addressLine.trim().length < 5) errors.addressLine = 'Enter the full delivery address.'
  return errors
}

export default function CheckoutPage() {
  const { user } = useAuth()
  const { cart, loaded, refresh } = useCart()
  const { currency, delivery = {}, payments = {} } = useSettings()
  const navigate = useNavigate()

  // One key per visit to this page: if "Place order" is sent twice
  // (double click, slow network), the server creates only one order.
  const [checkoutKey] = useState(newCheckoutKey)
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone,
    area: 'inside_dhaka',
    city: 'Dhaka',
    addressLine: '',
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [placing, setPlacing] = useState(false)

  const deliveryCharge = useMemo(() => {
    if (delivery.freeDeliveryAbove != null && cart.subtotal >= delivery.freeDeliveryAbove) return 0
    return form.area === 'inside_dhaka' ? delivery.insideDhaka : delivery.outsideDhaka
  }, [form.area, cart.subtotal, delivery])

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  async function placeOrder(event) {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }

    setPlacing(true)
    setServerError(null)
    try {
      const body = await apiRequest('/orders', {
        method: 'POST',
        body: { shipping: form, paymentMethod: 'cod', idempotencyKey: checkoutKey },
      })
      await refresh() // the cart is now empty
      navigate(`/orders/${body.data.orderNumber}?placed=1`, { replace: true })
    } catch (error) {
      setServerError(error)
      if (error.status === 409) refresh() // show the updated cart
      setPlacing(false)
    }
  }

  if (!loaded) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner label="Loading your cart" />
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <section className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-muted">Add some products before checking out.</p>
        <Link to="/shop" className="btn-primary mt-6">
          Go to shop
        </Link>
      </section>
    )
  }

  const total = cart.subtotal + deliveryCharge

  return (
    <div className="container-page py-6 sm:py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Checkout</h1>

      <form onSubmit={placeOrder} noValidate className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div className="space-y-6">
          {/* Delivery details */}
          <section aria-labelledby="delivery-title" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 id="delivery-title" className="text-lg font-bold">
              Delivery details
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField label="Receiver’s name" autoComplete="name" value={form.name} onChange={update('name')} error={errors.name} />
              <FormField
                label="Mobile number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={update('phone')}
                error={errors.phone}
              />
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold">Delivery area</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: 'inside_dhaka', label: 'Inside Dhaka', charge: delivery.insideDhaka },
                  { value: 'outside_dhaka', label: 'Outside Dhaka', charge: delivery.outsideDhaka },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 transition-colors ${
                      form.area === option.value ? 'border-primary bg-primary-soft' : 'border-line hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="area"
                      value={option.value}
                      checked={form.area === option.value}
                      onChange={update('area')}
                      className="size-5 accent-[var(--brand-primary)]"
                    />
                    <span className="flex-1 font-semibold">{option.label}</span>
                    <span className="text-sm text-muted">{formatPrice(option.charge, currency)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 grid gap-4">
              <FormField
                label="City / district"
                autoComplete="address-level2"
                value={form.city}
                onChange={update('city')}
                error={errors.city}
              />
              <FormField
                label="Full address"
                autoComplete="street-address"
                placeholder="House, road, area, landmark"
                value={form.addressLine}
                onChange={update('addressLine')}
                error={errors.addressLine}
              />
              <FormField
                label="Delivery note (optional)"
                placeholder="e.g. Call before coming"
                maxLength={300}
                value={form.note}
                onChange={update('note')}
              />
            </div>
          </section>

          {/* Payment */}
          <section aria-labelledby="payment-title" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 id="payment-title" className="text-lg font-bold">
              Payment method
            </h2>
            {payments.cashOnDelivery ? (
              <label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4">
                <input type="radio" name="payment" checked readOnly className="size-5 accent-[var(--brand-primary)]" />
                <span className="flex-1">
                  <span className="block font-semibold">Cash on Delivery</span>
                  <span className="block text-xs text-muted">Pay when you receive your order.</span>
                </span>
              </label>
            ) : (
              <p className="mt-3 text-sm text-red-600">No payment method is available right now.</p>
            )}
            <p className="mt-3 text-xs text-muted">Online payment (bKash, Nagad, card) is coming soon.</p>
          </section>
        </div>

        {/* Order summary */}
        <aside aria-labelledby="summary-title" className="lg:sticky lg:top-44 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 id="summary-title" className="text-lg font-bold">
              Order summary
            </h2>
            <ul className="mt-4 max-h-72 divide-y divide-line overflow-y-auto">
              {cart.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="text-xs text-muted">
                      {item.quantity} × {formatPrice(item.finalPrice, currency)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatPrice(item.lineTotal, currency)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal ({cart.count} items)</dt>
                <dd className="font-semibold">{formatPrice(cart.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="font-semibold">{deliveryCharge === 0 ? 'Free' : formatPrice(deliveryCharge, currency)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="text-xl font-extrabold text-primary">{formatPrice(total, currency)}</dd>
              </div>
            </dl>

            {serverError ? (
              <div role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">{serverError.message}</p>
                {serverError.details?.problems?.length ? (
                  <ul className="mt-1 list-disc pl-5">
                    {serverError.details.problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <button type="submit" disabled={placing || !payments.cashOnDelivery} className="btn-primary mt-5 h-12 w-full text-base">
              {placing ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Placing order…
                </>
              ) : (
                <>
                  <Icon name="shield" className="size-5" />
                  Place order · {formatPrice(total, currency)}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-muted">Prices and stock are checked again when you place the order.</p>
          </div>
        </aside>
      </form>
    </div>
  )
}

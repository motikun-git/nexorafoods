import { Link } from 'react-router'
import { useCart } from '../../context/CartContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatPrice } from '../../lib/format.js'
import Drawer from '../ui/Drawer.jsx'
import Icon from '../ui/Icon.jsx'
import QuantityStepper from './QuantityStepper.jsx'

// Slide-in cart from the right: change quantities, remove items, see total.
export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, setQuantity, removeItem, pending } = useCart()
  const { currency } = useSettings()
  const empty = cart.items.length === 0

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      side="right"
      title={`Your cart (${cart.count})`}
      widthClass="w-full max-w-md"
      footer={
        empty ? null : (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Subtotal</span>
              <span className="text-xl font-extrabold">{formatPrice(cart.subtotal, currency)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Delivery charge is calculated at checkout.</p>
            <Link to="/checkout" onClick={closeDrawer} className="btn-primary mt-4 h-12 w-full text-base">
              Proceed to checkout
              <Icon name="arrowRight" className="size-5" />
            </Link>
            <button type="button" onClick={closeDrawer} className="mt-2 w-full py-2 text-sm font-semibold text-primary hover:underline">
              Continue shopping
            </button>
          </div>
        )
      }
    >
      {empty ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
            <Icon name="cart" className="size-9" />
          </span>
          <h3 className="mt-4 text-lg font-bold">Your cart is empty</h3>
          <p className="mt-1 text-sm text-muted">Add some products and they will appear here.</p>
          <Link to="/shop" onClick={closeDrawer} className="btn-primary mt-6">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {cart.items.map((item) => {
            const busy = Boolean(pending[item.productId])
            return (
              <li key={item.productId} className={`flex gap-3 p-4 transition-opacity ${busy ? 'opacity-60' : ''}`}>
                <Link
                  to={`/product/${item.slug}`}
                  onClick={closeDrawer}
                  className="grid size-18 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {item.image ? (
                    <img src={item.image} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-xl font-extrabold text-primary">{item.name.charAt(0)}</span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/product/${item.slug}`}
                        onClick={closeDrawer}
                        className="line-clamp-2 text-sm font-semibold hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {formatPrice(item.finalPrice, currency)} / {item.unit}
                        {item.finalPrice < item.price ? (
                          <del className="ml-1">{formatPrice(item.price, currency)}</del>
                        ) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      disabled={busy}
                      className="-mr-2 -mt-2 grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <QuantityStepper
                      size="sm"
                      quantity={item.quantity}
                      max={item.maxQuantity}
                      label={item.name}
                      disabled={busy}
                      onChange={(next) => setQuantity(item.productId, next)}
                    />
                    <span className="text-sm font-bold">{formatPrice(item.lineTotal, currency)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}

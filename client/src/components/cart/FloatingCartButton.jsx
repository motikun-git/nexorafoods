import { useCart } from '../../context/CartContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatPrice } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'

// "View cart" pill fixed near the bottom-right corner. Opens the cart drawer.
export default function FloatingCartButton() {
  const { cart, openDrawer, drawerOpen } = useCart()
  const { currency } = useSettings()
  if (drawerOpen) return null

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`View cart, ${cart.count} items, ${formatPrice(cart.subtotal, currency)}`}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-3 rounded-full bg-primary py-2 pl-2 pr-5 text-white shadow-pop ring-4 ring-white/70 transition hover:-translate-y-0.5 hover:bg-primary-dark sm:right-6 sm:bottom-6"
    >
      <span className="relative grid size-11 place-items-center rounded-full bg-white/15">
        <Icon name="cart" className="size-6" />
        <span
          key={cart.count}
          className="absolute -right-1 -top-1 grid min-w-5 animate-[pop_300ms_ease-out] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-5 text-ink"
        >
          {cart.count}
        </span>
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-bold">View cart</span>
        <span className="block text-xs text-white/80">{formatPrice(cart.subtotal, currency)}</span>
      </span>
    </button>
  )
}

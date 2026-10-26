import { useCart } from '../../context/CartContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatPrice } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'

// Orange "View cart" pill fixed near the bottom-right corner. Opens the cart.
export default function FloatingCartButton() {
  const { cart, openDrawer, drawerOpen } = useCart()
  const { currency } = useSettings()
  if (drawerOpen) return null

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`View cart, ${cart.count} items, ${formatPrice(cart.subtotal, currency)}`}
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-3 rounded-full bg-accent py-2 pl-2 pr-5 text-ink shadow-pop ring-4 ring-white/80 transition hover:-translate-y-0.5 hover:bg-accent-dark hover:text-white sm:bottom-6 sm:right-6"
    >
      <span className="relative grid size-11 place-items-center rounded-full bg-white text-accent-dark">
        <Icon name="cart" className="size-6" />
        <span
          key={cart.count}
          className="absolute -right-1 -top-1 grid min-w-5 animate-[pop_300ms_ease-out] place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-white"
        >
          {cart.count}
        </span>
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-extrabold">View cart</span>
        <span className="block text-xs font-semibold opacity-80">{formatPrice(cart.subtotal, currency)}</span>
      </span>
    </button>
  )
}

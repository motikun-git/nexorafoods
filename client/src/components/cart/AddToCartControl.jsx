import { useCart } from '../../context/CartContext.jsx'
import Icon from '../ui/Icon.jsx'
import QuantityStepper from './QuantityStepper.jsx'

// "Add to cart" button that turns into a [-] qty [+] control once added.
export default function AddToCartControl({ product, className = '' }) {
  const { quantityOf, addItem, setQuantity, pending } = useCart()
  const quantity = quantityOf(product._id)
  const busy = Boolean(pending[product._id])
  const max = Math.min(product.stock ?? 0, 50)

  if (!product.inStock) {
    return (
      <button type="button" disabled className={`btn w-full cursor-not-allowed bg-line text-muted ${className}`}>
        Out of stock
      </button>
    )
  }

  if (quantity > 0) {
    return (
      <div className={`flex justify-center ${className}`}>
        <QuantityStepper
          quantity={quantity}
          max={max}
          label={product.name}
          disabled={busy}
          onChange={(next) => setQuantity(product._id, next)}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => addItem(product)}
      disabled={busy}
      className={`btn-primary w-full whitespace-nowrap px-3 ${className}`}
      aria-label={`Add ${product.name} to cart`}
    >
      {busy ? (
        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <Icon name="cart" className="hidden size-4.5 sm:block" />
      )}
      Add to cart
    </button>
  )
}

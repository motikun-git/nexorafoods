// [-]  2  [+]  - used on product cards and in the cart.
export default function QuantityStepper({ quantity, max, onChange, disabled, label, size = 'md' }) {
  const button =
    size === 'sm'
      ? 'size-8 text-base'
      : 'size-10 text-lg'

  return (
    <div
      className="relative inline-flex items-center justify-between rounded-full border border-primary/30 bg-white"
      role="group"
      aria-label={`Quantity of ${label}`}
    >
      <button
        type="button"
        className={`grid ${button} place-items-center rounded-full font-bold text-primary transition hover:bg-primary-soft disabled:opacity-40`}
        onClick={() => onChange(quantity - 1)}
        disabled={disabled}
        aria-label={quantity === 1 ? `Remove ${label}` : `Decrease ${label}`}
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className={`grid ${button} place-items-center rounded-full font-bold text-primary transition hover:bg-primary-soft disabled:opacity-40`}
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= max}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  )
}

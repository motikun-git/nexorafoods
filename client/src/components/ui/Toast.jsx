import { useCart } from '../../context/CartContext.jsx'

const STYLES = {
  success: 'bg-ink text-white',
  info: 'bg-ink text-white',
  warning: 'bg-accent text-ink',
  error: 'bg-red-600 text-white',
}

// Short message at the top of the screen (e.g. "Rice added to cart").
export default function Toast() {
  const { message, dismissMessage } = useCart()

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
      {message ? (
        <div
          key={message.id}
          className={`pointer-events-auto flex max-w-md animate-[toast_250ms_ease-out] items-center gap-3 rounded-full py-2 pl-5 pr-2 text-sm font-medium shadow-pop ${STYLES[message.type]}`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={dismissMessage} className="grid size-8 place-items-center rounded-full hover:bg-white/15" aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}

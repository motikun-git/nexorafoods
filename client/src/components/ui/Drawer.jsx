import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

/*
 * Accessible slide-in panel used for the mobile menu, the cart and the
 * shop filters.
 *  - closes with the X button, the dark overlay or the Escape key
 *  - stops the page behind it from scrolling while open
 *  - moves keyboard focus into the panel and back to the opener on close
 */
export default function Drawer({ open, onClose, side = 'left', title, children, footer, widthClass = 'w-[88vw] max-w-sm' }) {
  const panelRef = useRef(null)
  const openerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined

    openerRef.current = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector('[data-autofocus]')?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      if (openerRef.current?.isConnected) openerRef.current.focus?.()
    }
  }, [open])

  const sideClasses =
    side === 'left'
      ? `left-0 ${open ? 'translate-x-0' : '-translate-x-full'}`
      : `right-0 ${open ? 'translate-x-0' : 'translate-x-full'}`

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'visible' : 'invisible'}`} inert={!open}>
      <div
        className={`absolute inset-0 bg-ink/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 flex h-dvh flex-col bg-white shadow-pop transition-transform duration-300 ease-out ${widthClass} ${sideClasses}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" className="icon-btn" onClick={() => onCloseRef.current()} aria-label="Close" data-autofocus>
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </div>
    </div>
  )
}

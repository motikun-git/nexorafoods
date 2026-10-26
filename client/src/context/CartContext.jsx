/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../lib/api.js'

const EMPTY_CART = { items: [], count: 0, subtotal: 0, notices: [] }
const CartContext = createContext(null)

/*
 * One cart for the whole site. The server is the source of truth: every
 * action sends a request and the UI shows the cart the server returns
 * (so prices, stock and totals are always correct).
 */
export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY_CART)
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState({}) // productId -> true while saving
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [message, setMessage] = useState(null) // { text, type }
  const messageTimer = useRef(null)

  const notify = useCallback((text, type = 'info') => {
    clearTimeout(messageTimer.current)
    setMessage({ text, type, id: Date.now() })
    messageTimer.current = setTimeout(() => setMessage(null), 3500)
  }, [])

  const applyCart = useCallback(
    (data) => {
      setCart(data)
      if (data.notices?.length) notify(data.notices[0], 'warning')
    },
    [notify]
  )

  useEffect(() => {
    apiRequest('/cart')
      .then((body) => applyCart(body.data))
      .catch(() => {})
      .finally(() => setLoaded(true))
    return () => clearTimeout(messageTimer.current)
  }, [applyCart])

  // Runs one cart request for a product, ignoring double clicks.
  const run = useCallback(
    async (productId, request, successText) => {
      if (pending[productId]) return false
      setPending((p) => ({ ...p, [productId]: true }))
      try {
        const body = await request()
        applyCart(body.data)
        if (successText) notify(successText, 'success')
        return true
      } catch (error) {
        notify(error.message, 'error')
        return false
      } finally {
        setPending((p) => {
          const next = { ...p }
          delete next[productId]
          return next
        })
      }
    },
    [pending, applyCart, notify]
  )

  // Stable functions (same identity every render) so the drawer does not
  // re-run its focus logic whenever the cart changes.
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const value = useMemo(() => {
    const quantityOf = (productId) => cart.items.find((i) => i.productId === productId)?.quantity || 0
    return {
      cart,
      loaded,
      pending,
      message,
      drawerOpen,
      openDrawer,
      closeDrawer,
      quantityOf,
      addItem: (product, quantity = 1) =>
        run(
          product._id,
          () => apiRequest('/cart/items', { method: 'POST', body: { productId: product._id, quantity } }),
          `${product.name} added to cart`
        ),
      setQuantity: (productId, quantity) =>
        run(productId, () => apiRequest(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity } })),
      removeItem: (productId) => run(productId, () => apiRequest(`/cart/items/${productId}`, { method: 'DELETE' })),
      dismissMessage: () => setMessage(null),
    }
  }, [cart, loaded, pending, message, drawerOpen, openDrawer, closeDrawer, run])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart must be used inside <CartProvider>')
  return cart
}

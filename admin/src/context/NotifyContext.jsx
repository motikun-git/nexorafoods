/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const NotifyContext = createContext(null)

/*
 * Short messages at the top of the screen ("Product saved", errors...).
 * Same behaviour as the storefront's cart messages: one at a time,
 * hidden after 3.5 seconds.
 */
export function NotifyProvider({ children }) {
  const [message, setMessage] = useState(null) // { text, type, id }
  const messageTimer = useRef(null)

  const notify = useCallback((text, type = 'info') => {
    clearTimeout(messageTimer.current)
    setMessage({ text, type, id: Date.now() })
    messageTimer.current = setTimeout(() => setMessage(null), 3500)
  }, [])

  const dismissMessage = useCallback(() => {
    clearTimeout(messageTimer.current)
    setMessage(null)
  }, [])

  const value = useMemo(() => ({ message, notify, dismissMessage }), [message, notify, dismissMessage])
  return <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>
}

export function useNotify() {
  const notifyContext = useContext(NotifyContext)
  if (!notifyContext) throw new Error('useNotify must be used inside <NotifyProvider>')
  return notifyContext
}

/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../lib/api.js'

const AuthContext = createContext(null)

/*
 * Who is logged in. The login itself lives in an httpOnly cookie that
 * JavaScript cannot read, so we ask the server (/auth/me) on page load.
 * `version` changes on every login/logout so other parts (the cart)
 * know they must reload.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    apiRequest('/auth/me')
      .then((body) => setUser(body.data))
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (identifier, password) => {
    const body = await apiRequest('/auth/login', { method: 'POST', body: { identifier, password } })
    setUser(body.data)
    setVersion((v) => v + 1)
    return body.data
  }, [])

  const register = useCallback(async (form) => {
    const body = await apiRequest('/auth/register', { method: 'POST', body: form })
    setUser(body.data)
    setVersion((v) => v + 1)
    return body.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setVersion((v) => v + 1)
    }
  }, [])

  const value = useMemo(() => ({ user, ready, version, login, register, logout }), [user, ready, version, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}

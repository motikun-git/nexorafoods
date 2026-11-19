'use client'

import { createContext, useContext, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import Spinner from '../components/ui/Spinner.jsx'

const SettingsContext = createContext(null)

// Store Settings (name, colors, contact...). The server loads them while
// building the page; brand colors are also applied here when they change.
export function SettingsProvider({ children }) {
  const { data, error, loading, reload } = useApi('/settings')
  const settings = data?.data

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    if (settings.colors?.primary) root.style.setProperty('--brand-primary', settings.colors.primary)
    if (settings.colors?.accent) root.style.setProperty('--brand-accent', settings.colors.accent)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.colors?.primary)
    if (settings.favicon) document.querySelector('link[rel="icon"]')?.setAttribute('href', settings.favicon)
  }, [settings])

  if (loading && !settings) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner label="Loading store" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-bold">We couldn&apos;t load the store</h1>
          <p className="mt-2 text-muted">{error.message}</p>
          <button type="button" className="btn-primary mt-6" onClick={reload}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const settings = useContext(SettingsContext)
  if (!settings) throw new Error('useSettings must be used inside <SettingsProvider>')
  return settings
}

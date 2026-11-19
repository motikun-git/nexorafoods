'use client'

import { useCallback, useEffect, useState } from 'react'
import { useInitialData } from '../context/InitialDataContext.jsx'
import { apiGet } from '../lib/api.js'

/*
 * Loads data from the API and tracks loading / error state.
 *   const { data, error, loading, reload } = useApi('/home')
 * Pass null as the path to skip loading.
 * If the server already loaded this path (see InitialDataContext), the
 * page shows it straight away and does not ask the API again.
 */
export function useApi(path) {
  const initialData = useInitialData(path)
  const [state, setState] = useState(() =>
    initialData ? { data: initialData, error: null, loading: false } : { data: null, error: null, loading: Boolean(path) }
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    if (initialData && attempt === 0) {
      setState({ data: initialData, error: null, loading: false })
      return undefined
    }
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))

    apiGet(path, { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) setState({ data: body, error: null, loading: false })
      })
      .catch((error) => {
        // An old request finishing late must not replace newer data.
        if (!controller.signal.aborted && error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })

    return () => controller.abort()
  }, [path, attempt, initialData])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}

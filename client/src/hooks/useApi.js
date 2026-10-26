import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../lib/api.js'

/*
 * Loads data from the API and tracks loading / error state.
 *   const { data, error, loading, reload } = useApi('/home')
 * Pass null as the path to skip loading.
 */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))

    apiGet(path, { signal: controller.signal })
      .then((body) => setState({ data: body, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })

    return () => controller.abort()
  }, [path, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}

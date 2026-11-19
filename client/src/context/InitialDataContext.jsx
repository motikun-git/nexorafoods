'use client'

import { createContext, useContext, useMemo } from 'react'

/*
 * Data the server already loaded while building the page (for Google and a
 * fast first view). Keys are API paths, e.g. "/home" or "/products/rice".
 * useApi() starts with this data instead of loading it again.
 */
const InitialDataContext = createContext({})

export function InitialData({ seed, children }) {
  const parentSeed = useContext(InitialDataContext)
  const mergedSeed = useMemo(() => ({ ...parentSeed, ...seed }), [parentSeed, seed])
  return <InitialDataContext.Provider value={mergedSeed}>{children}</InitialDataContext.Provider>
}

export function useInitialData(path) {
  const seed = useContext(InitialDataContext)
  return path ? seed[path] : undefined
}

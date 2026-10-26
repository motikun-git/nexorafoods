/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import { useApi } from '../hooks/useApi.js'

const CategoriesContext = createContext({ tree: [], loading: true, error: null, reload: () => {} })

// Loads the public category tree once; used by the header menu, the mobile
// menu, the footer and (later) the Shop sidebar.
export function CategoriesProvider({ children }) {
  const { data, error, loading, reload } = useApi('/categories/tree')
  const value = { tree: data?.data || [], loading, error, reload }
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories() {
  return useContext(CategoriesContext)
}

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useCategories } from '../../context/CategoriesContext.jsx'
import Icon from '../ui/Icon.jsx'

export const categoryLink = (slug) => `/shop?category=${encodeURIComponent(slug)}`

/*
 * Desktop "All Categories" dropdown (mega menu).
 * Left: main categories. Right: subcategories of the highlighted one
 * (two levels shown; deeper levels are reachable on the Shop page).
 * Works with mouse, keyboard (Tab / Enter / Escape) and touch.
 */
export default function CategoryMenu() {
  const { tree, loading, error, reload } = useCategories()
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const { pathname, search } = useLocation()

  const active = tree.find((c) => c._id === activeId) || tree[0]

  // Close when the page changes.
  useEffect(() => setOpen(false), [pathname, search])

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="category-menu"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        <Icon name="grid" className="size-4.5" />
        All Categories
        <Icon name="chevronDown" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          id="category-menu"
          className="absolute left-0 top-full z-50 mt-2 flex w-[min(760px,calc(100vw-4rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-pop"
        >
          {loading ? <p className="p-6 text-sm text-muted">Loading categories…</p> : null}

          {error ? (
            <div className="p-6 text-sm">
              <p className="text-muted">Categories could not be loaded.</p>
              <button type="button" className="mt-2 font-semibold text-primary underline" onClick={reload}>
                Try again
              </button>
            </div>
          ) : null}

          {!loading && !error && tree.length === 0 ? (
            <p className="p-6 text-sm text-muted">No categories yet.</p>
          ) : null}

          {tree.length > 0 ? (
            <>
              <ul className="max-h-[70vh] w-64 shrink-0 overflow-y-auto border-r border-line bg-cream py-2">
                {tree.map((category) => {
                  const isActive = active?._id === category._id
                  return (
                    <li key={category._id}>
                      <Link
                        to={categoryLink(category.slug)}
                        onMouseEnter={() => setActiveId(category._id)}
                        onFocus={() => setActiveId(category._id)}
                        className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors ${
                          isActive ? 'bg-white font-semibold text-primary' : 'text-ink hover:text-primary'
                        }`}
                      >
                        <span className="truncate">{category.name}</span>
                        {category.children.length ? <Icon name="chevronRight" className="size-4 shrink-0" /> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>

              <div className="max-h-[70vh] flex-1 overflow-y-auto p-5">
                {active ? (
                  <>
                    <div className="mb-4 flex items-baseline justify-between gap-4">
                      <h3 className="text-base font-bold">{active.name}</h3>
                      <Link to={categoryLink(active.slug)} className="shrink-0 text-sm font-semibold text-primary hover:underline">
                        View all ({active.totalProductCount})
                      </Link>
                    </div>
                    {active.children.length ? (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        {active.children.map((child) => (
                          <div key={child._id}>
                            <Link to={categoryLink(child.slug)} className="text-sm font-semibold text-ink hover:text-primary">
                              {child.name}
                            </Link>
                            {child.children.length ? (
                              <ul className="mt-1.5 space-y-1">
                                {child.children.map((grandchild) => (
                                  <li key={grandchild._id}>
                                    <Link to={categoryLink(grandchild.slug)} className="text-sm text-muted hover:text-primary">
                                      {grandchild.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">Browse all products in {active.name}.</p>
                    )}
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useCategories } from '../../context/CategoriesContext.jsx'
import CategoryTree from '../layout/CategoryTree.jsx'

/*
 * Category tree + filters. The same component is used in the desktop
 * sidebar and inside the mobile "Filters" drawer, so both behave the same.
 */
export default function ShopFilters({ params, update, linkFor, allProductsLink, hasChildren, onNavigate }) {
  const { tree, loading, error, reload } = useCategories()
  const activeSlug = params.get('category')
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '')

  // Keep the inputs in sync with the URL (e.g. after "Clear all").
  useEffect(() => {
    setMinPrice(params.get('minPrice') || '')
    setMaxPrice(params.get('maxPrice') || '')
  }, [params])

  function applyPrice(event) {
    event.preventDefault()
    let min = minPrice === '' ? '' : Math.max(0, Number(minPrice))
    let max = maxPrice === '' ? '' : Math.max(0, Number(maxPrice))
    if (min !== '' && max !== '' && min > max) [min, max] = [max, min]
    update({ minPrice: min, maxPrice: max })
    onNavigate?.()
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="filter-categories">
        <h2 id="filter-categories" className="px-3 text-xs font-bold uppercase tracking-wider text-muted">
          Categories
        </h2>
        <Link
          to={allProductsLink}
          onClick={onNavigate}
          aria-current={!activeSlug ? 'page' : undefined}
          className={`mt-2 flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
            !activeSlug ? 'bg-primary-soft font-semibold text-primary' : 'hover:bg-cream'
          }`}
        >
          All products
        </Link>
        {loading ? <p className="px-3 py-2 text-sm text-muted">Loading…</p> : null}
        {error ? (
          <button type="button" onClick={reload} className="px-3 py-2 text-sm font-semibold text-primary underline">
            Couldn&apos;t load categories. Try again
          </button>
        ) : null}
        {/* key: re-open the path to the selected category when it changes */}
        <CategoryTree key={activeSlug || 'all'} nodes={tree} activeSlug={activeSlug} linkFor={linkFor} onNavigate={onNavigate} />
      </section>

      {activeSlug && hasChildren ? (
        <section className="border-t border-line px-3 pt-5">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-[var(--brand-primary)]"
              checked={params.get('mode') !== 'direct'}
              onChange={(event) => update({ mode: event.target.checked ? '' : 'direct' })}
            />
            Include products from subcategories
          </label>
        </section>
      ) : null}

      <section aria-labelledby="filter-price" className="border-t border-line px-3 pt-5">
        <h2 id="filter-price" className="text-xs font-bold uppercase tracking-wider text-muted">
          Price
        </h2>
        <form onSubmit={applyPrice} className="mt-3">
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="min-price">
              Minimum price
            </label>
            <input
              id="min-price"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="Min"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-base sm:text-sm"
            />
            <span className="text-muted">–</span>
            <label className="sr-only" htmlFor="max-price">
              Maximum price
            </label>
            <input
              id="max-price"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="Max"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-base sm:text-sm"
            />
          </div>
          <button type="submit" className="btn-outline mt-3 w-full">
            Apply price
          </button>
        </form>
      </section>

      <section className="border-t border-line px-3 pt-5">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--brand-primary)]"
            checked={params.get('inStock') === 'true'}
            onChange={(event) => update({ inStock: event.target.checked ? 'true' : '' })}
          />
          In stock only
        </label>
      </section>
    </div>
  )
}

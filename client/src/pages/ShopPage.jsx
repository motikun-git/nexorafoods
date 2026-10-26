import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ProductGrid from '../components/products/ProductGrid.jsx'
import Pagination from '../components/shop/Pagination.jsx'
import ShopFilters from '../components/shop/ShopFilters.jsx'
import Drawer from '../components/ui/Drawer.jsx'
import Icon from '../components/ui/Icon.jsx'
import { useApi } from '../hooks/useApi.js'

const PAGE_SIZE = 12
const API_KEYS = ['category', 'mode', 'search', 'minPrice', 'maxPrice', 'inStock', 'sort', 'page', 'featured']
// Kept when the customer switches category (search and page start over).
const KEEP_ON_CATEGORY_CHANGE = ['sort', 'inStock', 'minPrice', 'maxPrice']

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'popular', label: 'Best selling' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name: A–Z' },
  { value: 'newest', label: 'Newest' },
]

const PRODUCT_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4'

/*
 * ONE dynamic Shop page. Everything the customer chooses lives in the URL
 * (?category=fruits&sort=price-asc&page=2), so refresh, back button and
 * shared links all show the same products.
 */
export default function ShopPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const resultsRef = useRef(null)
  const closeFilters = useCallback(() => setFiltersOpen(false), [])

  const categorySlug = params.get('category')
  const search = params.get('search')

  // Only known keys go to the API.
  const apiQuery = useMemo(() => {
    const query = new URLSearchParams()
    for (const key of API_KEYS) if (params.get(key)) query.set(key, params.get(key))
    query.set('limit', String(PAGE_SIZE))
    return query.toString()
  }, [params])

  const products = useApi(`/products?${apiQuery}`)
  const categoryInfo = useApi(categorySlug ? `/categories/${encodeURIComponent(categorySlug)}` : null)

  const items = products.data?.data || []
  const pagination = products.data?.pagination
  const category = categorySlug ? categoryInfo.data?.data : null
  const children = category?.children || []

  // Change some filters; any change except the page goes back to page 1.
  const update = useCallback(
    (changes) => {
      setParams((current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value === '' || value === null || value === undefined) next.delete(key)
          else next.set(key, String(value))
        }
        if (!('page' in changes)) next.delete('page')
        return next
      })
    },
    [setParams]
  )

  const linkFor = useCallback(
    (slug) => {
      const next = new URLSearchParams()
      next.set('category', slug)
      for (const key of KEEP_ON_CATEGORY_CHANGE) if (params.get(key)) next.set(key, params.get(key))
      return `/shop?${next}`
    },
    [params]
  )

  const allProductsLink = useMemo(() => {
    const next = new URLSearchParams()
    for (const key of KEEP_ON_CATEGORY_CHANGE) if (params.get(key)) next.set(key, params.get(key))
    return `/shop${next.toString() ? `?${next}` : ''}`
  }, [params])

  function goToPage(page) {
    update({ page })
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeChips = [
    search && { key: 'search', label: `“${search}”` },
    (params.get('minPrice') || params.get('maxPrice')) && {
      key: 'price',
      label: `Price ${params.get('minPrice') || 0} – ${params.get('maxPrice') || '∞'}`,
    },
    params.get('inStock') === 'true' && { key: 'inStock', label: 'In stock' },
    params.get('featured') === 'true' && { key: 'featured', label: 'Featured' },
  ].filter(Boolean)

  function removeChip(key) {
    if (key === 'price') update({ minPrice: '', maxPrice: '' })
    else update({ [key]: '' })
  }

  const title = categorySlug
    ? category?.category.name || (categoryInfo.loading ? '…' : 'Category')
    : search
      ? `Search results`
      : 'All products'

  const filterProps = {
    params,
    update,
    linkFor,
    allProductsLink,
    hasChildren: children.length > 0,
  }

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            {categorySlug ? (
              <Link to={allProductsLink} className="hover:text-primary">
                Shop
              </Link>
            ) : (
              <span aria-current="page">Shop</span>
            )}
          </li>
          {category?.breadcrumb.map((crumb) => (
            <li key={crumb._id} className="flex items-center gap-1">
              <span aria-hidden="true">›</span>
              <Link to={linkFor(crumb.slug)} className="hover:text-primary">
                {crumb.name}
              </Link>
            </li>
          ))}
          {category ? (
            <li className="flex items-center gap-1">
              <span aria-hidden="true">›</span>
              <span aria-current="page" className="font-medium text-ink">
                {category.category.name}
              </span>
            </li>
          ) : null}
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block" aria-label="Shop filters">
          <div className="sticky top-44 max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-3 pb-5">
            <ShopFilters {...filterProps} />
          </div>
        </aside>

        {/* Results */}
        <section ref={resultsRef} aria-labelledby="shop-title" className="min-w-0 scroll-mt-44">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 id="shop-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted" aria-live="polite">
                {pagination ? `${pagination.total} product${pagination.total === 1 ? '' : 's'}` : ' '}
              </p>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="btn-outline flex-1 whitespace-nowrap px-4 sm:flex-none lg:hidden"
                aria-expanded={filtersOpen}
                aria-label="Categories and filters"
              >
                <Icon name="grid" className="size-4.5" />
                <span className="sm:hidden">Filters</span>
                <span className="hidden sm:inline">Categories & filters</span>
              </button>
              <label className="sr-only" htmlFor="sort">
                Sort products
              </label>
              <select
                id="sort"
                value={params.get('sort') || 'recommended'}
                onChange={(event) => update({ sort: event.target.value === 'recommended' ? '' : event.target.value })}
                className="h-11 flex-1 rounded-full border border-line bg-white px-4 text-sm font-medium sm:flex-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subcategory shortcuts */}
          {children.length ? (
            <ul className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              {children.map((child) => (
                <li key={child._id} className="shrink-0">
                  <Link
                    to={linkFor(child.slug)}
                    className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-medium hover:border-primary hover:text-primary"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Active filters */}
          {activeChips.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-sm font-medium text-primary hover:bg-primary hover:text-white"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  {chip.label}
                  <Icon name="close" className="size-3.5" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => update({ search: '', minPrice: '', maxPrice: '', inStock: '', featured: '' })}
                className="min-h-9 px-2 text-sm font-semibold text-muted underline hover:text-ink"
              >
                Clear all
              </button>
            </div>
          ) : null}

          <div className="mt-5">
            {categorySlug && categoryInfo.error?.status === 404 ? (
              <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
                <p className="font-semibold">This category is not available.</p>
                <Link to="/shop" className="btn-primary mt-4">
                  See all products
                </Link>
              </div>
            ) : (
              <ProductGrid
                products={items}
                loading={products.loading}
                error={products.error}
                onRetry={products.reload}
                skeletonCount={8}
                gridClassName={PRODUCT_GRID}
                emptyText="No products match your selection."
                emptyAction={
                  activeChips.length ? (
                    <button
                      type="button"
                      onClick={() => update({ search: '', minPrice: '', maxPrice: '', inStock: '', featured: '' })}
                      className="btn-outline mt-4"
                    >
                      Clear filters
                    </button>
                  ) : null
                }
              />
            )}
          </div>

          {pagination ? <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={goToPage} /> : null}
        </section>
      </div>

      {/* Mobile / tablet: same filters in a drawer */}
      <Drawer open={filtersOpen} onClose={closeFilters} title="Categories & filters" side="left">
        <div className="p-3">
          <ShopFilters {...filterProps} onNavigate={closeFilters} />
        </div>
      </Drawer>
    </div>
  )
}

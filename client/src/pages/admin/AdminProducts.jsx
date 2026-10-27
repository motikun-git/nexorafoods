import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Pagination from '../../components/shop/Pagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import { apiRequest } from '../../lib/api.js'
import { flattenCategories } from '../../lib/categoryOptions.js'
import { formatPrice } from '../../lib/format.js'

const FILTER_KEYS = ['search', 'category', 'status', 'stock', 'featured', 'sort', 'page']

export default function AdminProducts() {
  const [params, setParams] = useSearchParams()
  const { currency } = useSettings()
  const { notify } = useCart()
  const [search, setSearch] = useState(params.get('search') || '')
  const [changed, setChanged] = useState({}) // id -> updated product (quick edits)
  useEffect(() => setSearch(params.get('search') || ''), [params])

  const query = new URLSearchParams()
  for (const key of FILTER_KEYS) if (params.get(key)) query.set(key, params.get(key))
  const { data, error, loading, reload } = useApi(`/admin/products?${query}`)
  const categories = useApi('/admin/categories')
  const options = useMemo(() => flattenCategories(categories.data?.data.tree || []), [categories.data])

  const products = (data?.data || []).map((p) => changed[p._id] || p)

  function update(changes) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k))
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  // One-click changes from the list (publish, featured).
  async function quickUpdate(product, patch, message) {
    try {
      const body = await apiRequest(`/admin/products/${product._id}`, { method: 'PATCH', body: patch })
      setChanged((c) => ({ ...c, [product._id]: body.data }))
      notify(message, 'success')
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  const select = 'h-11 rounded-full border border-line bg-white px-3 text-sm'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Products</h1>
        <Link to="/admin/products/new" className="btn-primary">
          + Add product
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        <form
          className="flex min-w-0 flex-1 basis-64 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            update({ search: search.trim() })
          }}
        >
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or SKU"
            className="h-11 min-w-0 flex-1 rounded-full border border-line bg-white px-4 text-base sm:text-sm"
          />
          <button type="submit" className="btn-outline">
            Search
          </button>
        </form>
        <select aria-label="Category" className={`${select} max-w-full`} value={params.get('category') || ''} onChange={(e) => update({ category: e.target.value })}>
          <option value="">All categories</option>
          {options.map((o) => (
            <option key={o._id} value={o._id}>
              {'— '.repeat(o.depth)}
              {o.name}
            </option>
          ))}
        </select>
        <select aria-label="Status" className={select} value={params.get('status') || ''} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Published & hidden</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </select>
        <select aria-label="Stock" className={select} value={params.get('stock') || ''} onChange={(e) => update({ stock: e.target.value })}>
          <option value="">Any stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select aria-label="Sort" className={select} value={params.get('sort') || ''} onChange={(e) => update({ sort: e.target.value })}>
          <option value="">Newest</option>
          <option value="name">Name A–Z</option>
          <option value="stock-asc">Lowest stock</option>
          <option value="best-selling">Best selling</option>
        </select>
      </div>

      <div className="mt-5">
        {loading && !data ? <Spinner label="Loading products" /> : null}
        {error ? (
          <p className="text-red-600">
            {error.message}{' '}
            <button type="button" className="underline" onClick={reload}>
              Try again
            </button>
          </p>
        ) : null}
        {data && products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">No products found.</p>
        ) : null}

        {products.length ? (
          <ul className="overflow-hidden rounded-2xl border border-line bg-white">
            {products.map((p) => {
              const hasDiscount = p.discountPrice != null && p.discountPrice < p.price
              return (
                <li key={p._id} className="flex flex-wrap items-center gap-3 border-b border-line p-3 last:border-0 sm:flex-nowrap sm:p-4">
                  <Link to={`/admin/products/${p._id}`} className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft font-extrabold text-primary">
                      {p.images?.[0] ? <img src={p.images[0]} alt="" className="size-full object-cover" /> : p.name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold hover:text-primary">{p.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.category?.name || 'No category'} · {p.unit}
                        {p.sku ? ` · ${p.sku}` : ''}
                      </span>
                    </span>
                  </Link>
                  <span className="w-28 text-sm">
                    <span className="block font-bold">{formatPrice(hasDiscount ? p.discountPrice : p.price, currency)}</span>
                    {hasDiscount ? <del className="text-xs text-muted">{formatPrice(p.price, currency)}</del> : null}
                  </span>
                  <span
                    className={`w-24 text-sm font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-accent-dark' : ''}`}
                  >
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => quickUpdate(p, { isPublished: !p.isPublished }, p.isPublished ? `${p.name} hidden` : `${p.name} published`)}
                      className={`min-h-9 rounded-full px-3 text-xs font-bold ${p.isPublished ? 'bg-primary-soft text-primary' : 'bg-line text-muted'}`}
                      aria-label={`${p.isPublished ? 'Hide' : 'Publish'} ${p.name}`}
                    >
                      {p.isPublished ? 'Published' : 'Hidden'}
                    </button>
                    <button
                      type="button"
                      onClick={() => quickUpdate(p, { isFeatured: !p.isFeatured }, p.isFeatured ? 'Removed from featured' : 'Added to featured')}
                      className={`min-h-9 rounded-full px-3 text-xs font-bold ${p.isFeatured ? 'bg-accent text-ink' : 'border border-line text-muted'}`}
                      aria-label={`${p.isFeatured ? 'Unfeature' : 'Feature'} ${p.name}`}
                      aria-pressed={p.isFeatured}
                    >
                      ★ Featured
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : null}

        {data?.pagination ? (
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(page) => update({ page: String(page) })} />
        ) : null}
      </div>
    </div>
  )
}

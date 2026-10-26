import ProductCard from './ProductCard.jsx'

// Responsive grid: 2 columns on phones up to 5 on large screens.
export const GRID_CLASSES = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5'

export default function ProductGrid({ products, loading, error, onRetry, skeletonCount = 10, emptyText = 'No products found.' }) {
  if (loading) {
    return (
      <div className={GRID_CLASSES} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="aspect-square animate-pulse bg-line/60" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-line/70" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-line/70" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-line/70" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-line bg-white p-8 text-center">
        <p className="font-semibold">Products could not be loaded.</p>
        <p className="mt-1 text-sm text-muted">{error.message}</p>
        {onRetry ? (
          <button type="button" className="btn-outline mt-4" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    )
  }

  if (!products?.length) {
    return <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">{emptyText}</p>
  }

  return (
    <ul className={GRID_CLASSES}>
      {products.map((product) => (
        <li key={product._id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

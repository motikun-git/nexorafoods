import Icon from '../ui/Icon.jsx'

// Page numbers around the current page: 1 … 4 5 [6] 7 8 … 20
function pageList(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('…')
    result.push(p)
  })
  return result
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const itemClass = 'grid size-11 place-items-center rounded-full text-sm font-semibold transition-colors'

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={`${itemClass} hover:bg-primary-soft disabled:opacity-40`}
        aria-label="Previous page"
      >
        <Icon name="chevronLeft" />
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${itemClass} ${p === page ? 'bg-primary text-white' : 'hover:bg-primary-soft'}`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={`${itemClass} hover:bg-primary-soft disabled:opacity-40`}
        aria-label="Next page"
      >
        <Icon name="chevronRight" />
      </button>
    </nav>
  )
}

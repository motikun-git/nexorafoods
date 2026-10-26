import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import Icon from '../ui/Icon.jsx'

// Product search. Sends the user to /shop?search=... (works from any page).
export default function SearchForm({ className = '', id = 'site-search' }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const current = pathname === '/shop' ? params.get('search') || '' : ''
  const [text, setText] = useState(current)

  // Keep the box in sync when the URL changes (e.g. "Reset filters").
  useEffect(() => setText(current), [current])

  function onSubmit(event) {
    event.preventDefault()
    const query = text.trim()
    navigate(query ? `/shop?search=${encodeURIComponent(query)}` : '/shop')
  }

  return (
    <form role="search" onSubmit={onSubmit} className={`relative flex w-full ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search products…"
        maxLength={100}
        enterKeyHint="search"
        className="h-11 w-full min-w-0 rounded-full border border-line bg-cream pl-4 pr-12 text-base text-ink placeholder:text-muted/80 focus:border-primary focus:bg-white focus:outline-none sm:text-sm"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1 top-1 inline-flex size-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark"
      >
        <Icon name="search" className="size-4.5" />
      </button>
    </form>
  )
}

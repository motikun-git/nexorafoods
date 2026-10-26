import { Link } from 'react-router'
import { useSettings } from '../../context/SettingsContext.jsx'

// Logo + store name. "Nexora Food" -> "Nexora" + highlighted "Food".
export default function Logo({ className = '', light = false }) {
  const { storeName, logo } = useSettings()
  const words = storeName.trim().split(/\s+/)
  const last = words.length > 1 ? words.pop() : ''
  const first = words.join(' ')

  return (
    <Link to="/" className={`flex min-w-0 items-center gap-2 ${className}`} aria-label={`${storeName} home`}>
      {logo ? <img src={logo} alt="" width="40" height="40" className="size-9 shrink-0 sm:size-10" /> : null}
      <span className={`truncate text-lg font-extrabold tracking-tight sm:text-xl ${light ? 'text-white' : 'text-primary'}`}>
        {first}
        {last ? <span className="text-accent">{first ? ' ' : ''}{last}</span> : null}
      </span>
    </Link>
  )
}

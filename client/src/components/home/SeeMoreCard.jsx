import { Link } from 'react-router'
import Icon from '../ui/Icon.jsx'

// Last card of a homepage slider: always leads to the shop.
export default function SeeMoreCard({ to, title = 'See more', subtitle }) {
  return (
    <Link
      to={to}
      className="group flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary-soft p-4 text-center transition hover:border-primary hover:bg-white"
    >
      <span className="grid size-14 place-items-center rounded-full bg-primary text-white transition-transform group-hover:translate-x-1">
        <Icon name="arrowRight" className="size-6" />
      </span>
      <span className="text-base font-bold text-primary">{title}</span>
      {subtitle ? <span className="text-xs text-muted">{subtitle}</span> : null}
    </Link>
  )
}

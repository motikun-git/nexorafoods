import { Link } from 'react-router'
import Icon from '../ui/Icon.jsx'

export default function SectionHeading({ id, title, subtitle, linkTo, linkLabel = 'Show more' }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div>
        <h2 id={id} className="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p> : null}
      </div>
      {linkTo ? (
        <Link to={linkTo} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {linkLabel}
          <Icon name="arrowRight" className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}

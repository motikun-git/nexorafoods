import { Link } from 'react-router'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatPrice } from '../../lib/format.js'
import Icon from '../ui/Icon.jsx'

/*
 * One product tile, used on the homepage, shop and related products.
 * The "Add to cart" button is connected in the Cart step; until then the
 * card links to the product page.
 */
export default function ProductCard({ product }) {
  const { currency } = useSettings()
  const href = `/product/${product.slug}`
  const saving = product.hasDiscount ? product.price - product.finalPrice : 0
  const image = product.images?.[0]

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-card">
      <Link to={href} className="relative block aspect-[5/4] overflow-hidden bg-primary-soft sm:aspect-square" tabIndex={-1} aria-hidden="true">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-white text-xl font-extrabold text-primary shadow-card sm:size-20 sm:text-3xl">
              {product.name.charAt(0)}
            </span>
          </span>
        )}

        {saving > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-ink">
            Save {formatPrice(saving, currency)}
          </span>
        ) : null}

        {!product.inStock ? (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-ink/80 py-1 text-center text-xs font-semibold text-white">
            Out of stock
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
          <Link to={href} className="after:absolute after:inset-0 hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-0.5 text-xs text-muted">Per {product.unit}</p>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
          <span className="text-base font-extrabold text-primary sm:text-lg">{formatPrice(product.finalPrice, currency)}</span>
          {product.hasDiscount ? (
            <del className="text-xs text-muted sm:text-sm">{formatPrice(product.price, currency)}</del>
          ) : null}
        </div>

        <span className="relative mt-2.5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-primary/25 text-sm font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-white">
          View details
          <Icon name="arrowRight" className="size-4" />
        </span>
      </div>
    </article>
  )
}

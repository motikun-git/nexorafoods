import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import QuantityStepper from '../components/cart/QuantityStepper.jsx'
import { categoryLink } from '../components/layout/CategoryMenu.jsx'
import ProductGrid from '../components/products/ProductGrid.jsx'
import Icon from '../components/ui/Icon.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { formatPrice } from '../lib/format.js'

const MAX_PER_ITEM = 50
const LOW_STOCK = 5

export default function ProductPage() {
  const { slug } = useParams()
  const { data, error, loading, reload } = useApi(`/products/${encodeURIComponent(slug)}`)

  if (loading && !data) {
    return (
      <div className="container-page grid min-h-[50vh] place-items-center">
        <Spinner label="Loading product" />
      </div>
    )
  }

  if (error) {
    const notFound = error.status === 404
    return (
      <section className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold">{notFound ? 'Product not found' : 'Something went wrong'}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          {notFound ? 'This product is not available any more.' : error.message}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {!notFound ? (
            <button type="button" className="btn-outline" onClick={reload}>
              Try again
            </button>
          ) : null}
          <Link to="/shop" className="btn-primary">
            Browse products
          </Link>
        </div>
      </section>
    )
  }

  // key: start fresh (quantity, image) when moving to another product
  return <ProductDetails key={data.data.product._id} {...data.data} />
}

function ProductDetails({ product, breadcrumb, related }) {
  const { currency, storeName } = useSettings()
  const { quantityOf, addItem, pending, openDrawer } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)

  const inCart = quantityOf(product._id)
  const canAdd = Math.max(0, Math.min(product.stock, MAX_PER_ITEM) - inCart)
  const busy = Boolean(pending[product._id])
  const saving = product.hasDiscount ? product.price - product.finalPrice : 0
  const images = product.images || []
  const category = breadcrumb[breadcrumb.length - 1]

  useEffect(() => {
    const previous = document.title
    document.title = `${product.name} | ${storeName}`
    return () => {
      document.title = previous
    }
  }, [product.name, storeName])

  async function handleAdd() {
    const ok = await addItem(product, quantity)
    if (ok) setQuantity(1)
  }

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Breadcrumb: Home › Shop › parent categories › product */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link to="/shop" className="hover:text-primary">
              Shop
            </Link>
          </li>
          {breadcrumb.map((crumb) => (
            <li key={crumb._id} className="flex items-center gap-1">
              <span aria-hidden="true">›</span>
              <Link to={categoryLink(crumb.slug)} className="hover:text-primary">
                {crumb.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span aria-hidden="true">›</span>
            <span aria-current="page" className="font-medium text-ink">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2 lg:gap-12">
        {/* Images */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-primary-soft md:aspect-square">
            {images.length ? (
              <img src={images[activeImage]} alt={product.name} className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center" role="img" aria-label={product.name}>
                <span className="grid size-24 place-items-center rounded-full bg-white text-5xl font-extrabold text-primary shadow-card md:size-32 md:text-6xl">
                  {product.name.charAt(0)}
                </span>
              </span>
            )}
            {saving > 0 ? (
              <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-sm font-bold text-ink">
                Save {formatPrice(saving, currency)}
              </span>
            ) : null}
          </div>
          {images.length > 1 ? (
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <li key={src} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-current={i === activeImage}
                    className={`block size-18 overflow-hidden rounded-xl border-2 ${
                      i === activeImage ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" className="size-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Details */}
        <div>
          {category ? (
            <Link
              to={categoryLink(category.slug)}
              className="text-xs font-bold uppercase tracking-wider text-accent-dark hover:underline"
            >
              {category.name}
            </Link>
          ) : null}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-1 text-muted">Per {product.unit}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-primary">{formatPrice(product.finalPrice, currency)}</span>
            {product.hasDiscount ? (
              <del className="text-lg text-muted">{formatPrice(product.price, currency)}</del>
            ) : null}
          </div>

          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">
            <span
              className={`size-2.5 rounded-full ${
                !product.inStock ? 'bg-red-500' : product.stock <= LOW_STOCK ? 'bg-accent' : 'bg-primary'
              }`}
              aria-hidden="true"
            />
            {!product.inStock
              ? 'Out of stock'
              : product.stock <= LOW_STOCK
                ? `Only ${product.stock} left`
                : 'In stock'}
          </p>

          {/* Quantity + add to cart */}
          <div className="mt-6 rounded-2xl border border-line bg-white p-4">
            {product.inStock && canAdd > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <QuantityStepper
                  quantity={quantity}
                  max={canAdd}
                  label={product.name}
                  disabled={busy}
                  onChange={(next) => setQuantity(Math.max(1, Math.min(next, canAdd)))}
                />
                <button type="button" onClick={handleAdd} disabled={busy} className="btn-primary h-12 flex-1 whitespace-nowrap text-base">
                  {busy ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Icon name="cart" className="size-5" />
                  )}
                  Add to cart · {formatPrice(product.finalPrice * quantity, currency)}
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-muted">
                {product.inStock
                  ? 'You already have the maximum available quantity in your cart.'
                  : 'This product is currently out of stock.'}
              </p>
            )}

            {inCart > 0 ? (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <Icon name="cart" className="size-4 text-primary" />
                <span>
                  <strong>{inCart}</strong> in your cart.
                </span>
                <button type="button" onClick={openDrawer} className="font-semibold text-primary underline">
                  View cart
                </button>
              </p>
            ) : null}
          </div>

          {product.description ? (
            <section aria-labelledby="description-title" className="mt-8">
              <h2 id="description-title" className="text-lg font-bold">
                Description
              </h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-muted">{product.description}</p>
            </section>
          ) : null}
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby="related-title" className="mt-14">
          <h2 id="related-title" className="mb-5 text-xl font-extrabold sm:text-2xl">
            You may also like
          </h2>
          <ProductGrid products={related} gridClassName="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4" />
        </section>
      ) : null}
    </div>
  )
}

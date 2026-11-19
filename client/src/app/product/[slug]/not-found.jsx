import Link from 'next/link'

export const metadata = { title: 'Product not found' }

// Same message the product page showed before, now with a real 404 status.
export default function ProductNotFound() {
  return (
    <section className="container-page py-20 text-center">
      <h1 className="text-2xl font-extrabold">Product not found</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">This product is not available any more.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/shop" className="btn-primary">
          Browse products
        </Link>
      </div>
    </section>
  )
}

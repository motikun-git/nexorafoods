import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="container-page py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-accent-dark">Error 404</p>
      <h1 className="mt-2 text-3xl font-extrabold">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">The page you are looking for doesn&apos;t exist or has been moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">
          Go to homepage
        </Link>
        <Link to="/shop" className="btn-outline">
          Browse products
        </Link>
      </div>
    </section>
  )
}

import { Link } from 'react-router'

// Temporary page for routes that are built in later steps.
export default function ComingSoonPage({ title }) {
  return (
    <section className="container-page py-20 text-center">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">This page is being built and will be ready soon.</p>
      <Link to="/" className="btn-primary mt-8">
        Back to home
      </Link>
    </section>
  )
}

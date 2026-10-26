import { useSettings } from '../context/SettingsContext.jsx'

// Temporary homepage - the full homepage (hero slideshow, featured and
// popular products) is built in the next step.
export default function HomePage() {
  const { storeName, hero } = useSettings()
  return (
    <section className="container-page py-16">
      <p className="text-sm font-bold uppercase tracking-widest text-accent-dark">{hero?.badge}</p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
        {hero?.title} <span className="text-primary">{hero?.highlight}</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted">{hero?.subtitle}</p>
      <p className="mt-10 rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-muted">
        Header and footer are ready. The full {storeName} homepage comes in the next step.
      </p>
    </section>
  )
}

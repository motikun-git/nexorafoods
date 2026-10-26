import { Link } from 'react-router'
import HeroSlider from '../components/home/HeroSlider.jsx'
import SectionHeading from '../components/home/SectionHeading.jsx'
import ProductGrid from '../components/products/ProductGrid.jsx'
import Icon from '../components/ui/Icon.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useApi } from '../hooks/useApi.js'

export default function HomePage() {
  const { hero = {} } = useSettings()
  const { data, error, loading, reload } = useApi('/home')
  const featured = data?.data.featured || []

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="bg-gradient-to-b from-primary-soft to-cream">
        <div className="container-page grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-2 lg:gap-12 lg:py-16">
          <div>
            {hero.badge ? (
              <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-dark shadow-card">
                {hero.badge}
              </p>
            ) : null}
            <h1 id="hero-title" className="mt-4 text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {hero.title} <span className="block text-primary">{hero.highlight}</span>
            </h1>
            {hero.subtitle ? <p className="mt-4 max-w-lg text-base text-muted sm:text-lg">{hero.subtitle}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <Link to={hero.ctaLink || '/shop'} className="btn-primary h-12 px-5 sm:px-6 sm:text-base">
                {hero.ctaLabel || 'Shop now'}
                <Icon name="arrowRight" className="size-5" />
              </Link>
              <Link to="/shop?sort=popular" className="btn-outline h-12 px-5 sm:px-6 sm:text-base">
                Best sellers
              </Link>
            </div>
          </div>
          <HeroSlider slides={hero.slides} />
        </div>
      </section>

      {/* Featured = the store's best-selling products (rule on the server) */}
      <section aria-labelledby="featured-title" className="container-page mt-12 sm:mt-16">
        <SectionHeading
          id="featured-title"
          title="Featured products"
          subtitle="Our best sellers, loved by customers."
          linkTo="/shop?sort=popular"
          linkLabel="Shop all"
        />
        <ProductGrid products={featured} loading={loading} error={error} onRetry={reload} emptyText="Best sellers will appear here soon." />
      </section>
    </>
  )
}

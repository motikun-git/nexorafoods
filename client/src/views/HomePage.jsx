'use client'

import Link from 'next/link'
import CategoryStrip from '../components/home/CategoryStrip.jsx'
import HeroSlider from '../components/home/HeroSlider.jsx'
import SectionHeading from '../components/home/SectionHeading.jsx'
import SeeMoreCard from '../components/home/SeeMoreCard.jsx'
import ProductCard from '../components/products/ProductCard.jsx'
import ProductGrid from '../components/products/ProductGrid.jsx'
import AutoCarousel from '../components/ui/AutoCarousel.jsx'
import Icon from '../components/ui/Icon.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useApi } from '../hooks/useApi.js'

const SEE_MORE = { _id: 'see-more', seeMore: true }
// Phone: 2 cards visible, tablet: 3-4, desktop: 5.
const PRODUCT_SLIDE = 'w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)]'

export default function HomePage() {
  const { hero = {} } = useSettings()
  const heroSlides = hero.slides || []
  const { data, error, loading, reload } = useApi('/home')
  const featured = data?.data.featured || []

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="bg-gradient-to-b from-primary-soft to-cream">
        {/* Desktop: the hero keeps the normal page width. The image column takes all the room
            the text does not need, so the image sits close to the text. */}
        <div
          className={`container-page grid items-center gap-8 pb-6 pt-8 sm:pb-8 sm:pt-12 lg:gap-6 lg:pb-10 lg:pt-14 ${
            heroSlides.length ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)]' : ''
          }`}
        >
          <div>
            {hero.badge ? (
              <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-dark shadow-card">
                {hero.badge}
              </p>
            ) : null}
            {/* First line in the brand green, second line in the orange of "Food" in the logo. */}
            <h1 id="hero-title" className="mt-4 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-primary sm:text-5xl lg:text-6xl">
              {hero.title} <span className="block text-accent">{hero.highlight}</span>
            </h1>
            {hero.subtitle ? <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">{hero.subtitle}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <Link href={hero.ctaLink || '/shop'} className="btn-primary h-12 px-5 sm:px-6 sm:text-base">
                {hero.ctaLabel || 'Shop now'}
                <Icon name="arrowRight" className="size-5" />
              </Link>
              <Link href="/shop?sort=popular" className="btn-outline h-12 px-5 sm:px-6 sm:text-base">
                Best sellers
              </Link>
            </div>
          </div>
          <HeroSlider slides={heroSlides} />
        </div>
      </section>

      <CategoryStrip />

      {/* Featured products: chosen by the admin (isFeatured) */}
      <section aria-labelledby="featured-title" className="container-page mt-12 sm:mt-16">
        <SectionHeading
          id="featured-title"
          title="Featured products"
          subtitle="Hand-picked products from our store."
          linkTo="/shop?featured=true"
          linkLabel="See all"
        />
        {loading || error || featured.length === 0 ? (
          <ProductGrid
            products={featured}
            loading={loading}
            error={error}
            onRetry={reload}
            skeletonCount={5}
            emptyText="Featured products will appear here soon."
          />
        ) : (
          <AutoCarousel
            label="Featured products"
            items={[...featured, SEE_MORE]}
            getKey={(item) => item._id}
            itemClassName={PRODUCT_SLIDE}
            renderItem={(item) =>
              item.seeMore ? (
                <SeeMoreCard to="/shop?featured=true" title="See more" subtitle="Browse all featured products" />
              ) : (
                <ProductCard product={item} />
              )
            }
          />
        )}
      </section>
    </>
  )
}

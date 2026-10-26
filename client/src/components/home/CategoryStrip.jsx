import { Link } from 'react-router'
import { useCategories } from '../../context/CategoriesContext.jsx'
import { categoryLink } from '../layout/CategoryMenu.jsx'
import SectionHeading from './SectionHeading.jsx'

// "Shop by category": swipeable row on phones, grid on larger screens.
export default function CategoryStrip() {
  const { tree, loading } = useCategories()
  if (loading || tree.length === 0) return null

  return (
    <section aria-labelledby="home-categories" className="container-page mt-12 sm:mt-16">
      <SectionHeading id="home-categories" title="Shop by category" subtitle="Find what you need, faster." linkTo="/shop" linkLabel="All products" />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-7">
        {tree.map((category) => (
          <li key={category._id} className="w-32 shrink-0 snap-start sm:w-auto">
            <Link
              to={categoryLink(category.slug)}
              className="flex h-full flex-col items-center gap-2 rounded-2xl border border-line bg-white p-3 text-center transition hover:border-primary hover:shadow-card"
            >
              {category.image ? (
                <img src={category.image} alt="" loading="lazy" className="size-14 rounded-full object-cover" />
              ) : (
                <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-lg font-extrabold text-primary">
                  {category.name.charAt(0)}
                </span>
              )}
              <span className="line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">{category.name}</span>
              <span className="text-xs text-muted">{category.totalProductCount} items</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

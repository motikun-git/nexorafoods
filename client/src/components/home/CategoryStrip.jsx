import { Link } from 'react-router'
import { useCategories } from '../../context/CategoriesContext.jsx'
import { categoryLink } from '../layout/CategoryMenu.jsx'
import AutoCarousel from '../ui/AutoCarousel.jsx'
import SectionHeading from './SectionHeading.jsx'
import SeeMoreCard from './SeeMoreCard.jsx'

const SEE_MORE = { _id: 'see-more', seeMore: true }

// "Shop by category": one auto-moving row. A category opens the Shop page
// filtered to that category (and all its subcategories).
export default function CategoryStrip() {
  const { tree, loading } = useCategories()
  if (loading || tree.length === 0) return null

  return (
    <section aria-labelledby="home-categories" className="container-page mt-12 sm:mt-16">
      <SectionHeading id="home-categories" title="Shop by category" subtitle="Find what you need, faster." linkTo="/shop" linkLabel="See all" />
      <AutoCarousel
        label="Product categories"
        items={[...tree, SEE_MORE]}
        getKey={(item) => item._id}
        itemClassName="w-[calc((100%-1.5rem)/3)] sm:w-[calc((100%-3rem)/4)] md:w-[calc((100%-4rem)/5)] lg:w-[calc((100%-6rem)/7)]"
        renderItem={(category) =>
          category.seeMore ? (
            <SeeMoreCard to="/shop" title="See more" />
          ) : (
            <Link
              to={categoryLink(category.slug)}
              className="flex h-full min-h-40 flex-col items-center gap-2 rounded-2xl border border-line bg-white p-3 text-center transition hover:border-primary hover:shadow-card"
            >
              {category.image ? (
                <img src={category.image} alt="" loading="lazy" className="size-14 rounded-full object-cover" />
              ) : (
                <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-lg font-extrabold text-primary">
                  {category.name.charAt(0)}
                </span>
              )}
              <span className="line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">{category.name}</span>
              <span className="mt-auto text-xs text-muted">{category.totalProductCount} items</span>
            </Link>
          )
        }
      />
    </section>
  )
}

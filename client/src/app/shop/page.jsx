import { Suspense } from 'react'
import { InitialData } from '../../context/InitialDataContext.jsx'
import { serverGet } from '../../lib/serverApi.js'
import { buildProductsQuery } from '../../lib/shopQuery.js'
import ShopPage from '../../views/ShopPage.jsx'

const first = (value) => (Array.isArray(value) ? value[0] : value) || null

export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const search = first(params.search)
  const categorySlug = first(params.category)
  if (search) return { title: `Search: ${search}`, robots: { index: false } }
  if (categorySlug) {
    const { body } = await serverGet(`/categories/${encodeURIComponent(categorySlug)}`)
    const category = body?.data?.category
    if (category) return { title: category.name, description: category.description || `Shop ${category.name} online.` }
  }
  return { title: 'Shop', description: 'Browse all products.' }
}

export default async function Shop({ searchParams }) {
  const params = await searchParams
  const categorySlug = first(params.category)
  const productsPath = `/products?${buildProductsQuery((key) => first(params[key]))}`
  const categoryPath = categorySlug ? `/categories/${encodeURIComponent(categorySlug)}` : null

  const [products, category] = await Promise.all([serverGet(productsPath), categoryPath ? serverGet(categoryPath) : null])
  const seed = {}
  if (products.body) seed[productsPath] = products.body
  if (category?.body) seed[categoryPath] = category.body

  return (
    <InitialData seed={seed}>
      <Suspense>
        <ShopPage />
      </Suspense>
    </InitialData>
  )
}

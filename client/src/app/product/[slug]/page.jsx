import { notFound } from 'next/navigation'
import { InitialData } from '../../../context/InitialDataContext.jsx'
import { serverGet } from '../../../lib/serverApi.js'
import ProductPage from '../../../views/ProductPage.jsx'

async function loadProduct(slug) {
  const path = `/products/${encodeURIComponent(slug)}`
  const result = await serverGet(path)
  return { path, ...result }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { body } = await loadProduct(slug)
  const product = body?.data?.product
  if (!product) return { title: 'Product' }
  const image = product.images?.[0]
  return {
    title: product.name,
    description: product.description?.slice(0, 160) || `Buy ${product.name} online.`,
    openGraph: { title: product.name, images: image ? [image] : undefined },
  }
}

export default async function Product({ params }) {
  const { slug } = await params
  const [{ path, status, body }, settings] = await Promise.all([loadProduct(slug), serverGet('/settings')])
  if (status === 404) notFound() // real 404 for search engines

  const product = body?.data?.product
  // Structured data: lets Google show the price and stock in results.
  const structuredData = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.images?.length ? product.images : undefined,
        description: product.description || undefined,
        offers: {
          '@type': 'Offer',
          price: product.finalPrice ?? product.price,
          priceCurrency: settings.body?.data?.currency?.code || 'BDT',
          availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      }
    : null

  return (
    <InitialData seed={body ? { [path]: body } : {}}>
      {structuredData ? (
        <script
          type="application/ld+json"
          // JSON only, with "<" escaped so it can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
      ) : null}
      <ProductPage />
    </InitialData>
  )
}

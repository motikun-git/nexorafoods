import { InitialData } from '../context/InitialDataContext.jsx'
import { serverGet } from '../lib/serverApi.js'
import { getSiteUrl } from '../lib/siteUrl.js'
import './globals.css'
import Providers from './providers.jsx'

// Settings, prices and stock change any time: build every page fresh.
export const dynamic = 'force-dynamic'

async function loadSettings() {
  const { body } = await serverGet('/settings')
  return body
}

// Page title, description and icons come from Store Settings (admin panel).
export async function generateMetadata() {
  const settings = (await loadSettings())?.data
  const storeName = settings?.storeName || 'Online Store'
  const tagline = settings?.tagline || 'Online Store'
  // Full site address, used for share images (Facebook/WhatsApp previews).
  const siteUrl = await getSiteUrl()
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${storeName} | ${tagline}`, template: `%s | ${storeName}` },
    description: settings?.description || 'Shop food, snacks, beverages and everyday essentials online.',
    icons: { icon: settings?.favicon || '/images/brand/favicon-64.png', apple: '/images/brand/logo-192.png' },
    openGraph: { siteName: storeName, type: 'website' },
  }
}

export async function generateViewport() {
  const settings = (await loadSettings())?.data
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: settings?.colors?.primary || '#35552B' }
}

export default async function RootLayout({ children }) {
  const [settingsBody, categoriesBody] = await Promise.all([loadSettings(), serverGet('/categories/tree').then((r) => r.body)])
  const colors = settingsBody?.data?.colors || {}
  const seed = {}
  if (settingsBody) seed['/settings'] = settingsBody
  if (categoriesBody) seed['/categories/tree'] = categoriesBody

  return (
    <html
      lang="en"
      // Brand colors from the settings, so the first paint already uses them.
      style={{
        ...(colors.primary ? { '--brand-primary': colors.primary } : {}),
        ...(colors.accent ? { '--brand-accent': colors.accent } : {}),
      }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <InitialData seed={seed}>
          <Providers>{children}</Providers>
        </InitialData>
      </body>
    </html>
  )
}

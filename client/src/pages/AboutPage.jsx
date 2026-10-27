import { Link } from 'react-router'
import Icon from '../components/ui/Icon.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

const FEATURES = [
  { icon: 'leaf', title: 'Everyday selection', text: 'Food, snacks, beverages and daily essentials in one place.' },
  { icon: 'search', title: 'Easy discovery', text: 'Browse categories or search to find what you need quickly.' },
  { icon: 'truck', title: 'Delivered to you', text: 'Order online and pay with cash when it arrives.' },
  { icon: 'chat', title: 'Friendly support', text: 'Questions? Call or message us any time.' },
]

// Text comes from Store Settings (editable in the admin panel).
export default function AboutPage() {
  const { storeName, about = {}, hero = {} } = useSettings()
  const fill = (text = '') => text.replaceAll('{store}', storeName)

  return (
    <>
      <section className="bg-gradient-to-b from-primary-soft to-cream">
        <div className="container-page py-12 text-center sm:py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Get to know us</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Welcome to <span className="text-primary">{storeName}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted sm:text-lg">{fill(about.intro)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className="btn-primary h-12 px-6">
              {hero.ctaLabel || 'Explore products'}
              <Icon name="arrowRight" className="size-5" />
            </Link>
            <Link to="/contact" className="btn-outline h-12 px-6">
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page mt-12 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Who we are</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{fill(about.storyTitle)}</h2>
          <p className="mt-4 leading-relaxed text-muted">{fill(about.story)}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border border-line bg-white p-5">
              <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon name={f.icon} />
              </span>
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-12 grid gap-4 sm:grid-cols-2">
        {[
          ['Our mission', about.mission],
          ['Our vision', about.vision],
        ].map(([title, text]) => (
          <div key={title} className="rounded-2xl bg-primary p-6 text-white sm:p-8">
            <h2 className="text-xl font-extrabold">{title}</h2>
            <p className="mt-2 text-white/85">{fill(text)}</p>
          </div>
        ))}
      </section>
    </>
  )
}

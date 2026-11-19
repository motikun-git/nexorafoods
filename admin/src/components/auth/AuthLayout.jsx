import { useSettings } from '../../context/SettingsContext.jsx'

// Card used by the login and register pages.
export default function AuthLayout({ title, subtitle, children, notice }) {
  const { logo } = useSettings()
  return (
    <section className="container-page grid place-items-center py-10 sm:py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
        {logo ? <img src={logo} alt="" width="48" height="48" className="mx-auto size-12" /> : null}
        <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-center text-sm text-muted">{subtitle}</p> : null}
        {notice ? (
          <p className="mt-5 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-ink" role="status">
            {notice}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}

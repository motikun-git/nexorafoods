import { useEffect, useState } from 'react'
import Spinner from '../components/ui/Spinner.jsx'
import { useNotify } from '../context/NotifyContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { apiRequest, uploadImage } from '../lib/api.js'

// Fields shown on the page: [path, label, type]
const SECTIONS = [
  {
    title: 'Store',
    fields: [
      ['storeName', 'Store name'],
      ['tagline', 'Tagline'],
      ['description', 'Short description (footer)'],
      ['orderPrefix', 'Order number prefix (e.g. NF)'],
    ],
  },
  { title: 'Brand colors', fields: [['colors.primary', 'Main color', 'color'], ['colors.accent', 'Accent color', 'color']] },
  {
    title: 'Contact',
    fields: [
      ['contact.phone', 'Phone'],
      ['contact.email', 'Email'],
      ['contact.address', 'Address'],
      ['contact.mapUrl', 'Google Maps link'],
      ['contact.website', 'Website'],
    ],
  },
  {
    title: 'Social media',
    fields: [
      ['socials.facebook', 'Facebook link'],
      ['socials.instagram', 'Instagram link'],
      ['socials.tiktok', 'TikTok link'],
      ['socials.youtube', 'YouTube link'],
    ],
  },
  {
    title: 'Delivery & payment',
    fields: [
      ['delivery.insideDhaka', 'Delivery charge inside Dhaka', 'number'],
      ['delivery.outsideDhaka', 'Delivery charge outside Dhaka', 'number'],
      ['delivery.freeDeliveryAbove', 'Free delivery above (empty = never)', 'number'],
      ['payments.cashOnDelivery', 'Accept Cash on Delivery', 'checkbox'],
    ],
  },
  {
    title: 'About page',
    fields: [
      ['about.intro', 'Intro'],
      ['about.storyTitle', 'Story title'],
      ['about.story', 'Story ({store} = store name)'],
      ['about.mission', 'Mission'],
      ['about.vision', 'Vision'],
    ],
  },
  {
    title: 'Homepage hero',
    fields: [
      ['hero.badge', 'Small badge text'],
      ['hero.title', 'Title'],
      ['hero.highlight', 'Highlighted title line'],
      ['hero.subtitle', 'Subtitle'],
      ['hero.ctaLabel', 'Button text'],
    ],
  },
]

const MAX_SLIDES = 8

const get = (obj, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj)
function set(obj, path, value) {
  const keys = path.split('.')
  const copy = structuredClone(obj)
  let target = copy
  for (const key of keys.slice(0, -1)) target = target[key] ??= {}
  target[keys.at(-1)] = value
  return copy
}

// White-label settings: everything brand-specific, editable without code.
export default function AdminSettings() {
  const { data, loading, error } = useApi('/admin/settings')
  const { notify } = useNotify()
  const [values, setValues] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [slideUploading, setSlideUploading] = useState(false)

  useEffect(() => {
    if (data) setValues(data.data)
  }, [data])

  if (loading || !values) return error ? <p className="text-red-600">{error.message}</p> : <Spinner label="Loading settings" />

  async function onLogo(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setValues((v) => ({ ...v, logo: url }))
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const slides = values.hero?.slides || []
  const setSlides = (next) => setValues((v) => set(v, 'hero.slides', next))

  async function onSlideUpload(event) {
    const files = [...event.target.files].slice(0, MAX_SLIDES - slides.length)
    event.target.value = ''
    if (!files.length) return
    setSlideUploading(true)
    try {
      const added = []
      for (const file of files) added.push({ image: await uploadImage(file), alt: '' })
      setValues((v) => set(v, 'hero.slides', [...(v.hero?.slides || []), ...added]))
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSlideUploading(false)
    }
  }

  function moveSlide(index, step) {
    const target = index + step
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSlides(next)
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (slides.length === 0) {
      notify('Keep at least one hero image.', 'error')
      return
    }
    let body = { logo: values.logo || '', hero: { slides } }
    for (const section of SECTIONS) {
      for (const [path, , type] of section.fields) {
        let value = get(values, path)
        if (type === 'number') value = value === '' || value == null ? (path.endsWith('freeDeliveryAbove') ? null : 0) : Number(value)
        if (type !== 'number' && type !== 'checkbox') value = value ?? ''
        body = set(body, path, value)
      }
    }
    setSaving(true)
    try {
      await apiRequest('/admin/settings', { method: 'PATCH', body })
      notify('Settings saved. Reloading…', 'success')
      setTimeout(() => window.location.reload(), 900) // apply new name/colors everywhere
    } catch (err) {
      notify(err.message, 'error')
      setSaving(false)
    }
  }

  const input = 'mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-base sm:text-sm'

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Store settings</h1>
      <p className="mt-1 text-sm text-muted">Change the store’s name, look and details. No code changes needed for a new client.</p>

      <section className="mt-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
        <h2 className="font-bold">Logo</h2>
        <div className="mt-3 flex items-center gap-4">
          {values.logo ? <img src={values.logo} alt="Current logo" className="size-16 rounded-xl border border-line object-contain p-1" /> : null}
          <label className="btn-outline cursor-pointer">
            {uploading ? 'Uploading…' : 'Upload new logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogo} />
          </label>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-5">
        <h2 className="font-bold">Homepage slideshow images</h2>
        <p className="mt-1 text-sm text-muted">
          1 to {MAX_SLIDES} images, changing every 3 seconds. Wide photos look best (about 4:3). JPEG, PNG or WEBP, up to 2 MB. Use the arrows to change the order.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {slides.map((slide, i) => (
            <li key={slide.image} className="overflow-hidden rounded-xl border border-line">
              <div className="relative">
                <img src={slide.image} alt="" className="aspect-[4/3] w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold">{i + 1}</span>
              </div>
              <div className="space-y-2 p-3">
                <label className="block text-xs font-semibold">
                  Short description (for blind users &amp; Google)
                  <input
                    value={slide.alt || ''}
                    maxLength={120}
                    onChange={(e) => setSlides(slides.map((s, j) => (j === i ? { ...s, alt: e.target.value } : s)))}
                    placeholder="e.g. A basket of fresh vegetables"
                    className={input}
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveSlide(i, -1)} disabled={i === 0} className="btn-outline min-h-10 flex-1 px-2 disabled:opacity-30" aria-label={`Move image ${i + 1} earlier`}>
                    ←
                  </button>
                  <button type="button" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="btn-outline min-h-10 flex-1 px-2 disabled:opacity-30" aria-label={`Move image ${i + 1} later`}>
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlides(slides.filter((_, j) => j !== i))}
                    disabled={slides.length === 1}
                    className="min-h-10 flex-1 rounded-full border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
          {slides.length < MAX_SLIDES ? (
            <li>
              <label className={`grid aspect-[4/3] h-full min-h-40 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-primary hover:text-primary ${slideUploading ? 'pointer-events-none opacity-60' : ''}`}>
                {slideUploading ? 'Uploading…' : '+ Add image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onSlideUpload} />
              </label>
            </li>
          ) : null}
        </ul>
        <p className="mt-2 text-xs text-muted">Changes appear on the homepage after you press “Save settings”.</p>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-5">
          <h2 className="font-bold">{section.title}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {section.fields.map(([path, label, type]) => {
              const value = get(values, path)
              const onChange = (e) => setValues((v) => set(v, path, type === 'checkbox' ? e.target.checked : e.target.value))
              if (type === 'checkbox') {
                return (
                  <label key={path} className="flex min-h-11 items-center gap-3 text-sm font-semibold sm:col-span-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={onChange} className="size-5 accent-[var(--brand-primary)]" />
                    {label}
                  </label>
                )
              }
              if (type === 'color') {
                return (
                  <label key={path} className="block text-sm font-semibold">
                    {label}
                    <span className="mt-1 flex items-center gap-2">
                      <input type="color" value={value || '#000000'} onChange={onChange} className="h-11 w-14 cursor-pointer rounded-lg border border-line" />
                      <input value={value || ''} onChange={onChange} className={input + ' mt-0 font-mono'} maxLength={7} />
                    </span>
                  </label>
                )
              }
              return (
                <label key={path} className="block text-sm font-semibold">
                  {label}
                  <input type={type || 'text'} min={type === 'number' ? 0 : undefined} value={value ?? ''} onChange={onChange} className={input} />
                </label>
              )
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 mt-6 border-t border-line bg-cream/95 py-4 backdrop-blur">
        <button type="submit" disabled={saving || uploading || slideUploading} className="btn-primary h-12 w-full text-base sm:w-auto sm:px-10">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}

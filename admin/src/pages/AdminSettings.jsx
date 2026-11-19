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

const MAX_SLIDES = 20
// Uploading slideshow photos is turned off for now: images are added as
// links instead. Set to true to show the upload box again.
const SHOW_SLIDE_UPLOAD = false
// Same rule as the server: a full https:// address, or a path on this site.
const IMAGE_LINK = /^(https:\/\/[^\s"'<>]+|\/[A-Za-z0-9/_.-]+)$/

// Every slide row gets its own id, so typing in a link never mixes up rows.
let nextSlideRowId = 0
const toSlideRows = (slides = []) => slides.map((slide) => ({ ...slide, rowId: ++nextSlideRowId }))

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
    if (data) setValues({ ...data.data, hero: { ...data.data.hero, slides: toSlideRows(data.data.hero?.slides) } })
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
      for (const file of files) added.push({ image: await uploadImage(file), alt: '', rowId: ++nextSlideRowId })
      setValues((v) => set(v, 'hero.slides', [...(v.hero?.slides || []), ...added]))
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSlideUploading(false)
    }
  }

  const addSlideLink = () => setSlides([...slides, { image: '', alt: '', rowId: ++nextSlideRowId }])
  const updateSlide = (rowId, changes) => setSlides(slides.map((slide) => (slide.rowId === rowId ? { ...slide, ...changes } : slide)))

  function moveSlide(index, step) {
    const target = index + step
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSlides(next)
  }

  async function onSubmit(event) {
    event.preventDefault()
    // Empty rows are skipped; every other link must be a valid address.
    const filledSlides = slides
      .map(({ rowId: _rowId, ...slide }) => ({ ...slide, image: slide.image.trim(), alt: (slide.alt || '').trim() }))
      .filter((slide) => slide.image)
    const badIndex = filledSlides.findIndex((slide) => !IMAGE_LINK.test(slide.image))
    if (badIndex !== -1) {
      notify(`Image link ${badIndex + 1} must start with https://`, 'error')
      return
    }
    let body = { logo: values.logo || '', hero: { slides: filledSlides } }
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
          Paste image links (addresses starting with https://). They change every 3 seconds, in this order. Leave the list empty to show
          no slideshow.
        </p>
        <p className="mt-2 rounded-xl bg-primary-soft px-3 py-2 text-sm">
          <span className="font-semibold">Recommended size: 1600 × 1200 pixels</span> (landscape, 4:3 shape). The slideshow is always 4:3,
          so a picture of exactly this shape is shown whole, with nothing cut off. Use at least 1200 × 900 so it stays sharp; smaller
          pictures look blurry or pixelated.
        </p>
        <ul className="mt-3 space-y-3">
          {slides.map((slide, i) => {
            const linkIsValid = IMAGE_LINK.test(slide.image.trim())
            return (
              <li key={slide.rowId} className="flex flex-col gap-3 rounded-xl border border-line p-3 sm:flex-row">
                <div className="relative grid aspect-[4/3] w-full shrink-0 place-items-center overflow-hidden rounded-lg bg-cream text-center text-xs text-muted sm:w-40">
                  {linkIsValid ? (
                    // Shown only if the picture cannot be loaded (the image covers it otherwise).
                    <span className="absolute inset-0 grid place-items-center px-2">Cannot load this image</span>
                  ) : null}
                  {linkIsValid ? (
                    <img
                      src={slide.image.trim()}
                      alt=""
                      className="relative size-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                      onLoad={(e) => (e.currentTarget.style.display = '')}
                    />
                  ) : (
                    <span className="px-2">{slide.image.trim() ? 'Link must start with https://' : 'Preview'}</span>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold">{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="block text-xs font-semibold">
                    Image link
                    <input
                      // Plain text box (not type="url"): links to this site's own
                      // images, like /images/..., are allowed too; checked on save.
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={slide.image}
                      maxLength={500}
                      // A new link replaces the old picture completely.
                      onChange={(e) => updateSlide(slide.rowId, { image: e.target.value, imageSmall: undefined })}
                      placeholder="https://example.com/photo.jpg"
                      aria-invalid={slide.image.trim() && !linkIsValid ? true : undefined}
                      className={`${input} ${slide.image.trim() && !linkIsValid ? 'border-red-500' : ''}`}
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Short description (for blind users &amp; Google)
                    <input
                      value={slide.alt || ''}
                      maxLength={120}
                      onChange={(e) => updateSlide(slide.rowId, { alt: e.target.value })}
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
                      onClick={() => setSlides(slides.filter((other) => other.rowId !== slide.rowId))}
                      className="min-h-10 flex-1 rounded-full border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
          {slides.length === 0 ? (
            <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No slideshow images yet.</li>
          ) : null}
        </ul>
        <div className="mt-3 flex flex-wrap gap-3">
          {slides.length < MAX_SLIDES ? (
            <button type="button" onClick={addSlideLink} className="btn-outline">
              + Add image link
            </button>
          ) : null}
          {/* Upload option: kept for later, hidden for now (see SHOW_SLIDE_UPLOAD). */}
          {SHOW_SLIDE_UPLOAD && slides.length < MAX_SLIDES ? (
            <label className={`btn-outline cursor-pointer ${slideUploading ? 'pointer-events-none opacity-60' : ''}`}>
              {slideUploading ? 'Uploading…' : '+ Upload image'}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onSlideUpload} />
            </label>
          ) : null}
        </div>
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

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import FormField from '../components/ui/FormField.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useNotify } from '../context/NotifyContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { apiRequest, uploadImage } from '../lib/api.js'
import { flattenCategories } from '../lib/categoryOptions.js'
import { storeUrl } from '../lib/storeUrl.js'

const MAX_IMAGES = 8
// Uploading product photos is turned off for now: photos are added as links
// instead. Set to true to show the upload box again.
const SHOW_IMAGE_UPLOAD = false
// Same rule as the server: a full https:// address, or a path on this site.
const IMAGE_LINK = /^(https:\/\/[^\s"'<>]+|\/[A-Za-z0-9/_.-]+)$/

// Every image row gets its own id, so typing in a link never mixes up rows.
let nextImageRowId = 0
const toImageRows = (urls = []) => urls.map((url) => ({ url, rowId: ++nextImageRowId }))

const EMPTY = {
  name: '',
  category: '',
  unit: 'kg',
  sku: '',
  description: '',
  price: '',
  discountPrice: '',
  costPrice: '',
  stock: '0',
  isPublished: true,
  isFeatured: false,
  images: [],
}

function toForm(p) {
  return {
    name: p.name,
    category: p.category?._id || p.category || '',
    unit: p.unit || '',
    sku: p.sku || '',
    description: p.description || '',
    price: String(p.price ?? ''),
    discountPrice: p.discountPrice == null ? '' : String(p.discountPrice),
    costPrice: p.costPrice == null ? '' : String(p.costPrice),
    stock: String(p.stock ?? 0),
    isPublished: p.isPublished,
    isFeatured: p.isFeatured,
    images: toImageRows(p.images),
  }
}

// Same rules as the server (the server checks again).
function validate(f) {
  const e = {}
  if (!f.name.trim()) e.name = 'Enter a product name.'
  if (!f.category) e.category = 'Choose a category.'
  const price = Number(f.price)
  if (f.price === '' || !(price >= 0)) e.price = 'Enter a price of 0 or more.'
  if (f.discountPrice !== '' && !(Number(f.discountPrice) >= 0 && Number(f.discountPrice) < price)) {
    e.discountPrice = 'Must be lower than the regular price (or empty).'
  }
  if (f.costPrice !== '' && !(Number(f.costPrice) >= 0)) e.costPrice = 'Enter 0 or more (or leave empty).'
  if (!/^\d+$/.test(String(f.stock))) e.stock = 'Enter a whole number (0 or more).'
  const badLink = f.images.findIndex((row) => row.url.trim() && !IMAGE_LINK.test(row.url.trim()))
  if (badLink !== -1) e.images = `Image link ${badLink + 1} must start with https://`
  return e
}

// Add product (/admin/products/new) and edit product (/admin/products/:id)
export default function AdminProductForm() {
  const { id } = useParams()
  const creating = !id
  const navigate = useNavigate()
  const { notify } = useNotify()
  const existing = useApi(creating ? null : `/admin/products/${id}`)
  const categories = useApi('/admin/categories')
  const options = useMemo(() => flattenCategories(categories.data?.data.tree || []), [categories.data])

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInput = useRef(null)

  useEffect(() => {
    if (existing.data) setForm(toForm(existing.data.data))
  }, [existing.data])

  if (!creating && existing.loading && !existing.data) return <Spinner label="Loading product" />
  if (!creating && existing.error) return <p className="text-red-600">{existing.error.message}</p>

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function onUpload(event) {
    const files = [...event.target.files].slice(0, MAX_IMAGES - form.images.length)
    event.target.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const url = await uploadImage(file)
        setForm((f) => ({ ...f, images: [...f.images, { url, rowId: ++nextImageRowId }] }))
      }
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const addImageLink = () => setForm((f) => ({ ...f, images: [...f.images, { url: '', rowId: ++nextImageRowId }] }))
  const updateImageLink = (rowId, url) => {
    setForm((f) => ({ ...f, images: f.images.map((row) => (row.rowId === rowId ? { ...row, url } : row)) }))
    setErrors((e) => ({ ...e, images: undefined })) // checked again on save
  }
  const removeImage = (rowId) => setForm((f) => ({ ...f, images: f.images.filter((row) => row.rowId !== rowId) }))

  function moveImage(index, direction) {
    setForm((f) => {
      const images = [...f.images]
      const target = index + direction
      if (target < 0 || target >= images.length) return f
      ;[images[index], images[target]] = [images[target], images[index]]
      return { ...f, images }
    })
  }

  async function onSubmit(event) {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      notify('Please fix the highlighted fields', 'error')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      price: Number(form.price),
      discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
      costPrice: form.costPrice === '' ? null : Number(form.costPrice),
      stock: Number(form.stock),
      // Empty link boxes are skipped.
      images: form.images.map((row) => row.url.trim()).filter(Boolean),
    }
    try {
      const body = await apiRequest(creating ? '/admin/products' : `/admin/products/${id}`, {
        method: creating ? 'POST' : 'PATCH',
        body: payload,
      })
      notify(creating ? 'Product added' : 'Changes saved', 'success')
      if (creating) navigate(`/admin/products/${body.data._id}`, { replace: true })
      else setForm(toForm(body.data))
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    try {
      await apiRequest(`/admin/products/${id}`, { method: 'DELETE' })
      notify('Product deleted', 'success')
      navigate('/admin/products', { replace: true })
    } catch (err) {
      notify(err.message, 'error')
      setConfirmDelete(false)
    }
  }

  const product = existing.data?.data
  const card = 'rounded-2xl border border-line bg-white p-4 sm:p-5'

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-4xl">
      <Link to="/admin/products" className="text-sm font-semibold text-primary hover:underline">
        ← All products
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{creating ? 'Add product' : form.name || 'Edit product'}</h1>
        {product?.isPublished ? (
          <a href={storeUrl(`/product/${product.slug}`)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">
            View in store ↗
          </a>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className={card}>
            <h2 className="font-bold">Basic information</h2>
            <div className="mt-4 space-y-4">
              <FormField label="Product name" value={form.name} onChange={set('name')} error={errors.name} maxLength={150} />
              <div>
                <label htmlFor="category" className="mb-1.5 block text-sm font-semibold">
                  Category
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={set('category')}
                  aria-invalid={errors.category ? true : undefined}
                  className={`h-12 w-full rounded-xl border bg-white px-3 text-base ${errors.category ? 'border-red-500' : 'border-line'}`}
                >
                  <option value="">Choose a category…</option>
                  {options.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.label}
                      {o.isVisible ? '' : ' (hidden)'}
                    </option>
                  ))}
                </select>
                {errors.category ? <p className="mt-1.5 text-sm text-red-600">{errors.category}</p> : null}
                <p className="mt-1.5 text-xs text-muted">A product can be placed in a main category or in any subcategory.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Unit" value={form.unit} onChange={set('unit')} hint="e.g. kg, dozen, litre, pack, 500 g" maxLength={30} />
                <FormField label="SKU (optional)" value={form.sku} onChange={set('sku')} hint="Your own product code" maxLength={60} />
              </div>
              <div>
                <label htmlFor="description" className="mb-1.5 block text-sm font-semibold">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={5}
                  maxLength={5000}
                  value={form.description}
                  onChange={set('description')}
                  className="w-full rounded-xl border border-line p-3 text-base"
                />
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className="font-bold">Images</h2>
            <p className="mt-1 text-sm text-muted">
              Paste image links (addresses starting with https://), up to {MAX_IMAGES}. The first image is the main photo.
            </p>
            <p className="mt-2 rounded-xl bg-primary-soft px-3 py-2 text-sm">
              <span className="font-semibold">Recommended size: 1000 × 1000 pixels</span> (square, 1:1 shape). Product photos are always shown
              square, so a square picture is shown whole, with nothing cut off. Use at least 800 × 800 so it stays sharp; smaller pictures
              look blurry or pixelated. Keep the product in the middle with a little space around it.
            </p>
            {errors.images ? <p className="mt-2 text-sm text-red-600">{errors.images}</p> : null}
            <ul className="mt-4 space-y-3">
              {form.images.map((row, i) => {
                const link = row.url.trim()
                const linkIsValid = IMAGE_LINK.test(link)
                return (
                  <li key={row.rowId} className="flex gap-3 rounded-xl border border-line p-2.5">
                    <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream text-center text-[10px] leading-tight text-muted sm:size-24">
                      {linkIsValid ? (
                        // Shown only if the picture cannot be loaded (the image covers it otherwise).
                        <span className="absolute inset-0 grid place-items-center px-1">Cannot load image</span>
                      ) : (
                        <span className="px-1">{link ? 'Must start with https://' : 'Preview'}</span>
                      )}
                      {linkIsValid ? (
                        <img
                          src={link}
                          alt={`Product image ${i + 1}`}
                          className="relative size-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          onLoad={(e) => (e.currentTarget.style.display = '')}
                        />
                      ) : null}
                      {i === 0 ? <span className="absolute left-1 top-1 rounded-full bg-primary px-2 text-[10px] font-bold text-white">Main</span> : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="block text-xs font-semibold">
                        Image link {i + 1}
                        <input
                          // Plain text box (not type="url"): links to this site's own
                          // images, like /images/..., are allowed too; checked on save.
                          type="text"
                          inputMode="url"
                          autoComplete="off"
                          spellCheck={false}
                          value={row.url}
                          maxLength={500}
                          onChange={(e) => updateImageLink(row.rowId, e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          aria-invalid={link && !linkIsValid ? true : undefined}
                          className={`mt-1 h-11 w-full rounded-xl border bg-white px-3 text-base sm:text-sm ${link && !linkIsValid ? 'border-red-500' : 'border-line'}`}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="btn-outline min-h-9 flex-1 px-2 disabled:opacity-30" aria-label={`Move image ${i + 1} earlier`}>
                          ←
                        </button>
                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="btn-outline min-h-9 flex-1 px-2 disabled:opacity-30" aria-label={`Move image ${i + 1} later`}>
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(row.rowId)}
                          className="min-h-9 flex-1 rounded-full border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                          aria-label={`Remove image ${i + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
              {form.images.length === 0 ? (
                <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No images yet.</li>
              ) : null}
            </ul>
            <div className="mt-3 flex flex-wrap gap-3">
              {form.images.length < MAX_IMAGES ? (
                <button type="button" onClick={addImageLink} className="btn-outline">
                  + Add image link
                </button>
              ) : null}
              {/* Upload option: kept for later, hidden for now (see SHOW_IMAGE_UPLOAD). */}
              {SHOW_IMAGE_UPLOAD && form.images.length < MAX_IMAGES ? (
                <>
                  <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="btn-outline">
                    {uploading ? 'Uploading…' : '+ Upload image'}
                  </button>
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onUpload} />
                </>
              ) : null}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className={card}>
            <h2 className="font-bold">Price & stock</h2>
            <div className="mt-4 space-y-4">
              <FormField label="Regular price" type="number" inputMode="decimal" min="0" value={form.price} onChange={set('price')} error={errors.price} />
              <FormField
                label="Discount price (optional)"
                type="number"
                inputMode="decimal"
                min="0"
                value={form.discountPrice}
                onChange={set('discountPrice')}
                error={errors.discountPrice}
                hint="Customers pay this when set."
              />
              <FormField
                label="Cost price (optional)"
                type="number"
                inputMode="decimal"
                min="0"
                value={form.costPrice}
                onChange={set('costPrice')}
                error={errors.costPrice}
                hint="Only for your reports. Never shown to customers."
              />
              <FormField label="Stock" type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={set('stock')} error={errors.stock} />
            </div>
          </section>

          <section className={card}>
            <h2 className="font-bold">Visibility</h2>
            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} className="size-5 accent-[var(--brand-primary)]" />
              <span>
                <span className="block font-semibold">Published</span>
                <span className="text-xs text-muted">Visible and buyable in the store</span>
              </span>
            </label>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} className="size-5 accent-[var(--brand-primary)]" />
              <span>
                <span className="block font-semibold">Featured</span>
                <span className="text-xs text-muted">Shown in the homepage slider</span>
              </span>
            </label>
          </section>

          <button type="submit" disabled={saving || uploading} className="btn-primary h-12 w-full text-base">
            {saving ? 'Saving…' : creating ? 'Add product' : 'Save changes'}
          </button>

          {!creating ? (
            <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm">
              {confirmDelete ? (
                <>
                  <p>Delete this product permanently? Products that were ordered cannot be deleted - hide them instead.</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={onDelete} className="btn bg-red-600 text-white hover:bg-red-700">
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="btn-outline">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="font-semibold text-red-600 underline">
                  Delete product
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </form>
  )
}

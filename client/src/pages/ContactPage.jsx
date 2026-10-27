import { useState } from 'react'
import FormField from '../components/ui/FormField.jsx'
import Icon from '../components/ui/Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { apiRequest } from '../lib/api.js'
import { formatPhone } from '../lib/format.js'

export default function ContactPage() {
  const { contact = {}, socials = {} } = useSettings()
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '', subject: '', message: '', website: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [serverError, setServerError] = useState('')

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(event) {
    event.preventDefault()
    const found = {}
    if (form.name.trim().length < 2) found.name = 'Enter your name.'
    if (!form.phone.trim() && !form.email.trim()) found.phone = 'Give a phone number or an email so we can reply.'
    if (form.message.trim().length < 10) found.message = 'Write at least 10 characters.'
    setErrors(found)
    if (Object.keys(found).length) return

    setStatus('sending')
    setServerError('')
    try {
      await apiRequest('/contact', { method: 'POST', body: form })
      setStatus('sent') // only after the server saved it
    } catch (err) {
      setServerError(err.message)
      setStatus('idle')
    }
  }

  const info = [
    contact.phone && { icon: 'phone', label: 'Call us', value: formatPhone(contact.phone), href: `tel:${contact.phone}` },
    contact.email && { icon: 'mail', label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    contact.address && { icon: 'pin', label: 'Visit us', value: contact.address, href: contact.mapUrl },
  ].filter(Boolean)

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contact us</h1>
      <p className="mt-2 max-w-xl text-muted">Questions about an order or a product? We’re happy to help.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          {info.map((item) => (
            <a
              key={item.label}
              href={item.href || undefined}
              target={item.icon === 'pin' ? '_blank' : undefined}
              rel="noreferrer"
              className="flex gap-4 rounded-2xl border border-line bg-white p-5 transition hover:border-primary"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon name={item.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted">{item.label}</span>
                <span className="block break-words font-semibold">{item.value}</span>
              </span>
            </a>
          ))}
          {Object.values(socials).some(Boolean) ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(socials)
                .filter(([, url]) => url)
                .map(([key, url]) => (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="btn-outline capitalize">
                    {key}
                  </a>
                ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          {status === 'sent' ? (
            <div className="py-10 text-center" role="status">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-2xl text-white">✓</span>
              <h2 className="mt-4 text-xl font-bold">Message sent</h2>
              <p className="mt-1 text-muted">Thank you! We’ll get back to you soon.</p>
              <button type="button" className="btn-outline mt-6" onClick={() => { setStatus('idle'); setForm((f) => ({ ...f, subject: '', message: '' })) }}>
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <h2 className="text-lg font-bold">Send us a message</h2>
              {serverError ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p> : null}
              <FormField label="Your name" value={form.name} onChange={update('name')} error={errors.name} maxLength={60} autoComplete="name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Mobile number" type="tel" value={form.phone} onChange={update('phone')} error={errors.phone} autoComplete="tel" />
                <FormField label="Email" type="email" value={form.email} onChange={update('email')} autoComplete="email" />
              </div>
              <FormField label="Subject (optional)" value={form.subject} onChange={update('subject')} maxLength={120} />
              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-semibold">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  maxLength={2000}
                  value={form.message}
                  onChange={update('message')}
                  aria-invalid={errors.message ? true : undefined}
                  className={`w-full rounded-xl border p-3 text-base ${errors.message ? 'border-red-500' : 'border-line'}`}
                />
                {errors.message ? <p className="mt-1.5 text-sm text-red-600">{errors.message}</p> : null}
              </div>
              {/* Trap field for spam bots - hidden from people */}
              <input type="text" name="website" value={form.website} onChange={update('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <button type="submit" disabled={status === 'sending'} className="btn-primary h-12 w-full text-base sm:w-auto sm:px-8">
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

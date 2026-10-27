import { useState } from 'react'
import Spinner from '../../components/ui/Spinner.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import { apiRequest } from '../../lib/api.js'
import { formatDate } from '../../lib/orders.jsx'

const LABEL = { new: 'New', read: 'Read', replied: 'Replied' }

// Messages sent from the Contact page.
export default function AdminMessages() {
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useApi(`/admin/messages${status ? `?status=${status}` : ''}`)
  const { notify } = useCart()
  const messages = data?.data || []

  async function mark(message, next) {
    try {
      await apiRequest(`/admin/messages/${message._id}`, { method: 'PATCH', body: { status: next } })
      reload()
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Messages {data?.unread ? <span className="text-accent-dark">({data.unread} new)</span> : null}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {['', 'new', 'read', 'replied'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${status === s ? 'border-primary bg-primary text-white' : 'border-line bg-white'}`}
          >
            {s ? LABEL[s] : 'All'}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading && !data ? <Spinner label="Loading messages" /> : null}
        {error ? <p className="text-red-600">{error.message}</p> : null}
        {data && messages.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">No messages.</p> : null}
        {messages.map((m) => (
          <article key={m._id} className={`rounded-2xl border bg-white p-4 sm:p-5 ${m.status === 'new' ? 'border-accent' : 'border-line'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-bold">{m.subject || 'No subject'}</h2>
                <p className="text-sm text-muted">
                  {m.name}
                  {m.phone ? (
                    <>
                      {' · '}
                      <a href={`tel:${m.phone}`} className="font-semibold text-primary underline">
                        {m.phone}
                      </a>
                    </>
                  ) : null}
                  {m.email ? (
                    <>
                      {' · '}
                      <a href={`mailto:${m.email}`} className="font-semibold text-primary underline">
                        {m.email}
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
              <span className="text-xs text-muted">{formatDate(m.createdAt)}</span>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.keys(LABEL)
                .filter((s) => s !== m.status)
                .map((s) => (
                  <button key={s} type="button" onClick={() => mark(m, s)} className="min-h-9 rounded-full border border-line px-3 text-xs font-semibold hover:border-primary">
                    Mark as {LABEL[s].toLowerCase()}
                  </button>
                ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

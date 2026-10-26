import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import FormField from '../components/ui/FormField.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Only allow going back to pages on this site (never to another website).
export function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account'
}

const NOTICES = {
  checkout: 'Please log in or create an account to place your order. Your cart is saved.',
}

export default function LoginPage() {
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (ready && user) return <Navigate to={next} replace />

  async function onSubmit(event) {
    event.preventDefault()
    if (!form.identifier.trim() || !form.password) {
      setError('Enter your email or mobile number and your password.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await login(form.identifier.trim(), form.password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))
  const registerLink = `/register${params.toString() ? `?${params}` : ''}`

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your account" notice={NOTICES[params.get('reason')]}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        <FormField
          label="Email or mobile number"
          name="identifier"
          autoComplete="username"
          inputMode="email"
          value={form.identifier}
          onChange={update('identifier')}
          placeholder="you@example.com or 01XXXXXXXXX"
          required
        />
        <FormField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          required
        />
        <button type="submit" disabled={submitting} className="btn-primary h-12 w-full text-base">
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to={registerLink} className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import FormField from '../components/ui/FormField.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { safeNext } from './LoginPage.jsx'

// Same rules as the server (the server checks again).
function validate(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  const phone = form.phone.replace(/\D/g, '').replace(/^880/, '0')
  if (!/^01[3-9]\d{8}$/.test(phone)) errors.phone = 'Enter an 11-digit mobile number starting with 01.'
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'Use at least 8 characters with a letter and a number.'
  }
  if (form.confirm !== form.password) errors.confirm = 'Passwords do not match.'
  return errors
}

export default function RegisterPage() {
  const { user, ready, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (ready && user) return <Navigate to={next} replace />

  async function onSubmit(event) {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    setServerError('')
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone, password: form.password })
      navigate(next, { replace: true })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  return (
    <AuthLayout title="Create your account" subtitle="It only takes a minute">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {serverError}
          </p>
        ) : null}
        <FormField label="Full name" name="name" autoComplete="name" value={form.name} onChange={update('name')} error={errors.name} />
        <FormField
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          value={form.phone}
          onChange={update('phone')}
          error={errors.phone}
          hint="Used for delivery updates."
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <FormField
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />
        <button type="submit" disabled={submitting} className="btn-primary h-12 w-full text-base">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to={`/login${params.toString() ? `?${params}` : ''}`} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}

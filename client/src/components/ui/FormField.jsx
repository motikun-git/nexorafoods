import { useId, useState } from 'react'

// Label + input + help/error text, with a show/hide button for passwords.
export default function FormField({ label, type = 'text', error, hint, className = '', ...inputProps }) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-xl border bg-white px-4 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 ${
            error ? 'border-red-500' : 'border-line'
          } ${isPassword ? 'pr-20' : ''}`}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 top-1 h-10 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <div role="status" className={`flex items-center gap-3 text-muted ${className}`}>
      <span className="size-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      <span className="text-sm">{label}…</span>
    </div>
  )
}

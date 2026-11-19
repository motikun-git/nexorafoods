// Labels and colors for order statuses, shared by the account and order pages.
export const ORDER_STATUS = {
  pending: { label: 'Pending', className: 'bg-accent-soft text-accent-dark' },
  confirmed: { label: 'Confirmed', className: 'bg-primary-soft text-primary' },
  processing: { label: 'Processing', className: 'bg-primary-soft text-primary' },
  shipped: { label: 'On the way', className: 'bg-sky-50 text-sky-700' },
  delivered: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700' },
}

// Normal order journey, used for the progress steps.
export const ORDER_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export const AREA_LABEL = { inside_dhaka: 'Inside Dhaka', outside_dhaka: 'Outside Dhaka' }

export function formatDate(value) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StatusBadge({ status }) {
  const info = ORDER_STATUS[status] || { label: status, className: 'bg-line text-ink' }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${info.className}`}>{info.label}</span>
}

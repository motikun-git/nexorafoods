// The online payment methods the store will accept. They are shown in the
// footer and at checkout; ordering with them is not switched on yet
// (orders are Cash on Delivery for now).
// Plain text badges are used on purpose: no copies of the companies' logos.
export const ONLINE_PAYMENT_METHODS = [
  { id: 'bkash', name: 'bKash', kind: 'Mobile banking' },
  { id: 'nagad', name: 'Nagad', kind: 'Mobile banking' },
  { id: 'visa', name: 'Visa', kind: 'Card' },
  { id: 'mastercard', name: 'Mastercard', kind: 'Card' },
]

// Small badges, e.g. in the footer: [Cash on Delivery] [bKash] [Nagad] [Visa] [Mastercard]
export function PaymentBadges({ className = '', badgeClassName = '' }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Payment methods">
      {[{ id: 'cod', name: 'Cash on Delivery' }, ...ONLINE_PAYMENT_METHODS].map((method) => (
        <li key={method.id} className={`rounded-md px-2.5 py-1 text-xs font-bold ${badgeClassName}`}>
          {method.name}
        </li>
      ))}
    </ul>
  )
}

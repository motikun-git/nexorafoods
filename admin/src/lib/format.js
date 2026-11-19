// "৳1,250" / "৳99.50" using the store's currency settings.
export function formatPrice(amount, currency = { symbol: '৳', locale: 'en-BD' }) {
  const number = Number(amount) || 0
  const text = number.toLocaleString(currency.locale || 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return `${currency.symbol || ''}${text}`
}

// "+8801313552299" -> "+880 1313-552299" (simple, readable)
export function formatPhone(phone = '') {
  const match = String(phone).match(/^\+880(\d{4})(\d+)$/)
  return match ? `+880 ${match[1]}-${match[2]}` : phone
}

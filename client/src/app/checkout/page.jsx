import { Suspense } from 'react'
import RequireAuth from '../../components/auth/RequireAuth.jsx'
import CheckoutPage from '../../views/CheckoutPage.jsx'

export const metadata = { title: 'Checkout', robots: { index: false } }

export default function Checkout() {
  return (
    <Suspense>
      <RequireAuth reason="checkout">
        <CheckoutPage />
      </RequireAuth>
    </Suspense>
  )
}

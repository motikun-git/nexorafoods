import { Suspense } from 'react'
import RequireAuth from '../../../components/auth/RequireAuth.jsx'
import OrderPage from '../../../views/OrderPage.jsx'

export const metadata = { title: 'Order', robots: { index: false } }

export default function Order() {
  return (
    <Suspense>
      <RequireAuth>
        <OrderPage />
      </RequireAuth>
    </Suspense>
  )
}

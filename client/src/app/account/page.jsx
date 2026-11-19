import { Suspense } from 'react'
import RequireAuth from '../../components/auth/RequireAuth.jsx'
import AccountPage from '../../views/AccountPage.jsx'

export const metadata = { title: 'My account', robots: { index: false } }

export default function Account() {
  return (
    <Suspense>
      <RequireAuth>
        <AccountPage />
      </RequireAuth>
    </Suspense>
  )
}

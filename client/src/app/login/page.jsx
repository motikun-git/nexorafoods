import { Suspense } from 'react'
import LoginPage from '../../views/LoginPage.jsx'

export const metadata = { title: 'Log in', robots: { index: false } }

export default function Login() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}

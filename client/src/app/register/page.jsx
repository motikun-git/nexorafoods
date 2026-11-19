import { Suspense } from 'react'
import RegisterPage from '../../views/RegisterPage.jsx'

export const metadata = { title: 'Create account', robots: { index: false } }

export default function Register() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  )
}

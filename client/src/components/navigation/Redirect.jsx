'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Sends the visitor to another page, replacing the current one in the
// history (so "Back" does not return here). Shows nothing meanwhile.
export default function Redirect({ to }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(to)
  }, [router, to])
  return null
}

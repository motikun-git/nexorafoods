'use client'

import { useEffect, useState } from 'react'

// true when the visitor asked their device to reduce animations.
export function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  // false on the server (no screen there); the real value is read in the browser.
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return undefined
    const onChange = () => setReduce(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduce
}

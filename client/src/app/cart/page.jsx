'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCart } from '../../context/CartContext.jsx'

// Old /cart links open the cart drawer on the shop page.
export default function CartRoute() {
  const { openDrawer } = useCart()
  const router = useRouter()
  useEffect(() => {
    openDrawer()
    router.replace('/shop')
  }, [openDrawer, router])
  return null
}

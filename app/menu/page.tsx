import { Suspense } from 'react'
import { MenuClient } from '@/components/menu-client'

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

function MenuLoading() {
  return (
    <div 
      className="min-h-dvh w-full overflow-x-hidden flex items-center justify-center" 
      style={{ backgroundColor: '#400810' }}
    >
      <div className="text-white text-lg">Loading menu...</div>
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuLoading />}>
      <MenuClient />
    </Suspense>
  )
}

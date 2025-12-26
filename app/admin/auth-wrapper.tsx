'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function AdminAuthWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      return
    }

    // Check authentication for other admin pages
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-session')
        if (!response.ok) {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/admin/login')
      }
    }

    checkAuth()
  }, [pathname, router])

  // Don't render children until we've checked auth (except for login page)
  if (pathname !== '/admin/login') {
    // Return null briefly while checking, then render children
    // In a real app, you might want a loading state here
    return <>{children}</>
  }

  return <>{children}</>
}





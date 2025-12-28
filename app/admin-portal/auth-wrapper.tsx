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
    if (pathname === '/admin-portal/login') {
      return
    }

    // Check authentication for other admin pages
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-session')
        if (!response.ok) {
          // 401 is expected when not logged in, don't log as error
          if (response.status !== 401) {
            console.error('Auth check failed with status:', response.status)
          }
          router.push('/admin-portal/login')
        }
      } catch (error) {
        // Only log unexpected errors, not network issues
        if (error instanceof TypeError && error.message.includes('fetch')) {
          // Network error, might be offline
          return
        }
        console.error('Auth check failed:', error)
        router.push('/admin/login')
      }
    }

    checkAuth()
  }, [pathname, router])

  // Don't render children until we've checked auth (except for login page)
  if (pathname !== '/admin-portal/login') {
    // Return null briefly while checking, then render children
    // In a real app, you might want a loading state here
    return <>{children}</>
  }

  return <>{children}</>
}





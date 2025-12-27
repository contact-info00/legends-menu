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
    // Session expires in 5 seconds, so PIN is required every time
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-session', {
          cache: 'no-store', // Don't cache the auth check
        })
        if (!response.ok) {
          // Session expired or not authenticated - redirect to login
          router.push('/admin-portal/login')
        }
      } catch (error) {
        // Network error or other issue - redirect to login
        router.push('/admin-portal/login')
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





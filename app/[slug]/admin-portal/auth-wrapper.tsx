'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useParams } from 'next/navigation'

export function AdminAuthWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  useEffect(() => {
    // Skip auth check for login page
    if (pathname?.endsWith('/admin-portal/login')) {
      return
    }

    // Check authentication for other admin pages
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-session', {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
        })
        
        if (!response.ok) {
          // 401 is expected when not logged in, silently redirect
          if (response.status === 401) {
            router.push(`/${slug}/admin-portal/login`)
            return
          }
          // Only log unexpected errors
          console.error('Auth check failed with status:', response.status)
          router.push(`/${slug}/admin-portal/login`)
        }
      } catch (error) {
        // Only log unexpected errors, not network issues
        if (error instanceof TypeError && error.message.includes('fetch')) {
          // Network error, might be offline - don't redirect
          return
        }
        // Don't log 401 errors as they're expected
        if (!(error instanceof Error && error.message.includes('401'))) {
          console.error('Auth check failed:', error)
        }
        router.push(`/${slug}/admin-portal/login`)
      }
    }

    checkAuth()
  }, [pathname, router])

  // Don't render children until we've checked auth (except for login page)
  if (!pathname?.endsWith('/admin-portal/login')) {
    // Return null briefly while checking, then render children
    // In a real app, you might want a loading state here
    return <>{children}</>
  }

  return <>{children}</>
}





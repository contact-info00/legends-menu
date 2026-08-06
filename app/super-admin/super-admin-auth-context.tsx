'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

type SuperAdminAuthContextValue = {
  authStatus: AuthStatus
  isAuthenticated: boolean
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue>({
  authStatus: 'checking',
  isAuthenticated: false,
})

export function SuperAdminAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname?.endsWith('/super-admin/login') ?? false
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isLoginPage ? 'unauthenticated' : 'checking'
  )

  const checkSession = useCallback(async () => {
    if (isLoginPage) {
      setAuthStatus('unauthenticated')
      return false
    }

    setAuthStatus('checking')

    try {
      const response = await fetch('/api/super-admin/check-session', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        setAuthStatus('authenticated')
        return true
      }

      setAuthStatus('unauthenticated')
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.')
      } else {
        toast.error('Unable to verify Super Admin session.')
      }
      router.push('/super-admin/login')
      return false
    } catch {
      setAuthStatus('unauthenticated')
      toast.error('Unable to verify Super Admin session.')
      router.push('/super-admin/login')
      return false
    }
  }, [isLoginPage, router])

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  if (!isLoginPage && authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-400">
        Verifying session...
      </div>
    )
  }

  if (!isLoginPage && authStatus === 'unauthenticated') {
    return null
  }

  return (
    <SuperAdminAuthContext.Provider
      value={{
        authStatus,
        isAuthenticated: authStatus === 'authenticated',
      }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  )
}

export function useSuperAdminAuth() {
  return useContext(SuperAdminAuthContext)
}

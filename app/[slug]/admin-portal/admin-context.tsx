'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'

interface AdminSession {
  authenticated: boolean
  restaurantId: string | null
  restaurantSlug: string | null
  adminUserId: string | null
}

interface AdminBootstrap {
  restaurant: {
    id: string
    slug: string
  }
  uiSettings: any
  settings: any
  theme: any
  menuStructure: {
    sections: Array<{
      id: string
      nameEn: string
      nameKu: string
      nameAr: string
      sortOrder: number
      isActive: boolean
      categories: Array<{
        id: string
        nameEn: string
        nameKu: string
        nameAr: string
        sortOrder: number
        isActive: boolean
        itemCount: number
      }>
    }>
  }
}

interface AdminContextType {
  session: AdminSession | null
  bootstrap: AdminBootstrap | null
  isLoadingSession: boolean
  isLoadingBootstrap: boolean
  error: Error | null
  mutateSession: () => Promise<any>
  mutateBootstrap: () => Promise<any>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

// Fetcher functions
const sessionFetcher = async (url: string): Promise<AdminSession> => {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    if (response.status === 401) {
      return {
        authenticated: false,
        restaurantId: null,
        restaurantSlug: null,
        adminUserId: null,
      }
    }
    throw new Error(`Session check failed: ${response.status}`)
  }
  const data = await response.json()
  return {
    authenticated: data.authenticated,
    restaurantId: data.restaurantId,
    restaurantSlug: data.restaurantSlug,
    adminUserId: data.adminUserId,
  }
}

const bootstrapFetcher = async (url: string): Promise<AdminBootstrap> => {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(`Bootstrap failed: ${response.status}`)
  }
  return response.json()
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const slug = params.slug as string

  // Fetch session with SWR
  const {
    data: session,
    error: sessionError,
    isLoading: isLoadingSession,
    mutate: mutateSession,
  } = useSWR<AdminSession>(
    '/api/admin/check-session',
    sessionFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      refreshInterval: 60000, // Refresh every 60 seconds
    }
  )

  // Fetch bootstrap with SWR (only if authenticated)
  const {
    data: bootstrap,
    error: bootstrapError,
    isLoading: isLoadingBootstrap,
    mutate: mutateBootstrap,
  } = useSWR<AdminBootstrap>(
    session?.authenticated ? `/api/${slug}/admin/bootstrap` : null,
    bootstrapFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  const error = sessionError || bootstrapError || null

  return (
    <AdminContext.Provider
      value={{
        session: session || null,
        bootstrap: bootstrap || null,
        isLoadingSession,
        isLoadingBootstrap,
        error,
        mutateSession,
        mutateBootstrap,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

// Helper hook for pages that need bootstrap data
export function useAdminBootstrap() {
  const {
    bootstrap,
    isLoadingBootstrap,
    isLoadingSession,
    session,
    mutateBootstrap,
  } = useAdmin()
  return {
    bootstrap,
    session,
    isLoading: isLoadingSession || isLoadingBootstrap,
    isLoadingSession,
    isLoadingBootstrap,
    refresh: mutateBootstrap,
  }
}

/** Restaurant ID once session + bootstrap have settled. */
export function useAdminRestaurantId(): string | null {
  const { session, bootstrap, isLoadingSession, isLoadingBootstrap } = useAdmin()

  if (isLoadingSession || isLoadingBootstrap) {
    return null
  }

  return (
    session?.restaurantId ??
    bootstrap?.settings?.id ??
    bootstrap?.restaurant?.id ??
    null
  )
}

/** True when admin is authenticated and restaurant context is available. */
export function useAdminReady(): boolean {
  const restaurantId = useAdminRestaurantId()
  const { session, isLoadingSession } = useAdmin()
  if (isLoadingSession) {
    return false
  }
  return Boolean(session?.authenticated && restaurantId)
}

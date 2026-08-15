import { notFound } from 'next/navigation'
import { getCachedThemeForSlug } from '@/lib/theme-server'

// Slug existence check is safe to cache briefly; deleted restaurants may 404 for up to 60s.
export const revalidate = 60
export const runtime = 'nodejs'

interface LayoutProps {
  children: React.ReactNode
  params: {
    slug: string
  }
}

export default async function SlugLayout({ children, params }: LayoutProps) {
  const { slug } = params

  // A null payload means the slug has no restaurant, so this doubles as the existence check.
  const themePayload = await getCachedThemeForSlug(slug)

  if (!themePayload) {
    notFound()
  }

  const themeScript = `window.__INITIAL_THEME__=${JSON.stringify(themePayload)};`

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: themeScript }}
        suppressHydrationWarning
      />
      {children}
    </>
  )
}

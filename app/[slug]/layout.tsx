import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
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

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!restaurant) {
    notFound()
  }

  const themePayload = await getCachedThemeForSlug(slug)
  const themeScript = themePayload
    ? `window.__INITIAL_THEME__=${JSON.stringify(themePayload)};`
    : ''

  return (
    <>
      {themeScript ? (
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
      ) : null}
      {children}
    </>
  )
}

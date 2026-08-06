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
  const layoutStarted = Date.now()
  console.log(`[SSR /[slug]/layout] slug=${slug} start`)

  try {
    const restaurantStarted = Date.now()
    console.log(`[SSR /[slug]/layout] step=restaurant-exists start slug=${slug}`)
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    })
    console.log(
      `[SSR /[slug]/layout] step=restaurant-exists ok slug=${slug} found=${Boolean(restaurant)} ms=${Date.now() - restaurantStarted}`
    )

    if (!restaurant) {
      console.log(`[SSR /[slug]/layout] step=notFound slug=${slug}`)
      notFound()
    }

    const themeStarted = Date.now()
    console.log(`[SSR /[slug]/layout] step=theme start slug=${slug}`)
    const themePayload = await getCachedThemeForSlug(slug)
    console.log(
      `[SSR /[slug]/layout] step=theme ok slug=${slug} hasTheme=${Boolean(themePayload)} ms=${Date.now() - themeStarted}`
    )
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
  } catch (error) {
    console.error(`[SSR /[slug]/layout] failed slug=${slug} ms=${Date.now() - layoutStarted}`, error)
    throw error
  }
}

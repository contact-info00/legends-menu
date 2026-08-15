import { notFound } from 'next/navigation'
import { getMenuPageData } from '@/lib/menu-server'
import { buildMenuThemeStyleTag } from '@/lib/menu-theme-css'
import { parseMenuLanguage, type MenuPageInitialData } from '@/lib/menu-types'
import { getCachedThemeForSlug, toMenuTheme } from '@/lib/theme-server'
import { kurdishMenuFont } from '@/lib/kurdish-menu-font'
import { MenuPageClient } from './menu-client'

export const revalidate = 30
export const runtime = 'nodejs'

interface MenuPageProps {
  params: {
    slug: string
  }
  searchParams: {
    lang?: string
  }
}

export default async function MenuPage({ params, searchParams }: MenuPageProps) {
  const { slug } = params
  const initialLang = parseMenuLanguage(searchParams.lang)

  // Both reads share the caches the slug layout already warmed, so neither hits the DB again.
  const [menuData, themePayload] = await Promise.all([
    getMenuPageData(slug, initialLang),
    getCachedThemeForSlug(slug),
  ])

  if (!menuData) {
    notFound()
  }

  const initialData: MenuPageInitialData = { ...menuData, theme: toMenuTheme(themePayload) }

  const themeCss = buildMenuThemeStyleTag(initialData.theme, initialData.uiSettings)
  const backgroundUrl = initialData.theme?.menuBackgroundR2Url

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} suppressHydrationWarning />
      {backgroundUrl ? (
        <link
          rel="preload"
          as="image"
          href={backgroundUrl}
          fetchPriority="high"
        />
      ) : null}
      <div className={kurdishMenuFont.variable}>
        <MenuPageClient slug={slug} initialLang={initialLang} initialData={initialData} />
      </div>
    </>
  )
}

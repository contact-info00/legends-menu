import { notFound } from 'next/navigation'
import { getMenuPageData } from '@/lib/menu-server'
import { buildMenuThemeStyleTag } from '@/lib/menu-theme-css'
import { parseMenuLanguage } from '@/lib/menu-types'
import { MenuPageClient } from './menu-client'

export const revalidate = 30

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

  const initialData = await getMenuPageData(slug, initialLang)

  if (!initialData) {
    notFound()
  }

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
      <MenuPageClient slug={slug} initialLang={initialLang} initialData={initialData} />
    </>
  )
}

import { notFound } from 'next/navigation'
import { Noto_Naskh_Arabic } from 'next/font/google'
import { getMenuPageData } from '@/lib/menu-server'
import { buildMenuThemeStyleTag } from '@/lib/menu-theme-css'
import { parseMenuLanguage } from '@/lib/menu-types'
import { MenuPageClient } from './menu-client'

export const revalidate = 30
export const runtime = 'nodejs'

const kurdishMenuFont = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-kurdish-menu',
  display: 'swap',
})

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
      <div className={kurdishMenuFont.variable}>
        <MenuPageClient slug={slug} initialLang={initialLang} initialData={initialData} />
      </div>
    </>
  )
}

import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import WelcomePageClient from './welcome-client'

// Legacy welcome route — ISR aligned with primary /[slug] welcome page.
export const revalidate = 30
export const runtime = 'nodejs'

interface PageProps {
  params: {
    slug: string
  }
}

export default async function WelcomePage({ params }: PageProps) {
  const { slug } = params

  const getCachedRestaurant = unstable_cache(
    () =>
      prisma.restaurant.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          nameKu: true,
          nameEn: true,
          nameAr: true,
          logoMediaId: true,
          welcomeBackgroundMediaId: true,
          welcomeOverlayColor: true,
          welcomeOverlayOpacity: true,
          welcomeTextEn: true,
          googleMapsUrl: true,
          phoneNumber: true,
          instagramUrl: true,
          snapchatUrl: true,
          tiktokUrl: true,
          logo: {
            select: {
              id: true,
              mimeType: true,
              size: true,
            },
          },
          welcomeBackground: {
            select: {
              id: true,
              mimeType: true,
              size: true,
            },
          },
        },
      }),
    [`welcome-legacy-${slug}`],
    {
      tags: ['settings', `restaurant-slug-${slug}`, `welcome-${slug}`],
      revalidate: 30,
    }
  )

  const restaurant = await getCachedRestaurant()

  if (!restaurant) {
    notFound()
  }

  // Pass restaurant data to client component
  return <WelcomePageClient restaurant={restaurant} />
}

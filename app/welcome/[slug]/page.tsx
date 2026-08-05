import { notFound } from 'next/navigation'
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

  const restaurant = await prisma.restaurant.findUnique({
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
  })

  if (!restaurant) {
    notFound()
  }

  return <WelcomePageClient restaurant={restaurant} />
}

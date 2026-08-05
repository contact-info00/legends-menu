import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { WelcomeClient } from './welcome-client'
import { WelcomeLogo } from './welcome-logo'
import { WelcomeText } from './welcome-text'
import { WelcomeContact } from './welcome-contact'
import { WelcomeLanguageButtons } from './welcome-language-buttons'
import { SocialMediaIcons } from '@/components/social-media-icons'
import { RestaurantData } from '@/lib/get-restaurant-data'

// ISR: welcome content changes infrequently; admin saves trigger tag invalidation.
export const revalidate = 30
export const runtime = 'nodejs'

interface PageProps {
  params: {
    slug: string
  }
}

async function fetchWelcomeRestaurant(slug: string) {
  return prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      nameKu: true,
      nameEn: true,
      nameAr: true,
      logoMediaId: true,
      logoR2Url: true,
      welcomeBgR2Url: true,
      welcomeBgMimeType: true,
      welcomeOverlayColor: true,
      welcomeOverlayOpacity: true,
      welcomeTextEn: true,
      googleMapsUrl: true,
      phoneNumber: true,
      instagramUrl: true,
      snapchatUrl: true,
      tiktokUrl: true,
      welcomeBackgroundMediaId: true,
      serviceChargePercent: true,
      updatedAt: true,
    },
  })
}

export default async function WelcomePage({ params }: PageProps) {
  const { slug } = params

  try {
    const getCachedRestaurant = unstable_cache(
      () => fetchWelcomeRestaurant(slug),
      [`welcome-${slug}`],
      {
        tags: ['settings', `restaurant-slug-${slug}`, `welcome-${slug}`],
        revalidate: 30,
      }
    )

    const restaurant = await getCachedRestaurant()

    if (!restaurant) {
      notFound()
    }

    // Transform to RestaurantData format
    const restaurantData: RestaurantData = {
      id: restaurant.id,
      nameKu: restaurant.nameKu,
      nameEn: restaurant.nameEn,
      nameAr: restaurant.nameAr,
      logoMediaId: restaurant.logoMediaId,
      logo: null,
      footerLogoMediaId: null,
      footerLogo: null,
      welcomeBackgroundMediaId: restaurant.welcomeBackgroundMediaId,
      welcomeBackground: null,
      logoR2Url: restaurant.logoR2Url,
      welcomeBgR2Url: restaurant.welcomeBgR2Url,
      welcomeBgMimeType: restaurant.welcomeBgMimeType,
      welcomeOverlayColor: restaurant.welcomeOverlayColor || '#000000',
      welcomeOverlayOpacity: restaurant.welcomeOverlayOpacity ?? 0.5,
      welcomeTextEn: restaurant.welcomeTextEn,
      googleMapsUrl: restaurant.googleMapsUrl,
      phoneNumber: restaurant.phoneNumber,
      instagramUrl: restaurant.instagramUrl,
      snapchatUrl: restaurant.snapchatUrl,
      tiktokUrl: restaurant.tiktokUrl,
      serviceChargePercent: restaurant.serviceChargePercent ?? 0,
      brandColors: null,
      updatedAt: restaurant.updatedAt || new Date(),
    }

    return (
      <WelcomeClient restaurant={restaurantData}>
        <WelcomeLogo restaurant={restaurantData} isLoaded={true} />
        <WelcomeText restaurant={restaurantData} isLoaded={true} />
        <WelcomeLanguageButtons slug={slug} isLoaded={true} />
        <WelcomeContact restaurant={restaurantData} isLoaded={true} />
        <SocialMediaIcons restaurant={restaurantData} isLoaded={true} />
      </WelcomeClient>
    )
  } catch (error) {
    console.error('[ERROR] Welcome page - Error fetching restaurant:', error)
    throw error
  }
}

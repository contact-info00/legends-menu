import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import WelcomePageClient from './welcome-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    slug: string
  }
}

export default async function WelcomePage({ params }: PageProps) {
  const { slug } = params

  // Fetch restaurant data server-side
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
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

  // Pass restaurant data to client component
  return <WelcomePageClient restaurant={restaurant} />
}

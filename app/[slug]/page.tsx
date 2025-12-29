import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import WelcomeClient from './welcome-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    slug: string
  }
}

export default async function WelcomePage({ params }: PageProps) {
  const { slug } = params

  // Validate slug by checking if restaurant exists - no fallback
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true }, // Only need to check existence
  })

  if (!restaurant) {
    notFound()
  }

  // Restaurant exists, render the client component
  return <WelcomeClient slug={slug} />
}

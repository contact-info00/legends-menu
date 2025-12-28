import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to generate slug from restaurant name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

async function generateSlugsForRestaurants() {
  console.log('🔧 Generating slugs for existing restaurants...')

  try {
    // Get all restaurants
    const allRestaurants = await prisma.restaurant.findMany()

    for (const restaurant of allRestaurants) {
      // Generate slug from English name
      const slug = generateSlug(restaurant.nameEn || 'restaurant')

      // Check if slug already exists
      const existing = await prisma.restaurant.findUnique({
        where: { slug },
      })

      let finalSlug = slug
      if (existing && existing.id !== restaurant.id) {
        // If slug exists, append restaurant ID to make it unique
        finalSlug = `${slug}-${restaurant.id.slice(-6)}`
      }

      // Update restaurant with slug
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { slug: finalSlug },
      })

      console.log(`✅ Updated restaurant "${restaurant.nameEn}" with slug: ${finalSlug}`)
    }

    console.log('🎉 Slug generation completed!')
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation - slug already exists
      console.error('❌ Slug conflict detected. Please run this script again or manually set unique slugs.')
    } else {
      console.error('❌ Error generating slugs:', error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

generateSlugsForRestaurants()


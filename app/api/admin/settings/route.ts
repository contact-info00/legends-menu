import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await prisma.restaurant.findFirst()
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    return NextResponse.json({
      nameKu: restaurant.nameKu,
      nameEn: restaurant.nameEn,
      nameAr: restaurant.nameAr,
      googleMapsUrl: restaurant.googleMapsUrl || '',
      phoneNumber: restaurant.phoneNumber || '',
      welcomeOverlayColor: restaurant.welcomeOverlayColor,
      welcomeOverlayOpacity: restaurant.welcomeOverlayOpacity,
      welcomeTextEn: restaurant.welcomeTextEn || '',
      logoMediaId: restaurant.logoMediaId,
      welcomeBackgroundMediaId: restaurant.welcomeBackgroundMediaId,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Log the incoming data for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Settings update request body:', JSON.stringify(body, null, 2))
    }

    const restaurant = await prisma.restaurant.findFirst()
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Prepare update data with proper fallbacks
    const updateData: any = {
      nameKu: body.nameKu !== undefined ? body.nameKu : restaurant.nameKu,
      nameEn: body.nameEn !== undefined ? body.nameEn : restaurant.nameEn,
      nameAr: body.nameAr !== undefined ? body.nameAr : restaurant.nameAr,
      googleMapsUrl: body.googleMapsUrl !== undefined ? (body.googleMapsUrl || null) : restaurant.googleMapsUrl,
      phoneNumber: body.phoneNumber !== undefined ? (body.phoneNumber || null) : restaurant.phoneNumber,
      welcomeOverlayColor: body.welcomeOverlayColor !== undefined ? body.welcomeOverlayColor : restaurant.welcomeOverlayColor,
      welcomeOverlayOpacity: body.welcomeOverlayOpacity !== undefined ? parseFloat(body.welcomeOverlayOpacity) : restaurant.welcomeOverlayOpacity,
    }

    // Handle welcomeTextEn - save text as-is, convert empty strings to null
    if (body.welcomeTextEn !== undefined) {
      if (body.welcomeTextEn === null || body.welcomeTextEn === '') {
        updateData.welcomeTextEn = null
      } else {
        updateData.welcomeTextEn = String(body.welcomeTextEn).trim() || null
      }
    }

    // Only update media IDs if they're explicitly provided
    if (body.logoMediaId !== undefined) {
      updateData.logoMediaId = body.logoMediaId
    }
    if (body.welcomeBackgroundMediaId !== undefined) {
      updateData.welcomeBackgroundMediaId = body.welcomeBackgroundMediaId
    }

    // Log the update data for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Update data:', JSON.stringify(updateData, null, 2))
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: updateData,
    })

    return NextResponse.json({
      nameKu: updated.nameKu,
      nameEn: updated.nameEn,
      nameAr: updated.nameAr,
      googleMapsUrl: updated.googleMapsUrl || '',
      phoneNumber: updated.phoneNumber || '',
      welcomeOverlayColor: updated.welcomeOverlayColor,
      welcomeOverlayOpacity: updated.welcomeOverlayOpacity,
      welcomeTextEn: updated.welcomeTextEn || '',
      logoMediaId: updated.logoMediaId,
      welcomeBackgroundMediaId: updated.welcomeBackgroundMediaId,
    })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}


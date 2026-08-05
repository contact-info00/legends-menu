'use client'

import { RestaurantData } from '@/lib/get-restaurant-data'
import { WelcomeBackground } from './welcome-background'

interface WelcomeClientProps {
  restaurant: RestaurantData
  children: React.ReactNode
}

export function WelcomeClient({ restaurant, children }: WelcomeClientProps) {
  const overlayStyle = {
    backgroundColor: restaurant.welcomeOverlayColor || '#000000',
    opacity: restaurant.welcomeOverlayOpacity || 0.5,
  }

  return (
    <div className="welcome-page-container relative min-h-dvh w-full overflow-x-hidden overflow-y-hidden">
      <WelcomeBackground restaurant={restaurant} isLoaded={true} />

      <div className="absolute inset-0" style={overlayStyle} />

      <div className="relative z-10 flex flex-col items-center justify-end min-h-screen p-6 pb-24 welcome-intro-content">
        {children}
      </div>
    </div>
  )
}

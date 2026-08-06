import { MapPin, Phone } from 'lucide-react'
import { RestaurantData } from '@/lib/get-restaurant-data'

interface WelcomeContactProps {
  restaurant: RestaurantData
  isLoaded: boolean
}

export function WelcomeContact({ restaurant, isLoaded }: WelcomeContactProps) {
  if (!restaurant.googleMapsUrl && !restaurant.phoneNumber) {
    return null
  }

  return (
    <div className="flex items-center gap-1 w-full max-w-[113px]">
      {restaurant.googleMapsUrl && (
        <a
          href={restaurant.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 p-1 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all shadow-lg border border-white/20 hover:scale-105 transform duration-300 welcome-box-glow"
          aria-label="Google Maps"
        >
          <MapPin className="w-4 h-4 text-white flex-shrink-0" />
          <span className="text-white font-medium text-xs">Location</span>
        </a>
      )}
      {restaurant.phoneNumber && (
        <a
          href={`tel:${restaurant.phoneNumber}`}
          className="flex-1 flex items-center justify-center gap-1.5 p-1 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all shadow-lg border border-white/20 hover:scale-105 transform duration-300 welcome-box-glow"
          aria-label="Phone"
        >
          <Phone className="w-4 h-4 text-white flex-shrink-0" />
          <span className="text-white font-medium text-xs">Call</span>
        </a>
      )}
    </div>
  )
}


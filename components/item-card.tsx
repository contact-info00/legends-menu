'use client'

import { useState, useEffect, memo } from 'react'
import Image from 'next/image'
import { Plus, Check } from 'lucide-react'
import { Language } from '@/lib/i18n'
import { getLocalizedText } from '@/lib/i18n'
import { formatPrice } from '@/lib/utils'

interface Item {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  descriptionKu?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  price: number
  imageMediaId: string | null
  imageR2Key?: string | null
  imageR2Url?: string | null
}

interface ItemCardProps {
  item: Item
  currentLang: Language
  onItemClick: (itemId: string) => void
  onAddToBasket: (itemId: string) => void
  quantity?: number
  priority?: boolean
  currency?: 'IQD' | 'USD'
}

function ItemCardComponent({ item, currentLang, onItemClick, onAddToBasket, quantity = 0, priority = false, currency = 'IQD' }: ItemCardProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [useSolidBg, setUseSolidBg] = useState(false)
  const [surfaceBgColor, setSurfaceBgColor] = useState<string | null>(null)

  // Check if surface background color is set (when glassTintColor is set, use solid background)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkSurfaceBg = () => {
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--glass-tint-color').trim()
        const hasBg = !!bgColor && bgColor !== 'transparent'
        setUseSolidBg(hasBg)
        setSurfaceBgColor(hasBg ? bgColor : null)
      }
      checkSurfaceBg()
      // Listen for theme changes
      window.addEventListener('theme-updated', checkSurfaceBg)
      return () => window.removeEventListener('theme-updated', checkSurfaceBg)
    }
  }, [])

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAdding(true)
    onAddToBasket(item.id)
    
    // Show popup animation
    setShowPopup(true)
    setTimeout(() => {
      setShowPopup(false)
      setIsAdding(false)
    }, 2000)
  }

  return (
    <div className="relative h-full flex flex-col" style={{ margin: 0, padding: 0 }}>
      {/* Pop-up confirmation */}
      {showPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none popup-fade-animation">
          <div 
            className="px-6 py-3 rounded-xl backdrop-blur-xl border flex items-center gap-2"
            style={{
              backgroundColor: 'var(--app-bg, #400810)',
              color: 'var(--auto-text-primary, #FFFFFF)',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 20px 50px -12px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 8px 16px -4px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
            }}
          >
            <Check className="w-5 h-5" />
            <span className="font-semibold">Added to basket!</span>
          </div>
        </div>
      )}

      <div
        className={`rounded-2xl overflow-hidden border cursor-pointer h-full flex flex-col relative ${useSolidBg ? '' : 'backdrop-blur-xl'}`}
        style={{
          backgroundColor: useSolidBg && surfaceBgColor ? surfaceBgColor : 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          backdropFilter: useSolidBg ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: useSolidBg ? 'none' : 'blur(20px)',
          boxShadow: 'none',
          margin: 0,
          padding: 0,
        }}
        onClick={() => onItemClick(item.id)}
      >
        {/* Image */}
        <div className="aspect-square w-full relative z-10" style={{
          backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
          margin: 0,
          padding: 0,
        }}>
          {(() => {
            const imageUrl = item.imageR2Url || (item.imageMediaId ? `/assets/${item.imageMediaId}` : null)
            return imageUrl ? (
            <Image
                src={imageUrl}
              alt={getLocalizedText(item, currentLang)}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
                unoptimized={!imageUrl.startsWith('http')}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 bg-gradient-to-br from-[#5C0015]/30 to-[#800020]/30">
              No Image
            </div>
            )
          })()}
          {/* Quantity badge on image */}
          {quantity > 0 && (
            <div 
              className="absolute top-2 right-2 text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm z-10 border-2"
              style={{
                backgroundColor: 'var(--app-bg, #400810)',
                color: 'var(--auto-text-primary, #FFFFFF)',
                borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                boxShadow: `0 4px 6px -1px var(--auto-shadow-color, rgba(0, 0, 0, 0.3))`,
              }}
            >
              {quantity > 99 ? '99+' : quantity}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-1.5 flex-shrink-0 relative z-10 ${useSolidBg ? '' : 'backdrop-blur-sm'}`} style={{
          backgroundColor: useSolidBg && surfaceBgColor ? surfaceBgColor : 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
          margin: 0,
        }}>
          <h3 
            className="font-semibold mb-1 min-w-0 w-full truncate"
            style={{ 
              color: 'var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))',
              fontSize: 'var(--menu-item-name-size)'
            }}
          >
            {getLocalizedText(item, currentLang)}
          </h3>
          {/* Description removed from card - only shown in modal when item is clicked */}
          <div className="flex items-center justify-between">
            <span 
              className="font-bold"
              style={{ 
                color: 'var(--item-price-text-color, var(--price-text, #FBBF24))',
                fontSize: 'var(--menu-item-price-size)' 
              }}
            >
              {formatPrice(item.price, currency)}
            </span>
            <button
              onClick={handleAddClick}
              className={`p-1 rounded-xl transition-all duration-300 backdrop-blur-sm ${
                isAdding ? 'scale-110' : ''
              }`}
              style={{
                backgroundColor: isAdding 
                  ? 'var(--auto-lighter-surface, rgba(84, 28, 36, 0.9))' 
                  : 'var(--app-bg, #400810)',
                color: 'var(--auto-text-primary, #FFFFFF)',
                boxShadow: `0 0 12px var(--auto-primary-glow-subtle, rgba(64, 8, 16, 0.25)), 0 4px 16px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
              }}
              aria-label="Add to basket"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize ItemCard to prevent unnecessary re-renders
// Only re-render if props actually change (item.id, item.price, quantity, currency, etc.)
export const ItemCard = memo(ItemCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.item.nameEn === nextProps.item.nameEn &&
    prevProps.item.nameKu === nextProps.item.nameKu &&
    prevProps.item.nameAr === nextProps.item.nameAr &&
    prevProps.item.imageR2Url === nextProps.item.imageR2Url &&
    prevProps.item.imageMediaId === nextProps.item.imageMediaId &&
    prevProps.quantity === nextProps.quantity &&
    prevProps.currency === nextProps.currency &&
    prevProps.currentLang === nextProps.currentLang &&
    prevProps.priority === nextProps.priority
  )
})

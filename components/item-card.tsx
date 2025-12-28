'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { Language } from '@/lib/i18n'
import { getLocalizedText } from '@/lib/i18n'
import { formatPrice } from '@/lib/utils'
import { OptimizedImage } from './optimized-image'

interface Item {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  price: number
  imageMediaId: string | null
}

interface ItemCardProps {
  item: Item
  currentLang: Language
  onItemClick: (itemId: string) => void
  onAddToBasket: (itemId: string) => void
  quantity?: number
}

export function ItemCard({ item, currentLang, onItemClick, onAddToBasket, quantity = 0 }: ItemCardProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

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
    <div className="relative">
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
        className="rounded-2xl overflow-hidden border cursor-pointer backdrop-blur-xl"
        style={{
          background: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: `0 0 20px var(--auto-primary-glow, rgba(128, 0, 32, 0.35)), 0 8px 32px 0 var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)`
        }}
        onClick={() => onItemClick(item.id)}
      >
        {/* Image */}
        <div className="aspect-square w-full relative">
          {item.imageMediaId ? (
            <OptimizedImage
              src={`/api/media/${item.imageMediaId}`}
              alt={getLocalizedText(item, currentLang)}
              className="w-full h-full"
              aspectRatio="square"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 bg-gradient-to-br from-[#5C0015]/30 to-[#800020]/30">
              No Image
            </div>
          )}
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
        <div className="p-4 backdrop-blur-sm" style={{
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <h3 
            className="font-semibold mb-1 line-clamp-1 break-words"
            style={{ 
              color: 'var(--auto-text-primary, #FFFFFF)',
              fontSize: 'var(--menu-item-name-size)'
            }}
          >
            {getLocalizedText(item, currentLang)}
          </h3>
          <div className="flex items-center justify-between">
            <span 
              className="text-[var(--price-text)] font-bold"
              style={{ fontSize: 'var(--menu-item-price-size)' }}
            >
              {formatPrice(item.price)}
            </span>
            <button
              onClick={handleAddClick}
              className={`p-2 rounded-xl transition-all duration-300 backdrop-blur-sm ${
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
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


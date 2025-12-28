'use client'

import { X } from 'lucide-react'
import { Language } from '@/lib/i18n'
import { getLocalizedText, getLocalizedDescription } from '@/lib/i18n'
import { formatPrice } from '@/lib/utils'
import { OptimizedImage } from './optimized-image'

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
}

interface ItemModalProps {
  item: Item | null
  currentLang: Language
  isOpen: boolean
  onClose: () => void
}

export function ItemModal({ item, currentLang, isOpen, onClose }: ItemModalProps) {
  if (!isOpen || !item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[var(--modal-overlay)]" />

      {/* Modal */}
      <div
        className="relative backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border"
        style={{
          backgroundColor: 'var(--app-bg, #400810)',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 border border-white/20 shadow-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Image */}
        <div className="w-full aspect-square relative">
          {item.imageMediaId ? (
            <OptimizedImage
              src={`/api/media/${item.imageMediaId}`}
              alt={getLocalizedText(item, currentLang)}
              className="w-full h-full rounded-t-3xl"
              aspectRatio="square"
              priority={true}
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundColor: 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))',
                color: 'var(--auto-text-secondary, rgba(255, 255, 255, 0.9))',
              }}
            >
              No Image
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 
            className="font-bold text-white mb-2"
            style={{ fontSize: 'var(--menu-item-name-size, 1.5rem)' }}
          >
            {getLocalizedText(item, currentLang)}
          </h2>
          <p 
            className="font-bold text-[var(--price-text)] mb-4"
            style={{ fontSize: 'var(--menu-item-price-size, 1.25rem)' }}
          >
            {formatPrice(item.price)}
          </p>
          {getLocalizedDescription(item, currentLang) && (
            <p 
              className="text-white/90 leading-relaxed"
              style={{ fontSize: 'var(--menu-item-desc-size, 0.875rem)' }}
            >
              {getLocalizedDescription(item, currentLang)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


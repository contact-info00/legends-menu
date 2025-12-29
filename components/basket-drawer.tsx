'use client'

import { X, Plus, Minus } from 'lucide-react'
import { Language } from '@/lib/i18n'
import { getLocalizedText } from '@/lib/i18n'
import { formatPrice } from '@/lib/utils'

interface BasketItem {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  price: number
  imageMediaId: string | null
  quantity: number
}

interface BasketDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: BasketItem[]
  currentLang: Language
  onQuantityChange: (itemId: string, delta: number) => void
}

export function BasketDrawer({
  isOpen,
  onClose,
  items,
  currentLang,
  onQuantityChange,
}: BasketDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const serviceCharge = subtotal * 0.1 // 10% service charge
  const total = subtotal + serviceCharge

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--modal-overlay)]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-md backdrop-blur-xl shadow-2xl flex flex-col border-l"
        style={{
          backgroundColor: 'var(--app-bg, #400810)',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <h2 className="text-xl font-bold text-white">
            Basket
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/20 shadow-sm"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-white/60 py-8">
              Your basket is empty
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/20 shadow-sm"
              >
                {item.imageMediaId ? (
                  <img
                    src={`/assets/${item.imageMediaId}`}
                    alt={getLocalizedText(item, currentLang)}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 
                    className="font-semibold text-white truncate"
                    style={{ fontSize: 'var(--menu-item-name-size)' }}
                  >
                    {getLocalizedText(item, currentLang)}
                  </h3>
                  <p 
                    className="text-[var(--price-text)] font-bold"
                    style={{ fontSize: 'var(--menu-item-price-size)' }}
                  >
                    {formatPrice(item.price)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuantityChange(item.id, -1)}
                    className="p-1 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors shadow-sm"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white w-8 text-center font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onQuantityChange(item.id, 1)}
                    className="p-1 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors shadow-sm"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-white/20">
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">
                  Subtotal:
                </span>
                <span className="text-sm font-semibold text-white">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">
                  Service Charge (10%):
                </span>
                <span className="text-sm font-semibold text-white">
                  {formatPrice(serviceCharge)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <span className="text-lg font-semibold text-white">
                  Total:
                </span>
                <span className="text-xl font-bold text-[var(--price-text)]">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
            <p className="text-sm text-white/60 text-center">
              View only — No ordering available
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


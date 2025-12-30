'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search as SearchIcon } from 'lucide-react'
import { Language } from '@/lib/i18n'
import { getLocalizedText } from '@/lib/i18n'
import { Input } from './ui/input'

interface Item {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  imageMediaId: string | null
}

interface SearchDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: Item[]
  currentLang: Language
  onItemClick: (itemId: string) => void
}

export function SearchDrawer({
  isOpen,
  onClose,
  items,
  currentLang,
  onItemClick,
}: SearchDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const scrollYRef = useRef<number>(0)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems([])
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = items.filter((item) => {
      const name = getLocalizedText(item, currentLang).toLowerCase()
      return name.includes(query)
    })
    setFilteredItems(filtered)
  }, [searchQuery, items, currentLang])

  // Lock background scroll when search is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      scrollYRef.current = window.scrollY
      
      // Lock body scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollYRef.current}px`
      document.body.style.width = '100%'
      
      return () => {
        // Restore scroll position when search closes
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollYRef.current)
      }
    }
  }, [isOpen])

  // Prevent scroll chaining - stop touch events from propagating to body
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const content = contentRef.current
    
    const handleTouchMove = (e: TouchEvent) => {
      // Allow scrolling inside the search content
      const target = e.target as HTMLElement
      if (content.contains(target) || content === target) {
        return
      }
      // Prevent scrolling on overlay
      e.preventDefault()
    }

    // Use passive: false to allow preventDefault
    document.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50"
      style={{
        top: 'env(safe-area-inset-top, 0)',
        bottom: 'env(safe-area-inset-bottom, 0)',
        left: 'env(safe-area-inset-left, 0)',
        right: 'env(safe-area-inset-right, 0)',
        height: '100dvh',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--modal-overlay)]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        ref={contentRef}
        className="absolute right-0 top-0 w-full max-w-md backdrop-blur-xl shadow-2xl overflow-y-auto border-l overscroll-contain"
        style={{
          height: '100%',
          maxHeight: '100dvh',
          backgroundColor: 'var(--app-bg, #400810)',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingTop: 'env(safe-area-inset-top, 0)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        {/* Header */}
        <div 
          className="sticky top-0 backdrop-blur-xl border-b p-4 z-10"
          style={{
            backgroundColor: 'var(--app-bg, #400810)',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            paddingTop: 'calc(1rem + env(safe-area-inset-top, 0))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                style={{ color: 'rgba(255, 255, 255, 0.6)' }}
              />
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{
                  fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
                }}
                autoFocus
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/20 shadow-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))' }}>
          {filteredItems.length === 0 && searchQuery ? (
            <p className="text-center text-white/60 py-8">
              No items found
            </p>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onItemClick(item.id)
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-left border border-white/20 hover:border-white/30 shadow-sm"
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
                    <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center text-white/60 text-xs">
                      No Image
                    </div>
                  )}
                  <span 
                    className="text-white font-medium"
                    style={{ fontSize: 'var(--menu-item-name-size)' }}
                  >
                    {getLocalizedText(item, currentLang)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


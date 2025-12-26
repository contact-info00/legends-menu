'use client'

import { useState, useEffect } from 'react'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--modal-overlay)]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md backdrop-blur-xl bg-[#400810]/95 shadow-2xl overflow-y-auto border-l border-white/20">
        {/* Header */}
        <div className="sticky top-0 backdrop-blur-xl bg-[#400810]/95 border-b border-white/20 p-4 z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              <Input
                type="text"
                placeholder="Type a command or search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
        <div className="p-4">
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
                      src={`/api/media/${item.imageMediaId}`}
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


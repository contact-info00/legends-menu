'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { Language } from '@/lib/i18n'
import { getLocalizedText, getLocalizedDescription } from '@/lib/i18n'
import { formatPrice } from '@/lib/utils'
import { menuItemNameLocalizedTextProps, menuLocalizedTextProps } from '@/lib/menu-typography'
import type { AdvancedSelectionMode } from '@/lib/advanced-options'

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
  hasAdvancedOptions?: boolean
}

type PublicGroup = {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  selectionMode: AdvancedSelectionMode
  sortOrder: number
  options: Array<{
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    priceAdjustment: number | null
    sortOrder: number
  }>
}

type PublicLevel = {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  value: number
  sortOrder: number
}

interface ItemModalProps {
  item: Item | null
  currentLang: Language
  isOpen: boolean
  onClose: () => void
  currency?: 'IQD' | 'USD'
  slug?: string
}

function LevelDots({ value }: { value: number }) {
  const clamped = Math.min(5, Math.max(0, value))
  return (
    <div className="flex items-center gap-2" aria-label={`${clamped} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="inline-block h-3 w-3 rounded-full"
          style={{
            backgroundColor:
              i < clamped
                ? 'var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))'
                : 'transparent',
            border:
              '1.5px solid var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))',
            opacity: i < clamped ? 1 : 0.45,
          }}
        />
      ))}
    </div>
  )
}

function drySweetLabels(lang: Language): { dry: string; sweet: string } {
  switch (lang) {
    case 'ku':
      return { dry: 'وشک', sweet: 'شیرین' }
    case 'ar':
      return { dry: 'جاف', sweet: 'حلو' }
    default:
      return { dry: 'Dry', sweet: 'Sweet' }
  }
}

export function ItemModal({
  item,
  currentLang,
  isOpen,
  onClose,
  currency = 'IQD',
  slug,
}: ItemModalProps) {
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [groups, setGroups] = useState<PublicGroup[]>([])
  const [levels, setLevels] = useState<PublicLevel[]>([])
  const [singleSelections, setSingleSelections] = useState<Record<string, string>>({})
  const [multiSelections, setMultiSelections] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!isOpen || !item?.hasAdvancedOptions || !slug) {
      setGroups([])
      setLevels([])
      setSingleSelections({})
      setMultiSelections({})
      return
    }

    let cancelled = false
    setLoadingOptions(true)

    fetch(`/api/${slug}/public/items/${item.id}/advanced-options`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load options')
        }
        return response.json()
      })
      .then((data) => {
        if (cancelled) return
        const nextGroups: PublicGroup[] = Array.isArray(data.groups) ? data.groups : []
        const nextLevels: PublicLevel[] = Array.isArray(data.levels) ? data.levels : []
        setGroups(nextGroups)
        setLevels(nextLevels)

        const singles: Record<string, string> = {}
        const multis: Record<string, string[]> = {}
        nextGroups.forEach((group) => {
          if (group.selectionMode === 'multiple') {
            multis[group.id] = []
          } else if (group.options[0]) {
            singles[group.id] = group.options[0].id
          }
        })
        setSingleSelections(singles)
        setMultiSelections(multis)
      })
      .catch(() => {
        if (!cancelled) {
          setGroups([])
          setLevels([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, item?.id, item?.hasAdvancedOptions, slug])

  if (!isOpen || !item) return null

  const toggleMulti = (groupId: string, optionId: string) => {
    setMultiSelections((prev) => {
      const current = prev[groupId] ?? []
      const exists = current.includes(optionId)
      return {
        ...prev,
        [groupId]: exists
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--modal-overlay)]" />

      <div
        className="relative backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border"
        style={{
          backgroundColor: 'var(--app-bg, #400810)',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 border border-white/20 shadow-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="w-full aspect-square relative">
          {(() => {
            const imageUrl = item.imageR2Url || (item.imageMediaId ? `/assets/${item.imageMediaId}` : null)
            return imageUrl ? (
              <Image
                src={imageUrl}
                alt={getLocalizedText(item, currentLang)}
                fill
                className="object-cover rounded-t-3xl"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
                unoptimized={!imageUrl.startsWith('http')}
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
            )
          })()}
        </div>

        <div className="p-6">
          <h2
            {...menuItemNameLocalizedTextProps(currentLang, 'mb-2', 'bold')}
            style={{
              color: 'var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))',
              fontSize: 'var(--menu-item-name-size, 1.5rem)',
            }}
          >
            {getLocalizedText(item, currentLang)}
          </h2>
          <p
            className="font-bold mb-4"
            style={{
              color: 'var(--item-price-text-color, var(--price-text, #FBBF24))',
              fontSize: 'var(--menu-item-price-size, 1.25rem)',
            }}
          >
            {formatPrice(item.price, currency)}
          </p>
          {getLocalizedDescription(item, currentLang) && (
            <p
              {...menuLocalizedTextProps(currentLang, 'leading-relaxed mb-4')}
              style={{
                color:
                  'var(--item-description-text-color, var(--auto-text-secondary, rgba(255, 255, 255, 0.9)))',
                fontSize: 'var(--menu-item-desc-size, 0.875rem)',
              }}
            >
              {getLocalizedDescription(item, currentLang)}
            </p>
          )}

          {item.hasAdvancedOptions && (
            <div className="space-y-5 mt-2">
              {loadingOptions ? (
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
                  <div className="h-16 rounded bg-white/5 animate-pulse" />
                </div>
              ) : (
                <>
                  {levels.map((level) => {
                    const labels = drySweetLabels(currentLang)
                    return (
                      <div key={level.id} className="flex items-center gap-3">
                        <span
                          {...menuLocalizedTextProps(currentLang, 'text-sm font-medium shrink-0')}
                          style={{
                            color:
                              'var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))',
                          }}
                        >
                          {labels.dry}
                        </span>
                        <div className="flex-1 flex justify-center">
                          <LevelDots value={level.value} />
                        </div>
                        <span
                          {...menuLocalizedTextProps(currentLang, 'text-sm font-medium shrink-0')}
                          style={{
                            color:
                              'var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))',
                          }}
                        >
                          {labels.sweet}
                        </span>
                      </div>
                    )
                  })}

                  {groups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <div
                        {...menuLocalizedTextProps(currentLang, 'text-sm font-medium')}
                        style={{
                          color:
                            'var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))',
                        }}
                      >
                        {getLocalizedText(group, currentLang)}
                      </div>
                      <div className="space-y-2">
                        {group.options.map((option) => {
                          const isMulti = group.selectionMode === 'multiple'
                          const checked = isMulti
                            ? (multiSelections[group.id] ?? []).includes(option.id)
                            : singleSelections[group.id] === option.id

                          return (
                            <label
                              key={option.id}
                              className="flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2 border"
                              style={{
                                borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.15))',
                                backgroundColor: checked
                                  ? 'var(--auto-surface-bg, rgba(255, 255, 255, 0.08))'
                                  : 'transparent',
                              }}
                            >
                              <input
                                type={isMulti ? 'checkbox' : 'radio'}
                                name={`group-${group.id}`}
                                checked={checked}
                                onChange={() => {
                                  if (isMulti) {
                                    toggleMulti(group.id, option.id)
                                  } else {
                                    setSingleSelections((prev) => ({
                                      ...prev,
                                      [group.id]: option.id,
                                    }))
                                  }
                                }}
                                className="accent-[#27C499]"
                              />
                              <span
                                {...menuLocalizedTextProps(currentLang, 'flex-1 text-sm')}
                                style={{
                                  color:
                                    'var(--item-name-text-color, var(--auto-text-primary, #FFFFFF))',
                                }}
                              >
                                {getLocalizedText(option, currentLang)}
                              </span>
                              {option.priceAdjustment != null &&
                                option.priceAdjustment !== 0 && (
                                  <span
                                    className="text-xs font-medium"
                                    style={{
                                      color:
                                        'var(--item-price-text-color, var(--price-text, #FBBF24))',
                                    }}
                                  >
                                    {option.priceAdjustment > 0 ? '+' : ''}
                                    {formatPrice(option.priceAdjustment, currency)}
                                  </span>
                                )}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

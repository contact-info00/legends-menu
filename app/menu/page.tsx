'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MenuHeader } from '@/components/menu-header'
import { FloatingActionBar } from '@/components/floating-action-bar'
import { AnimatedBasketIcon } from '@/components/animated-basket-icon'
import { ItemCard } from '@/components/item-card'
import { ItemModal } from '@/components/item-modal'
import { SearchDrawer } from '@/components/search-drawer'
import { BasketDrawer } from '@/components/basket-drawer'
import { Language } from '@/lib/i18n'
import { getLocalizedText } from '@/lib/i18n'
import { detectOverflow } from '@/lib/debug-overflow'

interface Section {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  sortOrder: number
  isActive: boolean
  categories: Category[]
}

interface Category {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  imageMediaId: string | null
  sortOrder: number
  isActive: boolean
  items: Item[]
}

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
  sortOrder: number
  isActive: boolean
}

interface BasketItem {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  price: number
  imageMediaId: string | null
  quantity: number
}

export default function MenuPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentLang, setCurrentLang] = useState<Language>('en')
  const [sections, setSections] = useState<Section[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isBasketOpen, setIsBasketOpen] = useState(false)
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  const [allItems, setAllItems] = useState<Item[]>([])
  const [shouldAnimateBasket, setShouldAnimateBasket] = useState(false)
  const [isFirstAdd, setIsFirstAdd] = useState(false)
  const [uiSettings, setUiSettings] = useState({
    sectionTitleSize: 22,
    categoryTitleSize: 18,
    itemNameSize: 16,
    itemDescriptionSize: 14,
    itemPriceSize: 16,
    headerLogoSize: 32,
  })

  useEffect(() => {
    // Load language from URL or localStorage
    const langParam = searchParams.get('lang')
    const savedLang = localStorage.getItem('language')
    const lang = (langParam || savedLang || 'en') as Language
    setCurrentLang(lang)
    if (!langParam) {
      localStorage.setItem('language', lang)
    }

    // Fetch data
    fetch('/api/menu')
      .then((res) => res.json())
      .then((data) => {
        setSections(data.sections)
        if (data.sections.length > 0) {
          setActiveSectionId(data.sections[0].id)
          setActiveCategoryId(null) // Reset active category when sections load
        }
        // Flatten all items for search
        const items: Item[] = []
        data.sections.forEach((section: Section) => {
          section.categories.forEach((category: Category) => {
            items.push(...category.items.filter((item) => item.isActive))
          })
        })
        setAllItems(items)
      })
      .catch(console.error)

    fetch('/api/restaurant')
      .then((res) => res.json())
      .then((data) => setRestaurant(data))
      .catch(console.error)

    // Load basket from localStorage
    const savedBasket = localStorage.getItem('basket')
    if (savedBasket) {
      try {
        setBasket(JSON.parse(savedBasket))
      } catch (e) {
        console.error('Error loading basket:', e)
      }
    }

    // Fetch UI settings
    fetch('/api/ui-settings')
      .then((res) => res.json())
      .then((data) => {
        setUiSettings(data)
      })
      .catch((error) => {
        console.error('Error fetching UI settings:', error)
      })

    // Debug overflow in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        detectOverflow()
      }, 500)
    }
  }, [searchParams])

  // Set up Intersection Observer to track visible categories on scroll
  useEffect(() => {
    if (sections.length === 0 || !activeSectionId) return

    const observerOptions = {
      root: null,
      rootMargin: '-200px 0px -60% 0px', // Account for header (~73px) and bottom nav (~107px) = ~180px, plus some margin
      threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0], // Multiple thresholds for better detection
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find all visible entries
      const visibleEntries = entries.filter(entry => entry.isIntersecting)
      
      if (visibleEntries.length > 0) {
        // Sort by intersection ratio to get the most visible one
        const mostVisible = visibleEntries.reduce((prev, current) => 
          current.intersectionRatio > prev.intersectionRatio ? current : prev
        )
        
        // Extract category ID from element id
        const categoryId = mostVisible.target.id.replace('category-', '')
        if (categoryId) {
          // Verify this category belongs to the active section
          const activeSection = sections.find(s => s.id === activeSectionId)
          if (activeSection?.categories.some(c => c.id === categoryId && c.isActive)) {
            setActiveCategoryId(categoryId)
          }
        }
      }
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Observe all category elements after DOM is ready
    const observeCategories = () => {
      // Disconnect previous observations
      observer.disconnect()
      
      // Find all category elements for the active section
      const categoryElements = document.querySelectorAll('[id^="category-"]')
      if (categoryElements.length > 0) {
        categoryElements.forEach((el) => observer.observe(el))
      }
    }

    // Wait a bit for DOM to be ready, then observe
    // Use a longer delay to ensure categories are rendered
    const timeoutId = setTimeout(observeCategories, 500)
    
    // Also observe after a longer delay in case of slow rendering
    const timeoutId2 = setTimeout(observeCategories, 1000)

    // Cleanup observer on unmount or when sections change
    return () => {
      clearTimeout(timeoutId)
      clearTimeout(timeoutId2)
      observer.disconnect()
    }
  }, [sections, activeSectionId])

  useEffect(() => {
    // Save basket to localStorage
    localStorage.setItem('basket', JSON.stringify(basket))
  }, [basket])

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang)
    localStorage.setItem('language', lang)
  }

  const handleItemClick = (itemId: string) => {
    const item = allItems.find((i) => i.id === itemId)
    if (item) {
      setSelectedItem(item)
      setIsItemModalOpen(true)
    }
  }

  const handleAddToBasket = (itemId: string) => {
    const item = allItems.find((i) => i.id === itemId)
    if (!item) return

    setBasket((prev) => {
      const wasEmpty = prev.length === 0
      const existing = prev.find((i) => i.id === itemId)
      
      // Check if this is the first add (basket was empty)
      if (wasEmpty) {
        setIsFirstAdd(true)
        setShouldAnimateBasket(true)
      } else {
        setIsFirstAdd(false)
      }
      
      if (existing) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          id: item.id,
          nameKu: item.nameKu,
          nameEn: item.nameEn,
          nameAr: item.nameAr,
          price: item.price,
          imageMediaId: item.imageMediaId,
          quantity: 1,
        },
      ]
    })
  }

  const handleBasketAnimationComplete = () => {
    setShouldAnimateBasket(false)
    setIsFirstAdd(false)
  }

  const handleQuantityChange = (itemId: string, delta: number) => {
    setBasket((prev) => {
      const item = prev.find((i) => i.id === itemId)
      if (!item) return prev

      const newQuantity = item.quantity + delta
      if (newQuantity <= 0) {
        return prev.filter((i) => i.id !== itemId)
      }

      return prev.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      )
    })
  }

  const activeSection = sections.find((s) => s.id === activeSectionId)
  const activeCategories = activeSection
    ? activeSection.categories
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []
  
  // Group items by category
  const itemsByCategory = activeSection
    ? activeSection.categories
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
          category,
          items: category.items
            .filter((i) => i.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        }))
        .filter((group) => group.items.length > 0)
    : []

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategoryId(categoryId)
    const element = document.getElementById(`category-${categoryId}`)
    if (element) {
      // Account for header (~73px) and fixed section/categories box (~107px) = ~180px
      const headerOffset = 180
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div 
      className="min-h-dvh w-full overflow-x-hidden" 
      style={{ 
        backgroundColor: 'var(--app-bg, #400810)',
        ['--menu-section-size' as any]: `${uiSettings.sectionTitleSize}px`,
        ['--menu-category-size' as any]: `${uiSettings.categoryTitleSize}px`,
        ['--menu-item-name-size' as any]: `${uiSettings.itemNameSize}px`,
        ['--menu-item-desc-size' as any]: `${uiSettings.itemDescriptionSize}px`,
        ['--menu-item-price-size' as any]: `${uiSettings.itemPriceSize}px`,
        ['--header-logo-size' as any]: `${uiSettings.headerLogoSize}px`,
      }}
    >
      <MenuHeader
        logoUrl={restaurant?.logoMediaId ? `/api/media/${restaurant.logoMediaId}` : undefined}
      />

      <FloatingActionBar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onSearchClick={() => setIsSearchOpen(true)}
        onFeedbackClick={() => router.push('/feedback')}
      />

      <AnimatedBasketIcon
        itemCount={basket.reduce((sum, item) => sum + item.quantity, 0)}
        onBasketClick={() => setIsBasketOpen(true)}
        shouldAnimate={shouldAnimateBasket}
        onAnimationComplete={handleBasketAnimationComplete}
        isFirstAdd={isFirstAdd}
      />

      {/* Fixed Sections and Categories Box - Bottom of page */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-20 px-2 sm:px-4 py-4 w-full"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          width: '100%',
          maxWidth: '100vw'
        }}
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="relative inline-block w-full max-w-full">
            {/* Triangular background shape with rounded edges */}
            <div 
              className="relative px-3 sm:px-6 py-3 backdrop-blur-sm rounded-xl border w-full overflow-hidden"
              style={{
                backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
              }}
            >
              {/* Left triangular accent */}
              <div 
                className="absolute left-0 top-0 bottom-0"
                style={{
                  width: '1.125rem',
                  background: `linear-gradient(to right, var(--auto-edge-accent, rgba(64, 8, 16, 0.4)), transparent)`,
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                  borderRadius: '0.75rem 0 0 0.75rem'
                }}
              ></div>
              {/* Right triangular accent */}
              <div 
                className="absolute right-0 top-0 bottom-0"
                style={{
                  width: '1.125rem',
                  background: `linear-gradient(to left, var(--auto-edge-accent, rgba(64, 8, 16, 0.4)), transparent)`,
                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                  borderRadius: '0 0.75rem 0.75rem 0'
                }}
              ></div>
              
              {/* Sections */}
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide items-center justify-center mb-2 w-full">
                {sections.filter((s) => s.isActive).map((section) => {
                  const isActive = activeSectionId === section.id
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSectionId(section.id)
                        setActiveCategoryId(null) // Reset active category when section changes
                      }}
                      className="flex-shrink-0 px-2 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors duration-300 backdrop-blur-sm border text-xs sm:text-sm"
                      style={{
                        backgroundColor: isActive 
                          ? 'var(--auto-lighter-surface, rgba(255, 255, 255, 0.15))' 
                          : 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                        color: 'var(--auto-text-primary, #FFFFFF)',
                        borderColor: isActive
                          ? 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                          : 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                        boxShadow: isActive
                          ? `0 0 15px var(--auto-primary-glow-subtle, rgba(128, 0, 32, 0.25)), 0 4px 6px -1px var(--auto-shadow-color, rgba(0, 0, 0, 0.3))`
                          : 'none',
                        fontSize: 'var(--menu-section-size)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.15))'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))'
                        } else {
                          e.currentTarget.style.backgroundColor = 'var(--auto-lighter-surface, rgba(255, 255, 255, 0.15))'
                        }
                      }}
                    >
                      {getLocalizedText(section, currentLang)}
                    </button>
                  )
                })}
              </div>

              {/* Categories - Separate line */}
              {activeCategories.length > 0 && (
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide items-center w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {activeCategories.map((category) => {
                    const isActive = activeCategoryId === category.id
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className="flex-shrink-0 relative group"
                      >
                        {/* Category button with triangular background */}
                        <div 
                          className="relative px-2 sm:px-3 py-1.5 backdrop-blur-sm rounded-lg border transition-colors duration-300"
                          style={{
                            backgroundColor: isActive 
                              ? 'var(--auto-lighter-surface, rgba(255, 255, 255, 0.15))' 
                              : 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                            borderColor: isActive
                              ? 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                              : 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                            boxShadow: isActive
                              ? `0 0 15px var(--auto-primary-glow-subtle, rgba(128, 0, 32, 0.25)), 0 4px 6px -1px var(--auto-shadow-color, rgba(0, 0, 0, 0.3))`
                              : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.15))'
                              e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))'
                              e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.2))'
                            } else {
                              e.currentTarget.style.backgroundColor = 'var(--auto-lighter-surface, rgba(255, 255, 255, 0.15))'
                              e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                            }
                          }}
                        >
                          <span 
                            className="relative font-semibold whitespace-nowrap text-xs sm:text-sm"
                            style={{ 
                              fontSize: 'var(--menu-category-size)',
                              color: 'var(--auto-text-primary, #FFFFFF)',
                            }}
                          >
                            {getLocalizedText(category, currentLang)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay between header/navigation and items - consistent color */}
      <div 
        className="fixed left-0 right-0 bottom-0 pointer-events-none z-0 w-full" 
        style={{
          backgroundColor: 'transparent',
          top: '140px',
          height: 'calc(100dvh - 140px)',
          maxWidth: '100vw'
        }}
      ></div>

      <div className="pb-20 relative z-10 w-full overflow-x-hidden" style={{ paddingBottom: '180px' }}>
        {/* Items Grid - Grouped by Category */}
        {itemsByCategory.length > 0 ? (
          <div className="px-2 sm:px-4 space-y-8 pt-4 w-full max-w-full">
            {itemsByCategory.map(({ category, items }, index) => {
              return (
                <div key={category.id} id={`category-${category.id}`} className="scroll-mt-4">
                  {/* Category Header with Triangular Background */}
                  <div 
                    className={`mb-4 transition-all duration-300 ${index === 0 ? 'pt-0' : 'pt-0'}`}
                  >
                    <div className="relative inline-block w-full max-w-full">
                      {/* Triangular background shape with rounded edges */}
                      <div 
                        className="relative px-3 sm:px-6 py-3 backdrop-blur-sm rounded-xl border w-full overflow-hidden"
                        style={{
                          backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                          boxShadow: `0 0 20px var(--auto-primary-glow, rgba(128, 0, 32, 0.35)), 0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
                        }}
                      >
                        {/* Left triangular accent */}
                        <div 
                          className="absolute left-0 top-0 bottom-0"
                          style={{
                            width: '1.125rem',
                            background: `linear-gradient(to right, var(--auto-edge-accent, rgba(64, 8, 16, 0.4)), transparent)`,
                            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            borderRadius: '0.75rem 0 0 0.75rem'
                          }}
                        ></div>
                        {/* Right triangular accent */}
                        <div 
                          className="absolute right-0 top-0 bottom-0"
                          style={{
                            width: '1.125rem',
                            background: `linear-gradient(to left, var(--auto-edge-accent, rgba(64, 8, 16, 0.4)), transparent)`,
                            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                            borderRadius: '0 0.75rem 0.75rem 0'
                          }}
                        ></div>
                        <h2 
                          className="relative font-bold transition-all duration-300"
                          style={{ 
                            fontSize: 'var(--menu-category-size)',
                            color: 'var(--auto-text-primary, #FFFFFF)',
                          }}
                        >
                          {getLocalizedText(category, currentLang)}
                        </h2>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 pb-6 w-full">
                    {items.map((item) => {
                      const basketItem = basket.find((bi) => bi.id === item.id)
                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          currentLang={currentLang}
                          onItemClick={handleItemClick}
                          onAddToBasket={handleAddToBasket}
                          quantity={basketItem?.quantity || 0}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div 
            className="px-4 py-12 text-center"
            style={{ color: 'var(--auto-text-secondary, rgba(255, 255, 255, 0.9))' }}
          >
            No items available in this section
          </div>
        )}
      </div>

      {/* Modals and Drawers */}
      <ItemModal
        item={selectedItem}
        currentLang={currentLang}
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
      />

      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={allItems}
        currentLang={currentLang}
        onItemClick={handleItemClick}
      />

      <BasketDrawer
        isOpen={isBasketOpen}
        onClose={() => setIsBasketOpen(false)}
        items={basket}
        currentLang={currentLang}
        onQuantityChange={handleQuantityChange}
      />
    </div>
  )
}


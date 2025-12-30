'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
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

function MenuPageContent() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
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
    categoryTitleSize: 16,
    itemNameSize: 14,
    itemDescriptionSize: 14,
    itemPriceSize: 16,
    headerLogoSize: 32,
    bottomNavSectionSize: 13,
    bottomNavCategorySize: 13,
  })
  
  // Refs for bottom navigation auto-scroll
  const categoryNavContainerRef = useRef<HTMLDivElement>(null)
  const categoryButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const isUserScrollingNav = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load language from URL or localStorage
    const langParam = searchParams.get('lang')
    const savedLang = localStorage.getItem('language')
    const lang = (langParam || savedLang || 'en') as Language
    setCurrentLang(lang)
    if (!langParam) {
      localStorage.setItem('language', lang)
    }

    // Fetch data with retry
    const fetchMenu = async (retryCount = 0) => {
      try {
        const res = await fetch('/data/menu')
        if (!res.ok) {
          throw new Error(`Failed to fetch menu: ${res.status} ${res.statusText}`)
        }
        const data = await res.json()
        // Ensure sections is always an array
        const sectionsData = Array.isArray(data?.sections) ? data.sections : []
        if (process.env.NODE_ENV === 'development') {
          console.log('Menu data loaded:', { 
            sectionsCount: sectionsData.length,
            sections: sectionsData.map((s: Section) => ({
              id: s.id,
              name: s.nameEn,
              categoriesCount: s.categories?.length || 0,
              categories: s.categories?.map((c: Category) => ({
                id: c.id,
                name: c.nameEn,
                itemsCount: c.items?.length || 0
              }))
            }))
          })
        }
        setSections(sectionsData)
        
        if (sectionsData.length > 0) {
          setActiveSectionId(sectionsData[0].id)
          setActiveCategoryId(null) // Reset active category when sections load
        }
        
        // Flatten all items for search
        const items: Item[] = []
        sectionsData.forEach((section: Section) => {
          if (section?.categories && Array.isArray(section.categories)) {
            section.categories.forEach((category: Category) => {
              if (category?.items && Array.isArray(category.items)) {
                items.push(...category.items.filter((item) => item?.isActive))
              }
            })
          }
        })
        setAllItems(items)
      } catch (error) {
        console.error('Error fetching menu:', error)
        if (retryCount < 1) {
          setTimeout(() => fetchMenu(retryCount + 1), 500)
          return
        }
        // Ensure sections is always an array even on error
        setSections([])
        setAllItems([])
        // Don't show error to user - page will just show empty state
      }
    }
    fetchMenu()

    const fetchRestaurant = async (retryCount = 0) => {
      try {
        const res = await fetch(`/data/restaurant?slug=${slug}`)
        if (!res.ok) {
          if (res.status === 404) {
            // Restaurant not found - stop trying (middleware ensures only valid slugs reach here)
            console.error('Restaurant not found for slug:', slug)
            return
          }
          throw new Error('Failed to fetch')
        }
        const data = await res.json()
        
        // DEBUG: Log restaurant data to see what we received
        console.log('[DEBUG] Menu page - Restaurant data received:', {
          hasLogo: !!data.logoMediaId,
          logoMediaId: data.logoMediaId,
        })
        
        setRestaurant(data)
      } catch (error) {
        console.error('Error fetching restaurant:', error)
        if (retryCount < 1) {
          setTimeout(() => fetchRestaurant(retryCount + 1), 500)
        }
      }
    }
    fetchRestaurant()

    // Load basket from localStorage
    const savedBasket = localStorage.getItem('basket')
    if (savedBasket) {
      try {
        setBasket(JSON.parse(savedBasket))
      } catch (e) {
        console.error('Error loading basket:', e)
      }
    }

    // Fetch UI settings with cache-busting
    fetch(`/api/ui-settings?t=${Date.now()}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('[DEBUG] Menu page - UI settings loaded:', data)
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

  // Refetch UI settings when page becomes visible (after admin changes)
  useEffect(() => {
    const fetchUiSettings = () => {
      fetch(`/api/ui-settings?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('[DEBUG] Menu page - UI settings refetched:', data)
          setUiSettings(data)
        })
        .catch((error) => {
          console.error('Error fetching UI settings:', error)
        })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, refetch to get latest typography settings
        fetchUiSettings()
      }
    }

    const handleFocus = () => {
      // Window regained focus, refetch to get latest typography settings
      fetchUiSettings()
    }

    // Listen for storage events (when admin saves settings in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'typography-updated') {
        // Admin panel saved typography, refetch immediately
        fetchUiSettings()
      }
    }

    // Listen for custom events (when admin saves settings in same tab)
    const handleTypographyUpdate = () => {
      fetchUiSettings()
    }

    // Periodic refresh every 3 seconds when page is visible (to catch admin changes)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUiSettings()
      }
    }, 3000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('typography-updated', handleTypographyUpdate)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('typography-updated', handleTypographyUpdate)
      clearInterval(intervalId)
    }
  }, [])

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
        if (categoryId && Array.isArray(sections)) {
          // Verify this category belongs to the active section
          const activeSection = sections.find(s => s.id === activeSectionId)
          if (activeSection?.categories && Array.isArray(activeSection.categories)) {
            if (activeSection.categories.some(c => c.id === categoryId && c.isActive)) {
              setActiveCategoryId(categoryId)
            }
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

  // Auto-scroll bottom navigation when active category changes
  useEffect(() => {
    if (!activeCategoryId || isUserScrollingNav.current) return
    
    const categoryButton = categoryButtonRefs.current.get(activeCategoryId)
    if (categoryButton && categoryNavContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (!isUserScrollingNav.current) {
          categoryButton.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
          })
        }
      })
    }
  }, [activeCategoryId])

  // Handle user scrolling the navigation (debounce)
  useEffect(() => {
    const container = categoryNavContainerRef.current
    if (!container) return

    const handleScroll = () => {
      isUserScrollingNav.current = true
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Reset flag after user stops scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingNav.current = false
      }, 150)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    container.addEventListener('touchstart', handleScroll, { passive: true })
    container.addEventListener('touchmove', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('touchstart', handleScroll)
      container.removeEventListener('touchmove', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Save basket to localStorage
    localStorage.setItem('basket', JSON.stringify(basket))
  }, [basket])

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang)
    localStorage.setItem('language', lang)
  }

  const handleItemClick = (itemId: string) => {
    if (!Array.isArray(allItems)) return
    const item = allItems.find((i) => i?.id === itemId)
    if (item) {
      setSelectedItem(item)
      setIsItemModalOpen(true)
    }
  }

  const handleAddToBasket = (itemId: string) => {
    if (!Array.isArray(allItems)) return
    const item = allItems.find((i) => i?.id === itemId)
    if (!item) return

    setBasket((prev) => {
      if (!Array.isArray(prev)) prev = []
      const wasEmpty = prev.length === 0
      const existing = prev.find((i) => i?.id === itemId)
      
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

  const activeSection = Array.isArray(sections) ? sections.find((s) => s?.id === activeSectionId) : null
  const activeCategories = activeSection && Array.isArray(activeSection.categories)
    ? activeSection.categories
        .filter((c) => c?.isActive)
        .sort((a, b) => (a?.sortOrder || 0) - (b?.sortOrder || 0))
    : []
  
  // Group items by category
  const itemsByCategory = activeSection && Array.isArray(activeSection.categories)
    ? activeSection.categories
        .filter((c) => c?.isActive !== false) // Show all categories, not just active ones
        .sort((a, b) => (a?.sortOrder || 0) - (b?.sortOrder || 0))
        .map((category) => ({
          category,
          items: Array.isArray(category.items) 
            ? category.items
                .filter((i) => i?.isActive !== false) // Show all items, not just active ones
                .sort((a, b) => (a?.sortOrder || 0) - (b?.sortOrder || 0))
            : [],
        }))
        .filter((group) => group.items.length > 0)
    : []

  // Debug logging
  useEffect(() => {
    if (activeSection && process.env.NODE_ENV === 'development') {
      console.log('Active section:', {
        id: activeSection.id,
        name: activeSection.nameEn,
        categoriesCount: activeSection.categories?.length || 0,
        itemsByCategoryCount: itemsByCategory.length
      })
    }
  }, [activeSection, itemsByCategory])

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
        ['--bottom-nav-section-size' as any]: `${uiSettings.bottomNavSectionSize ?? 18}px`,
        ['--bottom-nav-category-size' as any]: `${uiSettings.bottomNavCategorySize ?? 15}px`,
      }}
    >
      <MenuHeader
        logoUrl={restaurant?.logoMediaId ? `/assets/${restaurant.logoMediaId}` : undefined}
      />

      <FloatingActionBar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onSearchClick={() => setIsSearchOpen(true)}
        onFeedbackClick={() => router.push(`/${slug}/feedback`)}
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
              
              {/* Sections - Fixed, no scroll */}
              <div className="flex gap-1.5 sm:gap-2 items-center justify-center mb-2 w-full overflow-hidden">
                {sections.filter((s) => s.isActive).map((section) => {
                  const isActive = activeSectionId === section.id
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSectionId(section.id)
                        setActiveCategoryId(null) // Reset active category when section changes
                      }}
                      className="flex-shrink-0 rounded-lg font-medium whitespace-nowrap transition-colors duration-300 backdrop-blur-sm border flex items-center justify-center"
                      style={{
                        backgroundColor: isActive 
                          ? 'var(--auto-lighter-surface, rgba(255, 255, 255, 0.15))' 
                          : 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                        color: 'var(--auto-text-primary, #FFFFFF)',
                        borderColor: isActive
                          ? 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                          : 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                        boxShadow: 'none',
                        fontSize: 'var(--bottom-nav-section-size)',
                        padding: '0.25em 0.8em',
                        lineHeight: '1.1',
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

              {/* Categories - Separate scrollable container */}
              {activeCategories.length > 0 && (
                <div 
                  ref={categoryNavContainerRef}
                  className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide items-center w-full" 
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {activeCategories.map((category) => {
                    const isActive = activeCategoryId === category.id
                    return (
                      <button
                        key={category.id}
                        ref={(el) => {
                          if (el) {
                            categoryButtonRefs.current.set(category.id, el)
                          } else {
                            categoryButtonRefs.current.delete(category.id)
                          }
                        }}
                        onClick={() => handleCategoryClick(category.id)}
                        className="flex-shrink-0 relative group"
                      >
                        {/* Category button with triangular background */}
                        <div 
                          className="relative backdrop-blur-sm rounded-lg border transition-colors duration-300 flex items-center justify-center"
                          style={{
                            backgroundColor: isActive 
                              ? 'var(--auto-lighter-surface, rgba(255, 255, 255, 0.15))' 
                              : 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                            borderColor: isActive
                              ? 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                              : 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                            boxShadow: 'none',
                            fontSize: 'var(--bottom-nav-category-size)',
                            padding: '0.25em 0.8em',
                            lineHeight: '1.1',
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
                            className="relative font-semibold whitespace-nowrap"
                            style={{ 
                              color: 'var(--auto-text-primary, #FFFFFF)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
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
        {!activeSection ? (
          <div className="flex items-center justify-center min-h-[50vh] px-4">
            <p className="text-white/70 text-center">No section selected. Please select a section from the navigation below.</p>
          </div>
        ) : itemsByCategory.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh] px-4">
            <p className="text-white/70 text-center">No items found in this section.</p>
          </div>
        ) : (
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
                      const basketItem = Array.isArray(basket) ? basket.find((bi) => bi?.id === item?.id) : null
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

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh w-full flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
        <div className="text-white">Loading...</div>
      </div>
    }>
      <MenuPageContent />
    </Suspense>
  )
}


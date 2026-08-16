'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminUploadProgress } from '@/components/admin-upload-progress'
import {
  adminNotifyError,
  adminNotifyLoading,
  adminNotifySuccess,
  runAdminOperation,
} from '@/lib/admin-notifications'
import { uploadAdminMedia } from '@/lib/admin-upload'
import { formatPrice } from '@/lib/utils'
import { useAdminBootstrap, useAdminRestaurantId, useAdminReady } from '../admin-context'
import { MenuBuilderSkeleton } from '../components/admin-skeleton'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { GripHandlers } from './menu-builder-rows'
import { MenuTree } from './menu-builder-tree'
import { AdvancedOptionsPanel } from './advanced-options-panel'
import type { Category, Item, MenuEntityType, MenuRowType, Section } from './menu-builder-types'

const SCROLL_SPEED = 50 // pixels per interval - increased for faster scrolling
const SCROLL_ZONE = 150 // distance from edge to trigger scroll

// dnd-kit keys useSensor's memo on the options object, so these must not be inline literals —
// otherwise `sensors` gets a new identity every render and defeats the memoized tree below.
const POINTER_SENSOR_OPTIONS = {
  activationConstraint: {
    delay: 300,
    tolerance: 5,
  },
}
const KEYBOARD_SENSOR_OPTIONS = {
  coordinateGetter: sortableKeyboardCoordinates,
}

export default function MenuBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const sessionRestaurantId = useAdminRestaurantId()
  const isAdminReady = useAdminReady()
  const restaurantId = sessionRestaurantId
  const [sections, setSections] = useState<Section[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const hasLoadedMenuRef = useRef(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [advancedOptionsItem, setAdvancedOptionsItem] = useState<Item | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number | null>>({})
  const [itemUploadProgress, setItemUploadProgress] = useState<number | null | undefined>(undefined)
  const [editItemUploadProgress, setEditItemUploadProgress] = useState<number | null | undefined>(undefined)
  
  // Modal states
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState<string | null>(null)
  const [showAddItem, setShowAddItem] = useState<string | null>(null)
  
  // Form states
  const [sectionForm, setSectionForm] = useState({ nameKu: '', nameEn: '' })
  const [categoryForm, setCategoryForm] = useState({ nameKu: '', nameEn: '' })
  const [itemForm, setItemForm] = useState({ 
    nameKu: '', 
    nameEn: '', 
    descriptionKu: '', 
    descriptionEn: '', 
    price: '' 
  })
  const [addItemImage, setAddItemImage] = useState<File | null>(null)
  const [addItemImagePreview, setAddItemImagePreview] = useState<string | null>(null)
  const [editItemImage, setEditItemImage] = useState<File | null>(null)
  const [editItemImagePreview, setEditItemImagePreview] = useState<string | null>(null)
  const [editItemImageRemoved, setEditItemImageRemoved] = useState(false)
  
  // Drag and drop states
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'section' | 'category' | 'item' | null>(null)
  const [holdingId, setHoldingId] = useState<string | null>(null)
  const [holdingType, setHoldingType] = useState<'section' | 'category' | 'item' | null>(null)
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD')
  
  // Menu dropdown states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [openMenuType, setOpenMenuType] = useState<'section' | 'category' | null>(null)
  
  // Edit form states
  const [editSectionForm, setEditSectionForm] = useState({ nameKu: '', nameEn: '' })
  const [editCategoryForm, setEditCategoryForm] = useState({ nameKu: '', nameEn: '' })
  const [editItemForm, setEditItemForm] = useState({ 
    nameKu: '', 
    nameEn: '', 
    descriptionKu: '', 
    descriptionEn: '', 
    price: '' 
  })

  // Drag and drop sensors with 0.3 second delay for touch
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS)
  )

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null)
        setOpenMenuType(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  const { bootstrap, isLoading: isLoadingBootstrap } = useAdminBootstrap()

  // Currency tracks bootstrap so a settings change is still picked up on the next admin refresh.
  useEffect(() => {
    if (!isAdminReady) {
      return
    }

    if (bootstrap?.uiSettings?.currency) {
      const currencyValue = bootstrap.uiSettings.currency
      if (currencyValue === 'IQD' || currencyValue === 'USD') {
        setCurrency(currencyValue)
      }
      return
    }

    const fetchCurrency = async () => {
      try {
        const response = await fetch('/api/admin/ui-settings', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.currency && (data.currency === 'IQD' || data.currency === 'USD')) {
            setCurrency(data.currency)
          }
        }
      } catch (error) {
        console.error('Error fetching currency:', error)
      }
    }
    void fetchCurrency()
  }, [bootstrap, isAdminReady])

  // The menu tree is owned by local state once loaded; every mutation edits it in place. The ref
  // guard makes this a one-shot load so the periodic bootstrap refresh can no longer discard those
  // local edits. bootstrap stays in the deps purely so a failed first load gets another attempt.
  useEffect(() => {
    if (!isAdminReady || hasLoadedMenuRef.current) {
      return
    }

    hasLoadedMenuRef.current = true
    void fetchMenuData().then((loaded) => {
      if (!loaded) {
        hasLoadedMenuRef.current = false
      }
    })
  }, [bootstrap, isAdminReady])

  // Stable identity keeps the memoized tree from re-rendering on unrelated parent updates.
  const formatPriceWithCurrency = useCallback(
    (price: number) => formatPrice(price, currency),
    [currency]
  )

  const resetAddItemForm = useCallback(() => {
    setItemForm({
      nameKu: '',
      nameEn: '',
      descriptionKu: '',
      descriptionEn: '',
      price: '',
    })
    setAddItemImage(null)
    setAddItemImagePreview(null)
  }, [])

  const openAddItemModal = useCallback((categoryId: string) => {
    setEditingItem(null)
    setEditItemImage(null)
    setEditItemImagePreview(null)
    setEditItemImageRemoved(false)
    resetAddItemForm()
    setShowAddItem(categoryId)
  }, [resetAddItemForm])

  const closeAddItemModal = useCallback(() => {
    setShowAddItem(null)
    resetAddItemForm()
  }, [resetAddItemForm])

  const resetEditItemImageState = useCallback(() => {
    setEditItemImage(null)
    setEditItemImagePreview(null)
    setEditItemImageRemoved(false)
  }, [])

  const parseItemPrice = (value: string): number | null => {
    const parsed = Number.parseFloat(value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null
    }
    return parsed
  }

  // Lock body scroll when Add Item modal is open
  useEffect(() => {
    if (showAddItem) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [showAddItem])

  // Lock body scroll when Edit Item modal is open
  useEffect(() => {
    if (editingItem) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [editingItem])


  const fetchMenuData = async (): Promise<boolean> => {
    const startTime = performance.now()
    setIsLoadingMenu(true)
    try {
      const response = await fetch('/api/admin/menu', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch menu data')
      }
      const data = await response.json()
      
      // Ensure categories and items arrays exist
      const normalizedSections = (data.sections || []).map((section: Section) => ({
        ...section,
        categories: (section.categories || []).map((category: Category) => ({
          ...category,
          items: category.items || []
        }))
      }))
      
      // Show sections immediately (don't wait for images to load)
      setSections(normalizedSections)
      setIsLoadingMenu(false)
      
      // Sections start collapsed - user clicks to expand
      const fetchTime = performance.now() - startTime
      if (process.env.NODE_ENV === 'development') {
        const totalItems = normalizedSections.reduce((sum: number, s: Section) => 
          sum + s.categories.reduce((catSum: number, c: Category) => catSum + c.items.length, 0), 0
        )
        console.log(`[PERF] Menu fetch (client): ${fetchTime.toFixed(2)}ms (${normalizedSections.length} sections, ${totalItems} items)`)
      }

      return true
    } catch (error) {
      console.error('Error fetching menu:', error)
      adminNotifyError('Failed to load menu data')
      setIsLoadingMenu(false)
      return false
    }
  }

  const addSectionToState = useCallback((apiSection: Omit<Section, 'categories'> & Partial<Pick<Section, 'categories'>>) => {
    setSections((prev) => [
      ...prev,
      { ...apiSection, categories: apiSection.categories ?? [] } as Section,
    ])
  }, [])

  const replaceSectionInState = useCallback((apiSection: Partial<Section> & { id: string }) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === apiSection.id
          ? { ...section, ...apiSection, categories: section.categories }
          : section
      )
    )
  }, [])

  const removeSectionFromState = useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId))
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.delete(sectionId)
      return next
    })
  }, [])

  const addCategoryToState = useCallback((
    sectionId: string,
    apiCategory: Omit<Category, 'items'> & Partial<Pick<Category, 'items'>>
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              categories: [...section.categories, { ...apiCategory, items: apiCategory.items ?? [] } as Category],
            }
          : section
      )
    )
  }, [])

  const replaceCategoryInState = useCallback((categoryId: string, apiCategory: Partial<Category> & { id: string }) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        categories: section.categories.map((category) =>
          category.id === categoryId
            ? { ...category, ...apiCategory, items: category.items }
            : category
        ),
      }))
    )
  }, [])

  const removeCategoryFromState = useCallback((categoryId: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        categories: section.categories.filter((category) => category.id !== categoryId),
      }))
    )
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
  }, [])

  const addItemToState = useCallback((categoryId: string, apiItem: Item) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        categories: section.categories.map((category) =>
          category.id === categoryId
            ? { ...category, items: [...category.items, apiItem] }
            : category
        ),
      }))
    )
  }, [])

  const replaceItemInState = useCallback((itemId: string, apiItem: Partial<Item> & { id: string }) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        categories: section.categories.map((category) => ({
          ...category,
          items: category.items.map((item) =>
            item.id === itemId ? { ...item, ...apiItem } : item
          ),
        })),
      }))
    )
  }, [])

  const removeItemFromState = useCallback((itemId: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        categories: section.categories.map((category) => ({
          ...category,
          items: category.items.filter((item) => item.id !== itemId),
        })),
      }))
    )
  }, [])

  const updateActiveInState = useCallback((
    type: MenuEntityType,
    id: string,
    isActive: boolean
  ) => {
    if (type === 'section') {
      setSections((prev) =>
        prev.map((section) => (section.id === id ? { ...section, isActive } : section))
      )
      return
    }

    if (type === 'category') {
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          categories: section.categories.map((category) =>
            category.id === id ? { ...category, isActive } : category
          ),
        }))
      )
      return
    }

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        categories: section.categories.map((category) => ({
          ...category,
          items: category.items.map((item) =>
            item.id === id ? { ...item, isActive } : item
          ),
        })),
      }))
    )
  }, [])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }, [])

  const handleToggleRowMenu = useCallback((id: string, type: MenuRowType, isOpen: boolean) => {
    if (isOpen) {
      setOpenMenuId(null)
      setOpenMenuType(null)
      return
    }
    setOpenMenuId(id)
    setOpenMenuType(type)
  }, [])

  const handleCloseRowMenu = useCallback(() => {
    setOpenMenuId(null)
    setOpenMenuType(null)
  }, [])

  const handleAddSectionClick = useCallback(() => setShowAddSection(true), [])

  const handleAddCategoryClick = useCallback((sectionId: string) => setShowAddCategory(sectionId), [])

  const handleImageUpload = async (file: File, type: 'category' | 'item', id: string) => {
    if (!restaurantId) {
      adminNotifyError('Restaurant information is still loading. Please wait and try again.')
      return
    }

    const progressKey = `${type}-${id}`
    setUploadingImage(id)
    setUploadProgress((prev) => ({ ...prev, [progressKey]: null }))
    const toastId = adminNotifyLoading('Uploading image...')

    try {
      const scope = type === 'category' ? 'categoryImage' : 'itemImage'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', scope)
      formData.append('restaurantId', restaurantId)
      if (type === 'item') {
        formData.append('itemId', id)
      }

      const { key, publicUrl } = await uploadAdminMedia({
        formData,
        onProgress: (percent) => {
          setUploadProgress((prev) => ({ ...prev, [progressKey]: percent }))
        },
      })

      if (type === 'category') {
        const patchResponse = await fetch(`/api/admin/categories/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageR2Key: key, imageR2Url: publicUrl }),
        })
        if (!patchResponse.ok) {
          throw new Error('Failed to save image URL to database')
        }
        const updatedCategory = await patchResponse.json()
        replaceCategoryInState(id, updatedCategory)
      } else {
        const patchResponse = await fetch(`/api/admin/items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageR2Key: key, imageR2Url: publicUrl }),
        })
        if (!patchResponse.ok) {
          throw new Error('Failed to save image URL to database')
        }
        const updatedItem = await patchResponse.json()
        replaceItemInState(id, updatedItem)
      }

      adminNotifySuccess('✓ Upload complete', toastId)
    } catch (error: any) {
      console.error('Upload error:', error)
      adminNotifyError(error.message || '✕ Upload failed', toastId)
    } finally {
      setUploadingImage(null)
      setUploadProgress((prev) => {
        const next = { ...prev }
        delete next[progressKey]
        return next
      })
    }
  }

  const toggleActive = useCallback(async (type: MenuEntityType, id: string, currentState: boolean) => {
    const toastId = adminNotifyLoading(`Updating ${type}...`)
    try {
      const endpoint = type === 'section' 
        ? `/api/admin/sections/${id}`
        : type === 'category'
        ? `/api/admin/categories/${id}`
        : `/api/admin/items/${id}`
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      })

      if (!response.ok) {
        throw new Error('Failed to update')
      }

      const updated = await response.json()
      updateActiveInState(type, id, updated.isActive)

      adminNotifySuccess(`✓ ${type.charAt(0).toUpperCase()}${type.slice(1)} ${!currentState ? 'activated' : 'deactivated'}`, toastId)
    } catch (error) {
      console.error('Toggle error:', error)
      adminNotifyError('✕ Failed to update. Please try again.', toastId)
    }
  }, [updateActiveInState])

  const handleDelete = useCallback(async (type: MenuEntityType, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${type} "${name}"? This action cannot be undone.`)) {
      return
    }

    const toastId = adminNotifyLoading(`Deleting ${type}...`)
    try {
      const endpoint = type === 'section' 
        ? `/api/admin/sections/${id}`
        : type === 'category'
        ? `/api/admin/categories/${id}`
        : `/api/admin/items/${id}`
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      if (type === 'section') {
        removeSectionFromState(id)
      } else if (type === 'category') {
        removeCategoryFromState(id)
      } else {
        removeItemFromState(id)
      }

      adminNotifySuccess(`✓ ${type.charAt(0).toUpperCase()}${type.slice(1)} deleted successfully`, toastId)
    } catch (error) {
      console.error('Delete error:', error)
      adminNotifyError(`✕ Failed to delete ${type}. Please try again.`, toastId)
    }
  }, [removeSectionFromState, removeCategoryFromState, removeItemFromState])

  // Auto-scroll during drag
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPointerYRef = useRef<number | null>(null)

  const checkAndScroll = useCallback((clientY: number) => {
    const viewportHeight = window.innerHeight
    const scrollThreshold = SCROLL_ZONE

    // Clear any existing scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }

    // Check if near bottom edge
    if (clientY > viewportHeight - scrollThreshold) {
      // Scroll down
      scrollIntervalRef.current = setInterval(() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop
        
        if (currentScroll < maxScroll) {
          window.scrollBy({
            top: SCROLL_SPEED,
            behavior: 'auto'
          })
        } else {
          // Reached bottom, stop scrolling
          if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current)
            scrollIntervalRef.current = null
          }
        }
      }, 16) // ~60fps
    }
    // Check if near top edge
    else if (clientY < scrollThreshold) {
      // Scroll up
      scrollIntervalRef.current = setInterval(() => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop
        
        if (currentScroll > 0) {
          window.scrollBy({
            top: -SCROLL_SPEED,
            behavior: 'auto'
          })
        } else {
          // Reached top, stop scrolling
          if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current)
            scrollIntervalRef.current = null
          }
        }
      }, 16) // ~60fps
    }
  }, [])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // Get pointer position from the event
    const pointerEvent = (event as any).activatorEvent as PointerEvent | TouchEvent | null

    if (!pointerEvent) {
      // Fallback: use delta to estimate position
      if (lastPointerYRef.current !== null) {
        const currentY = lastPointerYRef.current + (event.delta?.y || 0)
        lastPointerYRef.current = currentY
        checkAndScroll(currentY)
      }
      return
    }

    // Get Y coordinate from pointer or touch event
    let clientY: number
    if ('touches' in pointerEvent && pointerEvent.touches.length > 0) {
      clientY = pointerEvent.touches[0].clientY
    } else if ('clientY' in pointerEvent) {
      clientY = pointerEvent.clientY
    } else {
      return
    }

    lastPointerYRef.current = clientY
    checkAndScroll(clientY)
  }, [checkAndScroll])

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Determine type from active id
    if (sections.some(s => s.id === active.id)) {
      setActiveType('section')
    } else if (sections.some(s => s.categories.some(c => c.id === active.id))) {
      setActiveType('category')
    } else {
      setActiveType('item')
    }
    
    setHoldingId(null)
    setHoldingType(null)
    
    // Don't prevent page scroll - we want auto-scroll to work
    // document.body.style.overflow = 'hidden'
    // document.body.style.touchAction = 'none'
  }, [sections])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    // Clear scroll interval and reset pointer tracking
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    lastPointerYRef.current = null

    const { active, over } = event
    
    if (!over || active.id === over.id) {
      setActiveId(null)
      setActiveType(null)
      return
    }

    try {
      if (activeType === 'section') {
        const oldIndex = sections.findIndex(s => s.id === active.id)
        const newIndex = sections.findIndex(s => s.id === over.id)
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const previousSections = sections
          const newSections = arrayMove(sections, oldIndex, newIndex)
          setSections(newSections)
          
          const reorderData = newSections.map((section, index) => ({
            id: section.id,
            sortOrder: index,
          }))
          
          const response = await fetch('/api/admin/sections/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: reorderData }),
          })

          if (!response.ok) {
            setSections(previousSections)
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to reorder sections')
          }
          
          adminNotifySuccess('✓ Sections reordered')
        }
      } else if (activeType === 'category') {
        const section = sections.find(s => s.categories.some(c => c.id === active.id))
        if (section) {
          const oldIndex = section.categories.findIndex(c => c.id === active.id)
          const newIndex = section.categories.findIndex(c => c.id === over.id)
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const previousSections = sections
            const newCategories = arrayMove(section.categories, oldIndex, newIndex)
            
            const updatedSections = sections.map(s => 
              s.id === section.id 
                ? { ...s, categories: newCategories }
                : s
            )
            setSections(updatedSections)
            
            const reorderData = newCategories.map((category, index) => ({
              id: category.id,
              sortOrder: index,
            }))
            
            const response = await fetch('/api/admin/categories/reorder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ items: reorderData }),
            })
            
            if (!response.ok) {
              setSections(previousSections)
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to reorder categories')
            }
            
            adminNotifySuccess('✓ Categories reordered')
          }
        }
      } else if (activeType === 'item') {
        const section = sections.find(s => 
          s.categories.some(c => c.items.some(i => i.id === active.id))
        )
        const category = section?.categories.find(c => c.items.some(i => i.id === active.id))
        
        if (section && category) {
          const oldIndex = category.items.findIndex(i => i.id === active.id)
          const newIndex = category.items.findIndex(i => i.id === over.id)
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const previousSections = sections
            const newItems = arrayMove(category.items, oldIndex, newIndex)
            
            const updatedSections = sections.map(s => 
              s.id === section.id
                ? {
                    ...s,
                    categories: s.categories.map(c =>
                      c.id === category.id
                        ? { ...c, items: newItems }
                        : c
                    ),
                  }
                : s
            )
            setSections(updatedSections)
            
            const reorderData = newItems.map((item, index) => ({
              id: item.id,
              sortOrder: index,
            }))
            
            const response = await fetch('/api/admin/items/reorder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ items: reorderData }),
            })
            
            if (!response.ok) {
              setSections(previousSections)
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to reorder items')
            }
            
            adminNotifySuccess('✓ Items reordered')
          }
        }
      }
    } catch (error) {
      console.error('Reorder error:', error)
      adminNotifyError('✕ Failed to reorder. Please try again.')
    }
    
    setActiveId(null)
    setActiveType(null)
    
    // Clear scroll interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    
    // Restore page scroll after drag
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
  }, [sections, activeType])

  const handleGripMouseDown = useCallback((e: React.MouseEvent, id: string, type: MenuEntityType) => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    setHoldingId(id)
    setHoldingType(type)
  }, [])

  const handleGripMouseUp = useCallback((e: React.MouseEvent) => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    if (!activeId) {
      setHoldingId(null)
      setHoldingType(null)
    }
  }, [activeId])

  const handleGripTouchStart = useCallback((e: React.TouchEvent, id: string, type: MenuEntityType) => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    setHoldingId(id)
    setHoldingType(type)
  }, [])

  const handleGripTouchEnd = useCallback((e: React.TouchEvent) => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    if (!activeId) {
      setHoldingId(null)
      setHoldingType(null)
    }
  }, [activeId])

  const handleGripMouseLeave = useCallback(() => {
    if (!activeId) {
      setHoldingId(null)
      setHoldingType(null)
    }
  }, [activeId])

  // One object instead of five props, so every sortable row sees a single stable reference.
  const grip = useMemo<GripHandlers>(
    () => ({
      onGripMouseDown: handleGripMouseDown,
      onGripMouseUp: handleGripMouseUp,
      onGripMouseLeave: handleGripMouseLeave,
      onGripTouchStart: handleGripTouchStart,
      onGripTouchEnd: handleGripTouchEnd,
    }),
    [
      handleGripMouseDown,
      handleGripMouseUp,
      handleGripMouseLeave,
      handleGripTouchStart,
      handleGripTouchEnd,
    ]
  )

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataToSave = { ...sectionForm }
    setShowAddSection(false)
    setSectionForm({ nameKu: '', nameEn: '' })

    await runAdminOperation({
      loadingMessage: 'Adding section...',
      successMessage: '✓ Section added successfully',
      errorMessage: '✕ Failed to add section. Please try again.',
      operation: async () => {
        const response = await fetch('/api/admin/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataToSave),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create section')
        }

        return response.json() as Promise<Section>
      },
      onSuccess: (createdSection) => {
        addSectionToState(createdSection)
      },
      onError: () => {
        setSectionForm(formDataToSave)
        setShowAddSection(true)
      },
    })
  }

  const handleAddCategory = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault()
    const formDataToSave = { ...categoryForm }
    const sectionIdToSave = sectionId
    setShowAddCategory(null)
    setCategoryForm({ nameKu: '', nameEn: '' })

    await runAdminOperation({
      loadingMessage: 'Adding category...',
      successMessage: '✓ Category added successfully',
      errorMessage: '✕ Failed to add category. Please try again.',
      operation: async () => {
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formDataToSave, sectionId: sectionIdToSave, imageMediaId: null }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create category')
        }

        return response.json() as Promise<Category>
      },
      onSuccess: (createdCategory) => {
        addCategoryToState(sectionIdToSave, createdCategory)
      },
      onError: () => {
        setCategoryForm(formDataToSave)
        setShowAddCategory(sectionIdToSave)
      },
    })
  }

  const handleAddItem = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault()
    if (!restaurantId) {
      adminNotifyError('Restaurant information is still loading. Please wait and try again.')
      return
    }

    const parsedPrice = parseItemPrice(itemForm.price)
    if (parsedPrice === null) {
      adminNotifyError('Please enter a valid price.')
      return
    }

    const imageToUpload = addItemImage
    const formDataToSave = { ...itemForm }
    const categoryIdToSave = categoryId
    setShowAddItem(null)
    resetAddItemForm()

    await runAdminOperation({
      loadingMessage: 'Adding item...',
      successMessage: '✓ Item added successfully',
      errorMessage: '✕ Failed to add item. Please try again.',
      operation: async () => {
        const response = await fetch('/api/admin/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formDataToSave,
            categoryId: categoryIdToSave,
            price: parsedPrice,
            imageMediaId: null,
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.error || 'Failed to create item')
        }

        const newItem = await response.json() as Item
        return { newItem, categoryId: categoryIdToSave, imageToUpload }
      },
      onSuccess: ({ newItem, categoryId, imageToUpload: pendingImage }) => {
        addItemToState(categoryId, newItem)
        if (pendingImage && newItem.id) {
          void uploadItemImage(newItem.id, pendingImage)
        }
      },
      onError: () => {
        setItemForm(formDataToSave)
        setShowAddItem(categoryIdToSave)
        if (imageToUpload) {
          setAddItemImage(imageToUpload)
          const reader = new FileReader()
          reader.onloadend = () => {
            setAddItemImagePreview(reader.result as string)
          }
          reader.readAsDataURL(imageToUpload)
        }
      },
    })
  }

  const uploadItemImage = async (itemId: string, file: File, mode: 'create' | 'edit' = 'create') => {
    if (!restaurantId) return

    const setProgress = mode === 'edit' ? setEditItemUploadProgress : setItemUploadProgress
    const toastId = adminNotifyLoading('Uploading image...')
    setProgress(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', 'itemImage')
      formData.append('restaurantId', restaurantId)
      formData.append('itemId', itemId)

      const { key, publicUrl } = await uploadAdminMedia({
        formData,
        onProgress: setProgress,
      })

      const updateResponse = await fetch(`/api/admin/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageR2Key: key, imageR2Url: publicUrl }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to save image URL to database')
      }

      const updatedItem = await updateResponse.json()
      replaceItemInState(itemId, updatedItem)

      adminNotifySuccess('✓ Upload complete', toastId)
    } catch (uploadError: any) {
      console.error('[R2 UPLOAD] Error uploading image:', uploadError)
      adminNotifyError(uploadError.message || '✕ Upload failed', toastId)
    } finally {
      setProgress(undefined)
    }
  }

  const handleAddItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAddItemImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAddItemImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const handleEditItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditItemImage(file)
      setEditItemImageRemoved(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditItemImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const handleEditSection = useCallback((section: Section) => {
    setEditingSection(section.id)
    setEditSectionForm({
      nameKu: section.nameKu,
      nameEn: section.nameEn,
    })
  }, [])

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category.id)
    setEditCategoryForm({
      nameKu: category.nameKu,
      nameEn: category.nameEn,
    })
  }, [])

  const handleEditItem = useCallback((item: Item) => {
    closeAddItemModal()
    setEditingItem(item.id)
    setEditItemForm({
      nameKu: item.nameKu,
      nameEn: item.nameEn,
      descriptionKu: item.descriptionKu || '',
      descriptionEn: item.descriptionEn || '',
      price: item.price.toString(),
    })
    setEditItemImage(null)
    setEditItemImageRemoved(false)
    if (item.imageR2Url) {
      setEditItemImagePreview(item.imageR2Url)
    } else if (item.imageMediaId) {
      setEditItemImagePreview(`/assets/${item.imageMediaId}`)
    } else {
      setEditItemImagePreview(null)
    }
  }, [closeAddItemModal])

  const handleAdvancedOptions = useCallback((item: Item) => {
    setAdvancedOptionsItem(item)
  }, [])

  const handleUpdateSection = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault()
    const formDataToSave = { ...editSectionForm }
    const sectionIdToSave = sectionId
    setEditingSection(null)

    await runAdminOperation({
      loadingMessage: 'Saving section...',
      successMessage: '✓ Section updated successfully',
      errorMessage: '✕ Failed to update section. Please try again.',
      operation: async () => {
        const response = await fetch(`/api/admin/sections/${sectionIdToSave}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataToSave),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update section')
        }

        return response.json() as Promise<Section>
      },
      onSuccess: (updatedSection) => {
        replaceSectionInState(updatedSection)
      },
      onError: () => {
        setEditSectionForm(formDataToSave)
        setEditingSection(sectionIdToSave)
      },
    })
  }

  const handleUpdateCategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault()
    const formDataToSave = { ...editCategoryForm }
    const categoryIdToSave = categoryId
    setEditingCategory(null)

    await runAdminOperation({
      loadingMessage: 'Saving category...',
      successMessage: '✓ Category updated successfully',
      errorMessage: '✕ Failed to update category. Please try again.',
      operation: async () => {
        const response = await fetch(`/api/admin/categories/${categoryIdToSave}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataToSave),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update category')
        }

        return response.json() as Promise<Category>
      },
      onSuccess: (updatedCategory) => {
        replaceCategoryInState(categoryIdToSave, updatedCategory)
      },
      onError: () => {
        setEditCategoryForm(formDataToSave)
        setEditingCategory(categoryIdToSave)
      },
    })
  }

  const handleUpdateItem = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault()
    if (!restaurantId) {
      adminNotifyError('Restaurant information is still loading. Please wait and try again.')
      return
    }

    const parsedPrice = parseItemPrice(editItemForm.price)
    if (parsedPrice === null) {
      adminNotifyError('Please enter a valid price.')
      return
    }

    const imageToUpload = editItemImage
    const imageRemovedFlag = editItemImageRemoved
    const formDataToSave = { ...editItemForm }
    const itemIdToSave = itemId
    const previousPreview = editItemImagePreview
    setEditingItem(null)
    resetEditItemImageState()

    await runAdminOperation({
      loadingMessage: 'Saving item...',
      successMessage: '✓ Item updated successfully',
      errorMessage: '✕ Failed to update item. Please try again.',
      operation: async () => {
        const updateData: Record<string, unknown> = {
          ...formDataToSave,
          price: parsedPrice,
        }

        if (imageToUpload) {
          setEditItemUploadProgress(null)
          const formData = new FormData()
          formData.append('file', imageToUpload)
          formData.append('scope', 'itemImage')
          formData.append('restaurantId', restaurantId)
          formData.append('itemId', itemIdToSave)

          const { key, publicUrl } = await uploadAdminMedia({
            formData,
            onProgress: setEditItemUploadProgress,
          })

          updateData.imageR2Key = key
          updateData.imageR2Url = publicUrl
        } else if (imageRemovedFlag) {
          updateData.imageR2Key = null
          updateData.imageR2Url = null
          updateData.imageMediaId = null
        }

        const response = await fetch(`/api/admin/items/${itemIdToSave}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.error || 'Failed to update item')
        }

        return response.json() as Promise<Item>
      },
      onSuccess: (updatedItem) => {
        setEditItemUploadProgress(undefined)
        replaceItemInState(itemIdToSave, updatedItem)
      },
      onError: () => {
        setEditItemUploadProgress(undefined)
        setEditItemForm(formDataToSave)
        setEditingItem(itemIdToSave)
        setEditItemImagePreview(previousPreview)
        setEditItemImageRemoved(imageRemovedFlag)
        if (imageToUpload) {
          setEditItemImage(imageToUpload)
        }
      },
    })
  }

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#F7F9F8' }}>
      <div className="max-w-6xl mx-auto">
        <div 
          className="admin-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '0.75rem',
            padding: '1rem 1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
        >
          <h1 
            className="text-xl sm:text-2xl md:text-3xl font-bold"
            style={{ color: '#0F172A' }}
          >
            Menu Builder
          </h1>
          <Button 
            onClick={() => router.push(`/${slug}/admin-portal`)} 
            style={{
              backgroundColor: '#27C499',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.875rem',
              width: '100%',
            }}
            className="sm:w-auto"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#20B08A'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#27C499'}
          >
            Back
          </Button>
        </div>

        {(itemUploadProgress !== undefined || editItemUploadProgress !== undefined) && (
          <div
            className="admin-card mb-4 sm:mb-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '0.75rem',
              padding: '1rem 1.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            }}
          >
            <AdminUploadProgress
              label="Uploading image..."
              progress={editItemUploadProgress !== undefined ? editItemUploadProgress : itemUploadProgress ?? null}
            />
          </div>
        )}

        {/* Show skeleton only for content area while loading */}
        {isLoadingMenu ? (
          <div 
            className="admin-card space-y-4"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
                <div className="ml-4 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
                  <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <MenuTree
            sections={sections}
            expandedSections={expandedSections}
            expandedCategories={expandedCategories}
            activeId={activeId}
            activeType={activeType}
            holdingId={holdingId}
            holdingType={holdingType}
            openMenuId={openMenuId}
            openMenuType={openMenuType}
            sensors={sensors}
            grip={grip}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onToggleSection={toggleSection}
            onToggleCategory={toggleCategory}
            onEditSection={handleEditSection}
            onEditCategory={handleEditCategory}
            onEditItem={handleEditItem}
            onAdvancedOptions={handleAdvancedOptions}
            onDelete={handleDelete}
            onToggleActive={toggleActive}
            onToggleRowMenu={handleToggleRowMenu}
            onCloseRowMenu={handleCloseRowMenu}
            onAddCategory={handleAddCategoryClick}
            onAddItem={openAddItemModal}
            onAddSection={handleAddSectionClick}
            formatPrice={formatPriceWithCurrency}
          />
        )}
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            setShowAddSection(false)
            setSectionForm({ nameKu: '', nameEn: '' })
          }}
        >
          <div 
            className="backdrop-blur-xl rounded-3xl border p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Add Section</h2>
              <button
                onClick={() => {
                  setShowAddSection(false)
                  setSectionForm({ nameKu: '', nameEn: '' })
                }}
                style={{ color: '#475569', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                className=""
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Kurdish)
                </label>
                <Input
                  value={sectionForm.nameKu}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameKu: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (English)
                </label>
                <Input
                  value={sectionForm.nameEn}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameEn: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  style={{
                    backgroundColor: '#27C499',
                    color: '#FFFFFF',
                  }}
                >
                  Create Section
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddSection(false)
                    setSectionForm({ nameKu: '', nameEn: '' })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            setShowAddCategory(null)
            setCategoryForm({ nameKu: '', nameEn: '' })
          }}
        >
          <div 
            className="backdrop-blur-xl rounded-3xl border p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Add Category</h2>
              <button
                onClick={() => {
                  setShowAddCategory(null)
                  setCategoryForm({ nameKu: '', nameEn: '' })
                }}
                style={{ color: '#475569', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                className=""
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleAddCategory(e, showAddCategory)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Kurdish)
                </label>
                <Input
                  value={categoryForm.nameKu}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameKu: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (English)
                </label>
                <Input
                  value={categoryForm.nameEn}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  style={{
                    backgroundColor: '#27C499',
                    color: '#FFFFFF',
                  }}
                >
                  Create Category
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddCategory(null)
                    setCategoryForm({ nameKu: '', nameEn: '' })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeAddItemModal}
        >
          <div 
            className="backdrop-blur-xl rounded-2xl sm:rounded-3xl border p-3 sm:p-6 w-full max-w-[37.41%] sm:max-w-[11rem] mx-2 sm:mx-auto my-4 sm:my-8 max-h-[70vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 20px 50px -12px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 8px 16px -4px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold admin-text">Add Item</h2>
              <button
                onClick={closeAddItemModal}
                style={{ color: '#475569', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                className=""
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleAddItem(e, showAddItem)} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={itemForm.nameKu}
                  onChange={(e) => setItemForm({ ...itemForm, nameKu: e.target.value })}
                  required
                  className="text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Name (English)
                </label>
                <Input
                  value={itemForm.nameEn}
                  onChange={(e) => setItemForm({ ...itemForm, nameEn: e.target.value })}
                  required
                  className="text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Description (English)
                </label>
                <textarea
                  value={itemForm.descriptionEn}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionEn: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Description (Kurdish)
                </label>
                <textarea
                  value={itemForm.descriptionKu}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionKu: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Price (IQD)
                </label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  required
                  className="text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Image (Optional)
                </label>
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                    {addItemImagePreview ? (
                      <img
                        src={addItemImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-3 pb-4 sm:pt-5 sm:pb-6">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 admin-body" />
                        <p className="text-xs sm:text-sm admin-body">Click to upload image</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">PNG, JPG, WEBP — auto-optimized on upload</p>
                      </div>
                    )}
                    <input
                      key={`add-item-image-${showAddItem}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAddItemImageChange}
                    />
                  </label>
                  {addItemImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddItemImage(null)
                        setAddItemImagePreview(null)
                      }}
                      className="w-full text-xs sm:text-sm"
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 text-xs sm:text-sm py-2"
                  style={{
                    backgroundColor: '#27C499',
                    color: '#FFFFFF',
                  }}
                >
                  Create Item
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAddItemModal}
                  className="text-xs sm:text-sm py-2"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => setEditingSection(null)}
        >
          <div 
            className="backdrop-blur-xl rounded-3xl border p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold admin-text">Edit Section</h2>
              <button
                onClick={() => setEditingSection(null)}
                style={{ color: '#475569', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                className=""
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleUpdateSection(e, editingSection)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Kurdish)
                </label>
                <Input
                  value={editSectionForm.nameKu}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, nameKu: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (English)
                </label>
                <Input
                  value={editSectionForm.nameEn}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, nameEn: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  style={{
                    backgroundColor: '#27C499',
                    color: '#FFFFFF',
                  }}
                >
                  Update Section
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingSection(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => setEditingCategory(null)}
        >
          <div 
            className="backdrop-blur-xl rounded-3xl border p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold admin-text">Edit Category</h2>
              <button
                onClick={() => setEditingCategory(null)}
                style={{ color: '#475569', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                className=""
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleUpdateCategory(e, editingCategory)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Kurdish)
                </label>
                <Input
                  value={editCategoryForm.nameKu}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, nameKu: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (English)
                </label>
                <Input
                  value={editCategoryForm.nameEn}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, nameEn: e.target.value })}
                  required
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  style={{
                    backgroundColor: '#27C499',
                    color: '#FFFFFF',
                  }}
                >
                  Update Category
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setEditingItem(null)
            resetEditItemImageState()
          }}
        >
          <div 
            className="backdrop-blur-xl rounded-2xl sm:rounded-3xl border p-3 sm:p-6 w-full max-w-[37.41%] sm:max-w-[11rem] mx-2 sm:mx-auto my-4 sm:my-8 max-h-[70vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 20px 50px -12px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 8px 16px -4px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold admin-text">Edit Item</h2>
              <button
                onClick={() => {
                  setEditingItem(null)
                  resetEditItemImageState()
                }}
                style={{ color: '#475569', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                className=""
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleUpdateItem(e, editingItem)} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={editItemForm.nameKu}
                  onChange={(e) => setEditItemForm({ ...editItemForm, nameKu: e.target.value })}
                  required
                  className="text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Name (English)
                </label>
                <Input
                  value={editItemForm.nameEn}
                  onChange={(e) => setEditItemForm({ ...editItemForm, nameEn: e.target.value })}
                  required
                  className="text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Description (English)
                </label>
                <textarea
                  value={editItemForm.descriptionEn}
                  onChange={(e) => setEditItemForm({ ...editItemForm, descriptionEn: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Description (Kurdish)
                </label>
                <textarea
                  value={editItemForm.descriptionKu}
                  onChange={(e) => setEditItemForm({ ...editItemForm, descriptionKu: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Price (IQD)
                </label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={editItemForm.price}
                  onChange={(e) => setEditItemForm({ ...editItemForm, price: e.target.value })}
                  required
                  className="text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium admin-text mb-1">
                  Image (Optional - Leave empty to keep current)
                </label>
                <div className="space-y-2">
                  {editItemImagePreview && (
                    <img
                      src={editItemImagePreview}
                      alt="Preview"
                      className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 border-white/20"
                    />
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-20 sm:h-24 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                    {!editItemImagePreview && (
                      <div className="flex flex-col items-center justify-center pt-2 pb-3 sm:pt-3 sm:pb-4">
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 mb-1 admin-body" />
                        <p className="text-[10px] sm:text-xs admin-body">Click to change image</p>
                      </div>
                    )}
                    <input
                      key={`edit-item-image-${editingItem}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleEditItemImageChange}
                    />
                  </label>
                  {editItemImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditItemImage(null)
                        setEditItemImagePreview(null)
                        setEditItemImageRemoved(true)
                      }}
                      className="w-full text-xs sm:text-sm"
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 text-xs sm:text-sm py-2"
                  style={{
                    backgroundColor: '#27C499',
                    color: '#FFFFFF',
                  }}
                >
                  Update Item
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingItem(null)
                    resetEditItemImageState()
                  }}
                  className="text-xs sm:text-sm py-2"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {advancedOptionsItem && (
        <AdvancedOptionsPanel
          item={advancedOptionsItem}
          isOpen={!!advancedOptionsItem}
          onClose={() => setAdvancedOptionsItem(null)}
        />
      )}
    </div>
  )
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Upload, X, GripVertical, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'
import { useAdminBootstrap } from '../admin-context'
import { MenuBuilderSkeleton } from '../components/admin-skeleton'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  imageR2Key?: string | null
  imageR2Url?: string | null
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
  imageR2Key?: string | null
  imageR2Url?: string | null
  sortOrder: number
  isActive: boolean
}

export default function MenuBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  
  // Modal states
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState<string | null>(null)
  const [showAddItem, setShowAddItem] = useState<string | null>(null)
  
  // Form states
  const [sectionForm, setSectionForm] = useState({ nameKu: '', nameEn: '', nameAr: '' })
  const [categoryForm, setCategoryForm] = useState({ nameKu: '', nameEn: '', nameAr: '' })
  const [itemForm, setItemForm] = useState({ 
    nameKu: '', 
    nameEn: '', 
    nameAr: '', 
    descriptionKu: '', 
    descriptionEn: '', 
    descriptionAr: '', 
    price: '' 
  })
  const [itemImage, setItemImage] = useState<File | null>(null)
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null)
  const [itemImageRemoved, setItemImageRemoved] = useState(false) // Track if user intentionally removed image
  
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
  const [editSectionForm, setEditSectionForm] = useState({ nameKu: '', nameEn: '', nameAr: '' })
  const [editCategoryForm, setEditCategoryForm] = useState({ nameKu: '', nameEn: '', nameAr: '' })
  const [editItemForm, setEditItemForm] = useState({ 
    nameKu: '', 
    nameEn: '', 
    nameAr: '', 
    descriptionKu: '', 
    descriptionEn: '', 
    descriptionAr: '', 
    price: '' 
  })

  // Drag and drop sensors with 0.3 second delay for touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  useEffect(() => {
    // Use bootstrap data for restaurant ID and currency immediately
    if (bootstrap?.settings?.id) {
      setRestaurantId(bootstrap.settings.id)
    } else {
      fetchRestaurantId()
    }
    
    if (bootstrap?.uiSettings?.currency) {
      const currencyValue = bootstrap.uiSettings.currency
      if (currencyValue === 'IQD' || currencyValue === 'USD') {
        setCurrency(currencyValue)
      }
    } else {
      // Fetch currency from UI settings
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
      fetchCurrency()
    }
    
    // Fetch menu data (always fetch fresh data for menu builder)
    fetchMenuData()
  }, [bootstrap])
  
  // Create formatPrice wrapper with currency
  const formatPriceWithCurrency = (price: number) => formatPrice(price, currency)

  const fetchRestaurantId = async () => {
    try {
      const response = await fetch(`/api/admin/settings?slug=${slug}`)
      if (response.ok) {
        const data = await response.json()
        if (data.id) {
          setRestaurantId(data.id)
        }
      }
    } catch (error) {
      console.error('Error fetching restaurant ID:', error)
    }
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


  const fetchMenuData = async () => {
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
    } catch (error) {
      console.error('Error fetching menu:', error)
      toast.error('Failed to load menu data')
      setIsLoadingMenu(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleImageUpload = async (file: File, type: 'category' | 'item', id: string) => {
    if (!restaurantId) {
      toast.error('Restaurant ID not found')
      return
    }

    setUploadingImage(id)
    try {
      // Upload via server-side proxy (avoids CORS issues)
      const scope = type === 'category' ? 'categoryImage' : 'itemImage'
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', scope)
      formData.append('restaurantId', restaurantId)
      if (type === 'item') {
        formData.append('itemId', id)
      }

      const uploadResponse = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const { key, publicUrl } = await uploadResponse.json()

      // Save R2 key/URL to database
      if (type === 'category') {
        await fetch(`/api/admin/categories/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageR2Key: key, imageR2Url: publicUrl }),
        })
      } else {
        await fetch(`/api/admin/items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageR2Key: key, imageR2Url: publicUrl }),
        })
      }

      toast.success('Image uploaded successfully')
      fetchMenuData()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(null)
    }
  }

  const toggleActive = async (type: 'section' | 'category' | 'item', id: string, currentState: boolean) => {
    try {
      const endpoint = type === 'section' 
        ? `/api/admin/sections/${id}`
        : type === 'category'
        ? `/api/admin/categories/${id}`
        : `/api/admin/items/${id}`
      
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      })

      toast.success(`${type} ${!currentState ? 'activated' : 'deactivated'}`)
      fetchMenuData()
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (type: 'section' | 'category' | 'item', id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${type} "${name}"? This action cannot be undone.`)) {
      return
    }

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

      toast.success(`${type} deleted successfully`)
      fetchMenuData()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(`Failed to delete ${type}`)
    }
  }

  // Auto-scroll during drag
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPointerYRef = useRef<number | null>(null)
  const scrollSpeed = 50 // pixels per interval - increased for faster scrolling
  const scrollZone = 150 // distance from edge to trigger scroll

  const handleDragMove = (event: DragMoveEvent) => {
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
  }

  const checkAndScroll = (clientY: number) => {
    const viewportHeight = window.innerHeight
    const scrollThreshold = scrollZone

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
            top: scrollSpeed,
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
            top: -scrollSpeed,
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
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
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
  }

  const handleDragEnd = async (event: DragEndEvent) => {
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
          const newSections = arrayMove(sections, oldIndex, newIndex)
          setSections(newSections)
          
          const reorderData = newSections.map((section, index) => ({
            id: section.id,
            sortOrder: index,
          }))
          
          await fetch('/api/admin/sections/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: reorderData }),
          })
          
          toast.success('Sections reordered')
        }
      } else if (activeType === 'category') {
        const section = sections.find(s => s.categories.some(c => c.id === active.id))
        if (section) {
          const oldIndex = section.categories.findIndex(c => c.id === active.id)
          const newIndex = section.categories.findIndex(c => c.id === over.id)
          
          if (oldIndex !== -1 && newIndex !== -1) {
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
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to reorder categories')
            }
            
            toast.success('Categories reordered')
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
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to reorder items')
            }
            
            toast.success('Items reordered')
          }
        }
      }
    } catch (error) {
      console.error('Reorder error:', error)
      toast.error('Failed to reorder')
      fetchMenuData()
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
  }

  const handleGripMouseDown = (e: React.MouseEvent, id: string, type: 'section' | 'category' | 'item') => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    setHoldingId(id)
    setHoldingType(type)
  }

  const handleGripMouseUp = (e: React.MouseEvent) => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    if (!activeId) {
      setHoldingId(null)
      setHoldingType(null)
    }
  }

  const handleGripTouchStart = (e: React.TouchEvent, id: string, type: 'section' | 'category' | 'item') => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    setHoldingId(id)
    setHoldingType(type)
  }

  const handleGripTouchEnd = (e: React.TouchEvent) => {
    // Allow dnd-kit to handle the drag - don't stop propagation
    if (!activeId) {
      setHoldingId(null)
      setHoldingType(null)
    }
  }

  const handleGripMouseLeave = () => {
    if (!activeId) {
      setHoldingId(null)
      setHoldingType(null)
    }
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create section')
      }

      toast.success('Section created successfully')
      setShowAddSection(false)
      setSectionForm({ nameKu: '', nameEn: '', nameAr: '' })
      fetchMenuData()
    } catch (error: any) {
      console.error('Error creating section:', error)
      toast.error(error.message || 'Failed to create section')
    }
  }

  const handleAddCategory = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault()
    try {
      // Create category without image
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...categoryForm, sectionId, imageMediaId: null }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create category')
      }

      toast.success('Category created successfully')
      setShowAddCategory(null)
      setCategoryForm({ nameKu: '', nameEn: '', nameAr: '' })
      fetchMenuData()
    } catch (error: any) {
      console.error('Error creating category:', error)
      toast.error(error.message || 'Failed to create category')
    }
  }

  const handleAddItem = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault()
    if (!restaurantId) {
      toast.error('Restaurant ID not found')
      return
    }

    // Close modal immediately and clear form
    const imageToUpload = itemImage // Store image before clearing state
    const formDataToSave = { ...itemForm } // Store form data
    setShowAddItem(null)
    setItemForm({ 
      nameKu: '', 
      nameEn: '', 
      nameAr: '', 
      descriptionKu: '', 
      descriptionEn: '', 
      descriptionAr: '', 
      price: '' 
    })
    setItemImage(null)
    setItemImagePreview(null)

    // Save in background (non-blocking)
    ;(async () => {
      try {
        // Create item first (without image)
        const response = await fetch('/api/admin/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formDataToSave,
            categoryId,
            price: parseFloat(formDataToSave.price),
            imageMediaId: null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create item')
        }

        const newItem = await response.json()

        // Show success toast
        toast.success('Item created successfully')
        fetchMenuData()

        // Upload image in background (non-blocking, automatic)
        if (imageToUpload && newItem.id) {
          // Upload in background - don't await, let it complete automatically
          ;(async () => {
            try {
              // Upload via server-side proxy (avoids CORS issues)
              const formData = new FormData()
              formData.append('file', imageToUpload)
              formData.append('scope', 'itemImage')
              formData.append('restaurantId', restaurantId)
              formData.append('itemId', newItem.id)

              const uploadResponse = await fetch('/api/r2/upload', {
                method: 'POST',
                body: formData,
              })

              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }))
                console.error('[R2 UPLOAD] Upload failed:', errorData)
                throw new Error(errorData.error || 'Failed to upload image')
              }

              const { key, publicUrl } = await uploadResponse.json()

              // Update item with R2 key/URL
              const updateResponse = await fetch(`/api/admin/items/${newItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageR2Key: key, imageR2Url: publicUrl }),
              })

              if (!updateResponse.ok) {
                const errorData = await updateResponse.json().catch(() => ({ error: 'Unknown error' }))
                console.error('[R2 UPLOAD] Database update failed:', errorData)
                throw new Error(errorData.error || 'Failed to save image URL to database')
              }

              console.log('[R2 UPLOAD] ✅ Image uploaded successfully:', { key, publicUrl })
              // Refresh menu data to show the uploaded image
              fetchMenuData()
            } catch (uploadError: any) {
              console.error('[R2 UPLOAD] ❌ Error uploading image:', uploadError)
              // Show error toast but don't block the UI
              toast.error(`Image upload failed: ${uploadError.message || 'Unknown error'}`)
            }
          })()
        }
      } catch (error: any) {
        console.error('Error creating item:', error)
        toast.error(error.message || 'Failed to create item')
      }
    })()
  }

  const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setItemImage(file)
      setItemImageRemoved(false) // Reset removal flag when new image is selected
      const reader = new FileReader()
      reader.onloadend = () => {
        setItemImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditSection = (section: Section) => {
    setEditingSection(section.id)
    setEditSectionForm({
      nameKu: section.nameKu,
      nameEn: section.nameEn,
      nameAr: section.nameAr,
    })
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category.id)
    setEditCategoryForm({
      nameKu: category.nameKu,
      nameEn: category.nameEn,
      nameAr: category.nameAr,
    })
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item.id)
    setEditItemForm({
      nameKu: item.nameKu,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      descriptionKu: item.descriptionKu || '',
      descriptionEn: item.descriptionEn || '',
      descriptionAr: item.descriptionAr || '',
      price: item.price.toString(),
    })
    // Reset image removal flag
    setItemImageRemoved(false)
    // Check R2 URL first, then fall back to old media ID
    if (item.imageR2Url) {
      setItemImagePreview(item.imageR2Url)
    } else if (item.imageMediaId) {
      setItemImagePreview(`/assets/${item.imageMediaId}`)
    } else {
      setItemImagePreview(null)
    }
  }

  const handleUpdateSection = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault()
    
    // Close modal immediately
    const formDataToSave = { ...editSectionForm }
    setEditingSection(null)

    // Save in background (non-blocking)
    ;(async () => {
      try {
        const response = await fetch(`/api/admin/sections/${sectionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataToSave),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update section')
        }

        toast.success('Section updated successfully')
        fetchMenuData()
      } catch (error: any) {
        console.error('Error updating section:', error)
        toast.error(error.message || 'Failed to update section')
      }
    })()
  }

  const handleUpdateCategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault()
    
    // Close modal immediately
    const formDataToSave = { ...editCategoryForm }
    setEditingCategory(null)

    // Save in background (non-blocking)
    ;(async () => {
      try {
        const response = await fetch(`/api/admin/categories/${categoryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataToSave),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update category')
        }

        toast.success('Category updated successfully')
        fetchMenuData()
      } catch (error: any) {
        console.error('Error updating category:', error)
        toast.error(error.message || 'Failed to update category')
      }
    })()
  }

  const handleUpdateItem = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault()
    if (!restaurantId) {
      toast.error('Restaurant ID not found')
      return
    }

    // Close modal immediately and clear form
    const imageToUpload = itemImage // Store image before clearing state
    const imageRemovedFlag = itemImageRemoved // Store removal flag
    const formDataToSave = { ...editItemForm } // Store form data
    setEditingItem(null)
    setItemImage(null)
    setItemImagePreview(null)
    setItemImageRemoved(false)

    // Save in background (non-blocking)
    ;(async () => {
      try {
        const updateData: any = {
          ...formDataToSave,
          price: parseFloat(formDataToSave.price),
        }

        // Handle image: upload new, remove existing, or keep existing
        if (imageToUpload) {
          // Upload new image to R2 if provided (using server-side proxy to avoid CORS)
          try {
            // Upload via server-side proxy (avoids CORS issues)
            const formData = new FormData()
            formData.append('file', imageToUpload)
            formData.append('scope', 'itemImage')
            formData.append('restaurantId', restaurantId)
            formData.append('itemId', itemId)

            const uploadResponse = await fetch('/api/r2/upload', {
              method: 'POST',
              body: formData,
            })

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }))
              console.error('[R2 UPLOAD] Upload failed:', errorData)
              throw new Error(errorData.error || 'Failed to upload image')
            }

            const { key, publicUrl } = await uploadResponse.json()

            // Add R2 fields to update data
            updateData.imageR2Key = key
            updateData.imageR2Url = publicUrl
            
            console.log('[R2 UPLOAD] ✅ Image uploaded successfully:', { key, publicUrl })
          } catch (uploadError: any) {
            console.error('[R2 UPLOAD] ❌ Error uploading image:', uploadError)
            toast.error(`Failed to upload image: ${uploadError.message || 'Unknown error'}`)
            return
          }
        } else if (imageRemovedFlag) {
          // User intentionally removed the image - clear image fields
          updateData.imageR2Key = null
          updateData.imageR2Url = null
          updateData.imageMediaId = null // Also clear old media ID if it exists
        }

        const response = await fetch(`/api/admin/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update item')
        }

        toast.success('Item updated successfully')
        fetchMenuData()
      } catch (error: any) {
        console.error('Error updating item:', error)
        toast.error(error.message || 'Failed to update item')
      }
    })()
  }

  // Sortable Section Component
  function SortableSection({ section, expandedSections, expandedCategories, activeId, holdingId, holdingType, onToggleSection, onToggleCategory, onEditSection, onDeleteSection, onEditCategory, onDeleteCategory, onEditItem, onDeleteItem, onToggleActive, onGripMouseDown, onGripMouseUp, onGripMouseLeave, onGripTouchStart, onGripTouchEnd, onShowAddCategory, onShowAddItem, formatPrice }: {
    section: Section
    expandedSections: Set<string>
    expandedCategories: Set<string>
    activeId: string | null
    holdingId: string | null
    holdingType: 'section' | 'category' | 'item' | null
    onToggleSection: (id: string) => void
    onToggleCategory: (id: string) => void
    onEditSection: (section: Section) => void
    onDeleteSection: (type: 'section', id: string, name: string) => void
    onEditCategory: (category: Category) => void
    onDeleteCategory: (type: 'category', id: string, name: string) => void
    onEditItem: (item: Item) => void
    onDeleteItem: (type: 'item', id: string, name: string) => void
    onToggleActive: (type: 'section' | 'category' | 'item', id: string, currentState: boolean) => void
    onGripMouseDown: (e: React.MouseEvent, id: string, type: 'section' | 'category' | 'item') => void
    onGripMouseUp: (e: React.MouseEvent) => void
    onGripMouseLeave: () => void
    onGripTouchStart: (e: React.TouchEvent, id: string, type: 'section' | 'category' | 'item') => void
    onGripTouchEnd: (e: React.TouchEvent) => void
    onShowAddCategory: (id: string) => void
    onShowAddItem: (id: string) => void
    formatPrice: (price: number) => string
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: section.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isHolding = holdingId === section.id && holdingType === 'section'

    return (
      <div
        ref={setNodeRef}
        className={`flex items-center gap-2 sm:gap-3 p-2 rounded border relative ${isHolding ? 'scale-105 shadow-lg' : ''}`}
        style={{
          border: '1px solid #D1D5DB',
          backgroundColor: '#FFFFFF',
          ...style,
        }}
      >
        {/* Drag Handle - Left Side (3 dots vertical) */}
        <div
          {...attributes}
          {...listeners}
          onMouseDown={(e) => {
            onGripMouseDown(e, section.id, 'section')
          }}
          onMouseUp={onGripMouseUp}
          onMouseLeave={handleGripMouseLeave}
          onTouchStart={(e) => {
            onGripTouchStart(e, section.id, 'section')
          }}
          onTouchEnd={onGripTouchEnd}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ 
            color: '#475569',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            </div>
            </div>
        {/* Equals Sign */}
        <div className="flex-shrink-0" style={{ color: '#94A3B8' }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
          </div>
        {/* Chevron and Name - Click to toggle expand/collapse */}
        <div 
          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => onToggleSection(section.id)}
        >
            <div className="p-1 rounded transition-colors flex-shrink-0">
              {expandedSections.has(section.id) ? (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#475569' }} />
              ) : (
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#475569' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
            <div 
              className="font-medium truncate text-sm sm:text-base"
                  style={{ color: '#0F172A' }}
                >
                  {section.nameEn}
              </div>
            </div>
          </div>
        {/* Toggle and Menu */}
        <div className="flex items-center gap-2 flex-shrink-0 relative">
          <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={section.isActive}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggleActive('section', section.id, section.isActive)
                }}
              onClick={(e) => e.stopPropagation()}
                className="sr-only peer"
              />
              <div 
                className="w-9 h-5 sm:w-11 sm:h-6 peer-focus:outline-none rounded-full peer peer-checked:after:left-auto peer-checked:after:right-[2px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all border"
                style={{
                  backgroundColor: section.isActive 
                    ? '#27C499' 
                    : '#EF4444',
                  border: '1px solid #D1D5DB',
                }}
              ></div>
            </label>
          {/* 3 Dots Menu */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                if (openMenuId === section.id && openMenuType === 'section') {
                  setOpenMenuId(null)
                  setOpenMenuType(null)
                } else {
                  setOpenMenuId(section.id)
                  setOpenMenuType('section')
                }
              }}
              className="h-10 w-10 p-0 sm:h-12 sm:w-12"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#475569' }} />
            </Button>
            {/* Dropdown Menu */}
            {openMenuId === section.id && openMenuType === 'section' && (
              <div 
                className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(null)
                      setOpenMenuType(null)
                      onEditSection(section)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                    style={{ color: '#0F172A' }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(null)
                      setOpenMenuType(null)
                      onDeleteSection('section', section.id, section.nameEn)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                    style={{ color: '#EF4444' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Sortable Category Component
  function SortableCategory({ category, sectionId, expandedCategories, activeId, holdingId, holdingType, onToggleCategory, onEditCategory, onDeleteCategory, onEditItem, onDeleteItem, onToggleActive, onGripMouseDown, onGripMouseUp, onGripMouseLeave, onGripTouchStart, onGripTouchEnd, onShowAddItem, formatPrice, openMenuId, openMenuType, setOpenMenuId, setOpenMenuType }: {
    category: Category
    sectionId: string
    expandedCategories: Set<string>
    activeId: string | null
    holdingId: string | null
    holdingType: 'section' | 'category' | 'item' | null
    onToggleCategory: (id: string) => void
    onEditCategory: (category: Category) => void
    onDeleteCategory: (type: 'category', id: string, name: string) => void
    onEditItem: (item: Item) => void
    onDeleteItem: (type: 'item', id: string, name: string) => void
    onToggleActive: (type: 'section' | 'category' | 'item', id: string, currentState: boolean) => void
    onGripMouseDown: (e: React.MouseEvent, id: string, type: 'section' | 'category' | 'item') => void
    onGripMouseUp: (e: React.MouseEvent) => void
    onGripMouseLeave: () => void
    onGripTouchStart: (e: React.TouchEvent, id: string, type: 'section' | 'category' | 'item') => void
    onGripTouchEnd: (e: React.TouchEvent) => void
    onShowAddItem: (id: string) => void
    formatPrice: (price: number) => string
    openMenuId: string | null
    openMenuType: 'section' | 'category' | null
    setOpenMenuId: (id: string | null) => void
    setOpenMenuType: (type: 'section' | 'category' | null) => void
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isHolding = holdingId === category.id && holdingType === 'category'

    return (
      <div
        ref={setNodeRef}
        className={`flex items-center gap-2 sm:gap-3 p-2 rounded border relative ${isHolding ? 'scale-105 shadow-lg' : ''}`}
        style={{
          border: '1px solid #D1D5DB',
          backgroundColor: '#FFFFFF',
          ...style,
        }}
      >
        {/* Drag Handle - Left Side (3 dots vertical) */}
        <div
          {...attributes}
          {...listeners}
          onMouseDown={(e) => onGripMouseDown(e, category.id, 'category')}
          onMouseUp={onGripMouseUp}
          onMouseLeave={handleGripMouseLeave}
          onTouchStart={(e) => onGripTouchStart(e, category.id, 'category')}
          onTouchEnd={onGripTouchEnd}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ 
            color: '#475569',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            </div>
            </div>
        {/* Equals Sign */}
        <div className="flex-shrink-0" style={{ color: '#94A3B8' }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
          </div>
        {/* Chevron and Name - Click to toggle expand/collapse */}
        <div 
          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => onToggleCategory(category.id)}
        >
          <div className="p-1 rounded transition-colors flex-shrink-0">
              {expandedCategories.has(category.id) ? (
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#475569' }} />
              ) : (
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#475569' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
            <div 
              className="font-medium truncate text-sm sm:text-base"
                  style={{ color: '#0F172A' }}
                >
                  {category.nameEn}
              </div>
            <div className="text-xs truncate" style={{ color: '#94A3B8' }}>
              {category.items?.length || 0} Items
            </div>
          </div>
        </div>
        {/* Toggle and Menu */}
        <div className="flex items-center gap-2 flex-shrink-0 relative">
          <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={category.isActive}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggleActive('category', category.id, category.isActive)
                }}
              onClick={(e) => e.stopPropagation()}
                className="sr-only peer"
              />
              <div 
                className="w-9 h-5 sm:w-11 sm:h-6 peer-focus:outline-none rounded-full peer peer-checked:after:left-auto peer-checked:after:right-[2px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all border"
                style={{
                  backgroundColor: category.isActive 
                    ? '#27C499' 
                    : '#EF4444',
                  border: '1px solid #D1D5DB',
                }}
              ></div>
            </label>
          {/* 3 Dots Menu */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                if (openMenuId === category.id && openMenuType === 'category') {
                  setOpenMenuId(null)
                  setOpenMenuType(null)
                } else {
                  setOpenMenuId(category.id)
                  setOpenMenuType('category')
                }
              }}
              className="h-10 w-10 p-0 sm:h-12 sm:w-12"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#475569' }} />
            </Button>
            {/* Dropdown Menu */}
            {openMenuId === category.id && openMenuType === 'category' && (
              <div 
                className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(null)
                      setOpenMenuType(null)
                      onEditCategory(category)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                    style={{ color: '#0F172A' }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(null)
                      setOpenMenuType(null)
                      onDeleteCategory('category', category.id, category.nameEn)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                    style={{ color: '#EF4444' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Sortable Item Component
  function SortableItem({ item, activeId, holdingId, holdingType, onEditItem, onDeleteItem, onToggleActive, onGripMouseDown, onGripMouseUp, onGripMouseLeave, onGripTouchStart, onGripTouchEnd, formatPrice }: {
    item: Item
    activeId: string | null
    holdingId: string | null
    holdingType: 'section' | 'category' | 'item' | null
    onEditItem: (item: Item) => void
    onDeleteItem: (type: 'item', id: string, name: string) => void
    onToggleActive: (type: 'section' | 'category' | 'item', id: string, currentState: boolean) => void
    onGripMouseDown: (e: React.MouseEvent, id: string, type: 'section' | 'category' | 'item') => void
    onGripMouseUp: (e: React.MouseEvent) => void
    onGripMouseLeave: () => void
    onGripTouchStart: (e: React.TouchEvent, id: string, type: 'section' | 'category' | 'item') => void
    onGripTouchEnd: (e: React.TouchEvent) => void
    formatPrice: (price: number) => string
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isHolding = holdingId === item.id && holdingType === 'item'

    return (
      <div
        ref={setNodeRef}
        className={`flex items-center gap-2 sm:gap-3 p-2 rounded border relative ${isHolding ? 'scale-105 shadow-lg' : ''}`}
        style={{
          border: '1px solid #D1D5DB',
          backgroundColor: '#FFFFFF',
          ...style,
        }}
      >
        {/* Grip Icon - Left Side (3 dots vertical) */}
        <div
          {...attributes}
          {...listeners}
          onMouseDown={(e) => onGripMouseDown(e, item.id, 'item')}
          onMouseUp={onGripMouseUp}
          onMouseLeave={handleGripMouseLeave}
          onTouchStart={(e) => onGripTouchStart(e, item.id, 'item')}
          onTouchEnd={onGripTouchEnd}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ 
            color: '#475569',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current"></div>
            </div>
            </div>
        {/* Equals Sign */}
        <div className="flex-shrink-0" style={{ color: '#94A3B8' }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
          </div>
        {/* Image Thumbnail */}
        <div 
          className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-gray-700 overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => onEditItem(item)}
        >
          {(() => {
            // Check R2 URL first, then fall back to old media ID
            const imageUrl = item.imageR2Url || (item.imageMediaId ? `/assets/${item.imageMediaId}` : null)
            return imageUrl ? (
              <img
                src={imageUrl}
                alt={item.nameEn}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    const fallback = document.createElement('div')
                    fallback.className = 'w-full h-full flex items-center justify-center text-xs'
                    fallback.style.color = '#94A3B8'
                    fallback.textContent = 'No Img'
                    parent.appendChild(fallback)
                  }
                }}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-xs"
                style={{ color: '#94A3B8' }}
              >
                No Img
              </div>
            )
          })()}
        </div>
        {/* Name and Price */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onEditItem(item)}
        >
          <div 
            className="font-medium truncate text-sm sm:text-base"
                    style={{ 
                      color: '#0F172A',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F7F2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {item.nameEn}
          </div>
          <div className="text-xs sm:text-sm text-[#FBBF24] font-bold">
            {formatPrice(item.price)}
          </div>
        </div>
        {/* Toggle and Delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={item.isActive}
              onChange={(e) => {
                e.stopPropagation()
                onToggleActive('item', item.id, item.isActive)
              }}
              onClick={(e) => e.stopPropagation()}
              className="sr-only peer"
            />
            <div 
              className="w-9 h-5 sm:w-11 sm:h-6 peer-focus:outline-none rounded-full peer peer-checked:after:left-auto peer-checked:after:right-[2px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all border"
              style={{
                backgroundColor: item.isActive 
                  ? '#27C499' 
                  : '#EF4444',
                border: '1px solid #D1D5DB',
              }}
            ></div>
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteItem('item', item.id, item.nameEn)
            }}
            className="h-10 w-10 p-0 sm:h-12 sm:w-12"
          >
            <Trash2 className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#EF4444' }} />
          </Button>
        </div>
      </div>
    )
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            <div 
              className="backdrop-blur-xl rounded-2xl border p-3 sm:p-6 space-y-3 sm:space-y-4"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 20px rgba(39, 196, 153, 0.3), 0 0 40px rgba(39, 196, 153, 0.15)',
              }}
            >
              {/* Always show sections with expand/collapse - sections start collapsed */}
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                <div key={section.id} className="space-y-2">
                  <SortableSection
                    section={section}
                    expandedSections={expandedSections}
                    expandedCategories={expandedCategories}
                    activeId={activeId}
                    holdingId={holdingId}
                    holdingType={holdingType}
                    onToggleSection={toggleSection}
                    onToggleCategory={toggleCategory}
                    onEditSection={handleEditSection}
                    onDeleteSection={handleDelete}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={handleDelete}
                    onEditItem={handleEditItem}
                    onDeleteItem={handleDelete}
                    onToggleActive={toggleActive}
                    onGripMouseDown={handleGripMouseDown}
                    onGripMouseUp={handleGripMouseUp}
                    onGripMouseLeave={handleGripMouseLeave}
                    onGripTouchStart={handleGripTouchStart}
                    onGripTouchEnd={handleGripTouchEnd}
                    onShowAddCategory={setShowAddCategory}
                    onShowAddItem={setShowAddItem}
                    formatPrice={formatPriceWithCurrency}
                  />
                  {/* Categories - rendered outside section frame, directly under section name */}
                  {expandedSections.has(section.id) && (
                    <div className="space-y-2">
                      <SortableContext items={section.categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {section.categories && section.categories.length > 0 ? (
                          section.categories.map((category) => (
                            <div key={category.id} className="space-y-2">
                              <SortableCategory
                                category={category}
                                sectionId={section.id}
                                expandedCategories={expandedCategories}
                                activeId={activeId}
                                holdingId={holdingId}
                                holdingType={holdingType}
                                onToggleCategory={toggleCategory}
                                onEditCategory={handleEditCategory}
                                onDeleteCategory={handleDelete}
                                onEditItem={handleEditItem}
                                onDeleteItem={handleDelete}
                                onToggleActive={toggleActive}
                                onGripMouseDown={handleGripMouseDown}
                                onGripMouseUp={handleGripMouseUp}
                                onGripMouseLeave={handleGripMouseLeave}
                                onGripTouchStart={handleGripTouchStart}
                                onGripTouchEnd={handleGripTouchEnd}
                                onShowAddItem={setShowAddItem}
                                formatPrice={formatPriceWithCurrency}
                                openMenuId={openMenuId}
                                openMenuType={openMenuType}
                                setOpenMenuId={setOpenMenuId}
                                setOpenMenuType={setOpenMenuType}
                              />
                              {/* Items - rendered outside category frame, directly under category name */}
                              {expandedCategories.has(category.id) && (
                                <div className="space-y-2">
                                  <SortableContext items={category.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    {category.items && category.items.length > 0 ? (
                                      <>
                                        {category.items.map((item) => (
                                          <SortableItem
                                            key={item.id}
                                            item={item}
                                            activeId={activeId}
                                            holdingId={holdingId}
                                            holdingType={holdingType}
                                            onEditItem={handleEditItem}
                                            onDeleteItem={handleDelete}
                                            onToggleActive={toggleActive}
                                            onGripMouseDown={handleGripMouseDown}
                                            onGripMouseUp={handleGripMouseUp}
                                            onGripMouseLeave={handleGripMouseLeave}
                                            onGripTouchStart={handleGripTouchStart}
                                            onGripTouchEnd={handleGripTouchEnd}
                                            formatPrice={formatPriceWithCurrency}
                                          />
                                        ))}
                                        {/* Add Item Button */}
                                        <Button
                                          onClick={() => setShowAddItem(category.id)}
                                          className="w-full mt-3 text-sm sm:text-base border"
                                          style={{
                                            backgroundColor: '#27C499',
                                            color: '#FFFFFF',
                                            border: '1px solid #D1D5DB',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#20B08A'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#27C499'
                                          }}
                                          variant="default"
                                        >
                                          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                          Add Item
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <div className="px-4 py-4 text-center text-sm" style={{ color: '#94A3B8' }}>
                                          No items in this category
                                        </div>
                                        {/* Add Item Button */}
                                        <Button
                                          onClick={() => setShowAddItem(category.id)}
                                          className="w-full mt-3 text-sm sm:text-base border"
                                          style={{
                                            backgroundColor: '#27C499',
                                            color: '#FFFFFF',
                                            border: '1px solid #D1D5DB',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#20B08A'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#27C499'
                                          }}
                                          variant="default"
                                        >
                                          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                          Add Item
                                        </Button>
                                      </>
                                    )}
                                  </SortableContext>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-center text-sm" style={{ color: '#94A3B8' }}>
                            No categories in this section
                          </div>
                        )}
                      </SortableContext>
                      {/* Add Category Button */}
                      <Button
                        onClick={() => setShowAddCategory(section.id)}
                        className="w-full mt-3 text-sm sm:text-base border"
                        style={{
                          backgroundColor: '#27C499',
                          color: '#FFFFFF',
                          border: '1px solid #D1D5DB',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#20B08A'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#27C499'
                        }}
                        variant="default"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        Add Category
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </SortableContext>
            {/* Add Section Button - at bottom of sections */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <Button
                onClick={() => setShowAddSection(true)}
                className="w-full sm:w-auto"
                style={{
                  backgroundColor: '#27C499',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#20B08A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#27C499'}
              >
                <Plus className="w-5 h-5" />
                Add Section
              </Button>
            </div>
            </div>
            <DragOverlay>
              {activeId && activeType ? (
                <div className="opacity-80">
                  {activeType === 'section' && (
                    <div 
                      className="border rounded-xl p-3 backdrop-blur-sm"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#F7F9F8',
                        color: '#475569',
                      }}
                    >
                      {sections.find(s => s.id === activeId)?.nameEn}
                    </div>
                  )}
                  {activeType === 'category' && (
                    <div 
                      className="border rounded-lg p-2 backdrop-blur-sm"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#F7F9F8',
                        color: '#475569',
                      }}
                    >
                      {sections
                        .flatMap(s => s.categories)
                        .find(c => c.id === activeId)?.nameEn}
                    </div>
                  )}
                  {activeType === 'item' && (
                    <div 
                      className="border rounded p-2 backdrop-blur-sm flex items-center gap-2"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                      }}
                    >
                      {sections
                        .flatMap(s => s.categories)
                        .flatMap(c => c.items)
                        .find(i => i.id === activeId)?.nameEn}
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            setShowAddSection(false)
            setSectionForm({ nameKu: '', nameEn: '', nameAr: '' })
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
                  setSectionForm({ nameKu: '', nameEn: '', nameAr: '' })
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
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Arabic)
                </label>
                <Input
                  value={sectionForm.nameAr}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameAr: e.target.value })}
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
                    setSectionForm({ nameKu: '', nameEn: '', nameAr: '' })
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
            setCategoryForm({ nameKu: '', nameEn: '', nameAr: '' })
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
                  setCategoryForm({ nameKu: '', nameEn: '', nameAr: '' })
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
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Arabic)
                </label>
                <Input
                  value={categoryForm.nameAr}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
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
                    setCategoryForm({ nameKu: '', nameEn: '', nameAr: '' })
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
          onClick={() => {
            setShowAddItem(null)
            setItemForm({ nameKu: '', nameEn: '', nameAr: '', descriptionKu: '', descriptionEn: '', descriptionAr: '', price: '' })
            setItemImage(null)
            setItemImagePreview(null)
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
              <h2 className="text-lg sm:text-xl font-bold admin-text">Add Item</h2>
              <button
                onClick={() => {
                  setShowAddItem(null)
                  setItemForm({ 
                    nameKu: '', 
                    nameEn: '', 
                    nameAr: '', 
                    descriptionKu: '', 
                    descriptionEn: '', 
                    descriptionAr: '', 
                    price: '' 
                  })
                }}
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
                  Name (Arabic)
                </label>
                <Input
                  value={itemForm.nameAr}
                  onChange={(e) => setItemForm({ ...itemForm, nameAr: e.target.value })}
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
                  Description (Arabic)
                </label>
                <textarea
                  value={itemForm.descriptionAr}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionAr: e.target.value })}
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
                    {itemImagePreview ? (
                      <img
                        src={itemImagePreview}
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
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleItemImageChange}
                    />
                  </label>
                  {itemImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setItemImage(null)
                        setItemImagePreview(null)
                        setItemImageRemoved(true) // Mark that user wants to remove image
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
                  onClick={() => {
                    setShowAddItem(null)
                    setItemForm({ 
                      nameKu: '', 
                      nameEn: '', 
                      nameAr: '', 
                      descriptionKu: '', 
                      descriptionEn: '', 
                      descriptionAr: '', 
                      price: '' 
                    })
                    setItemImage(null)
                    setItemImagePreview(null)
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
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Arabic)
                </label>
                <Input
                  value={editSectionForm.nameAr}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, nameAr: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                  Name (Arabic)
                </label>
                <Input
                  value={editCategoryForm.nameAr}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, nameAr: e.target.value })}
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
            setItemImage(null)
            setItemImagePreview(null)
            setItemImageRemoved(false)
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
                  setItemImage(null)
                  setItemImagePreview(null)
                  setItemImageRemoved(false)
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
                  Name (Arabic)
                </label>
                <Input
                  value={editItemForm.nameAr}
                  onChange={(e) => setEditItemForm({ ...editItemForm, nameAr: e.target.value })}
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
                  Description (Arabic)
                </label>
                <textarea
                  value={editItemForm.descriptionAr}
                  onChange={(e) => setEditItemForm({ ...editItemForm, descriptionAr: e.target.value })}
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
                  {itemImagePreview && (
                    <img
                      src={itemImagePreview}
                      alt="Preview"
                      className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 border-white/20"
                    />
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-20 sm:h-24 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                    {!itemImagePreview && (
                      <div className="flex flex-col items-center justify-center pt-2 pb-3 sm:pt-3 sm:pb-4">
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 mb-1 admin-body" />
                        <p className="text-[10px] sm:text-xs admin-body">Click to change image</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleItemImageChange}
                    />
                  </label>
                  {itemImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setItemImage(null)
                        setItemImagePreview(null)
                        setItemImageRemoved(true) // Mark that user wants to remove image
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
                    setItemImage(null)
                    setItemImagePreview(null)
                    setItemImageRemoved(false)
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
    </div>
  )
}


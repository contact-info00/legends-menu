'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Upload, X, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
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

export default function MenuBuilderPage() {
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)
  const [deletingSection, setDeletingSection] = useState<string | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null)
  
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

  // Drag & Drop state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showDragTooltip, setShowDragTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [holdingId, setHoldingId] = useState<string | null>(null) // Track which item is being held
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Configure sensors: 1s delay for touch, immediate for mouse
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Small movement threshold for mouse
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 1000, // 1 second delay for touch
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchMenuData()
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddItem || showAddSection || showAddCategory || editingSection || editingCategory || editingItem) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAddItem, showAddSection, showAddCategory, editingSection, editingCategory, editingItem])

  const fetchMenuData = async () => {
    try {
      const response = await fetch('/api/admin/menu')
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
      
      setSections(normalizedSections)
      // Expand all sections by default
      setExpandedSections(new Set(normalizedSections.map((s: Section) => s.id)))
    } catch (error) {
      console.error('Error fetching menu:', error)
      toast.error('Failed to load menu data')
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

  const toggleCategory = (categoryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
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
    setUploadingImage(id)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { id: mediaId } = await response.json()

      // Update category or item with new image
      if (type === 'category') {
        await fetch(`/api/admin/categories/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageMediaId: mediaId }),
        })
      } else {
        await fetch(`/api/admin/items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageMediaId: mediaId }),
        })
      }

      toast.success('Image uploaded successfully')
      fetchMenuData()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
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
    try {
      let imageMediaId: string | null = null

      // Upload image if provided
      if (itemImage) {
        const formData = new FormData()
        formData.append('file', itemImage)

        const uploadResponse = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }

        const uploadData = await uploadResponse.json()
        imageMediaId = uploadData.id
      }

      // Create item with image
      const response = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemForm,
          categoryId,
          price: parseFloat(itemForm.price),
          imageMediaId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create item')
      }

      toast.success('Item created successfully')
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
      fetchMenuData()
    } catch (error: any) {
      console.error('Error creating item:', error)
      toast.error(error.message || 'Failed to create item')
    }
  }

  const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setItemImage(file)
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
    if (item.imageMediaId) {
      setItemImagePreview(`/api/media/${item.imageMediaId}`)
    }
  }

  const handleUpdateSection = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSectionForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update section')
      }

      toast.success('Section updated successfully')
      setEditingSection(null)
      fetchMenuData()
    } catch (error: any) {
      console.error('Error updating section:', error)
      toast.error(error.message || 'Failed to update section')
    }
  }

  const handleUpdateCategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCategoryForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update category')
      }

      toast.success('Category updated successfully')
      setEditingCategory(null)
      fetchMenuData()
    } catch (error: any) {
      console.error('Error updating category:', error)
      toast.error(error.message || 'Failed to update category')
    }
  }

  const handleUpdateItem = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault()
    try {
      let imageMediaId: string | undefined = undefined

      // Upload new image if provided
      if (itemImage) {
        const formData = new FormData()
        formData.append('file', itemImage)

        const uploadResponse = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }

        const uploadData = await uploadResponse.json()
        imageMediaId = uploadData.id
      }

      const updateData: any = {
        ...editItemForm,
        price: parseFloat(editItemForm.price),
      }

      if (imageMediaId) {
        updateData.imageMediaId = imageMediaId
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
      setEditingItem(null)
      setItemImage(null)
      setItemImagePreview(null)
      fetchMenuData()
    } catch (error: any) {
      console.error('Error updating item:', error)
      toast.error(error.message || 'Failed to update item')
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete section')
      }

      toast.success('Section deleted successfully')
      setDeletingSection(null)
      fetchMenuData()
    } catch (error: any) {
      console.error('Error deleting section:', error)
      toast.error(error.message || 'Failed to delete section')
      setDeletingSection(null)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete category')
      }

      toast.success('Category deleted successfully')
      setDeletingCategory(null)
      fetchMenuData()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error(error.message || 'Failed to delete category')
      setDeletingCategory(null)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete item')
      }

      toast.success('Item deleted successfully')
      setDeletingItem(null)
      fetchMenuData()
    } catch (error: any) {
      console.error('Error deleting item:', error)
      toast.error(error.message || 'Failed to delete item')
      setDeletingItem(null)
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setIsDragging(true)
    setShowDragTooltip(false)
    setHoldingId(null) // Clear holding state when drag starts
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = null
    }
    // Haptic feedback (vibration) if supported
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    // Show tooltip when drag actually starts
    const activeElement = document.querySelector(`[data-id="${event.active.id}"]`) || 
                          document.querySelector(`[data-sortable-id="${event.active.id}"]`) ||
                          document.querySelector(`[data-drag-handle]`)
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect()
      setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 20 })
      setShowDragTooltip(true)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false)
    setShowDragTooltip(false)
    setTooltipPosition(null)
    setHoldingId(null) // Clear holding state
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = null
    }
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Determine which type of drag (section, category, or item)
    const activeSection = sections.find(s => s.id === activeId)
    if (activeSection) {
      // Reordering sections
      const oldIndex = sections.findIndex(s => s.id === activeId)
      const newIndex = sections.findIndex(s => s.id === overId)
      const newSections = arrayMove(sections, oldIndex, newIndex)
      setSections(newSections)
      
      // Update sortOrder and save
      const updates = newSections.map((section, index) => ({
        id: section.id,
        sortOrder: index + 1,
      }))
      
      fetch('/api/admin/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      }).catch(console.error)
      
      return
    }

    // Check if it's a category
    for (const section of sections) {
      const activeCategory = section.categories.find(c => c.id === activeId)
      if (activeCategory) {
        const oldIndex = section.categories.findIndex(c => c.id === activeId)
        const newIndex = section.categories.findIndex(c => c.id === overId)
        const newCategories = arrayMove(section.categories, oldIndex, newIndex)
        
        const updatedSections = sections.map(s =>
          s.id === section.id
            ? { ...s, categories: newCategories }
            : s
        )
        setSections(updatedSections)
        
        // Update sortOrder and save
        const updates = newCategories.map((category, index) => ({
          id: category.id,
          sortOrder: index + 1,
        }))
        
        fetch('/api/admin/categories/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: updates }),
        }).catch(console.error)
        
        return
      }

      // Check if it's an item
      for (const category of section.categories) {
        const activeItem = category.items.find(i => i.id === activeId)
        if (activeItem) {
          const oldIndex = category.items.findIndex(i => i.id === activeId)
          const overCategory = section.categories.find(c => c.items.some(i => i.id === overId))
          if (overCategory && overCategory.id === category.id) {
            const newIndex = category.items.findIndex(i => i.id === overId)
            const newItems = arrayMove(category.items, oldIndex, newIndex)
            
            const updatedSections = sections.map(s =>
              s.id === section.id
                ? {
                    ...s,
                    categories: s.categories.map(c =>
                      c.id === category.id ? { ...c, items: newItems } : c
                    ),
                  }
                : s
            )
            setSections(updatedSections)
            
            // Update sortOrder and save
            const updates = newItems.map((item, index) => ({
              id: item.id,
              sortOrder: index + 1,
            }))
            
            fetch('/api/admin/items/reorder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: updates }),
            }).catch(console.error)
            
            return
          }
        }
      }
    }
  }

  // Sortable Section Component
  function SortableSection({ section }: { section: Section }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: section.id })
    const gripRef = useRef<HTMLButtonElement>(null)

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition, // No animation during drag
      opacity: isDragging ? 0.5 : 1,
    }

    const isHolding = holdingId === section.id

    // Only prevent context menu - let dnd-kit handle all touch events
    // CSS properties (touch-action: none, user-select: none, etc.) prevent browser overlays
    useEffect(() => {
      const gripElement = gripRef.current
      if (!gripElement) return

      const handleContextMenu = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }

      gripElement.addEventListener('contextmenu', handleContextMenu)

      return () => {
        gripElement.removeEventListener('contextmenu', handleContextMenu)
      }
    }, [])

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`border rounded-xl backdrop-blur-sm transition-colors ${
          isHolding 
            ? 'border-[#FBBF24] bg-[#FBBF24]/20' 
            : 'border-white/20 bg-white/5'
        }`}
      >
        {/* Section Header */}
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 sm:p-4 cursor-pointer"
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (!target.closest('button') && !target.closest('[data-drag-handle]')) {
              toggleSection(section.id)
            }
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
            {/* Drag Handle - Far left, vertically centered, large hit area */}
            <button
              ref={gripRef}
              type="button"
              {...attributes}
              {...listeners}
              data-drag-handle
              style={{ 
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
            className="cursor-grab active:cursor-grabbing flex-shrink-0 flex items-center justify-center min-w-[40px] min-h-[40px] bg-transparent border-0 p-0"
            onClick={(e) => {
              // Only prevent accordion toggle, don't prevent drag
              e.stopPropagation()
            }}
            >
              <GripVertical className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-all pointer-events-none select-none" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleSection(section.id)
              }}
              className="p-1 rounded transition-colors flex-shrink-0"
            >
              {expandedSections.has(section.id) ? (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                <span className="font-semibold text-white text-sm sm:text-base truncate">
                  {section.nameEn}
                </span>
                <span className="text-white/70 text-xs sm:text-sm truncate">({section.nameKu} / {section.nameAr})</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditSection(section)}
              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
            >
              <Edit2 className="w-9 h-9 sm:w-10 sm:h-10 text-white" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeletingSection(section.id)}
              className="h-8 w-8 p-0 sm:h-9 sm:w-9 text-red-400 hover:text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-9 h-9 sm:w-10 sm:h-10" />
            </Button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={section.isActive}
                onChange={() => toggleActive('section', section.id, section.isActive)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[var(--button-bg)]"></div>
            </label>
          </div>
        </div>

        {/* Categories */}
        {expandedSections.has(section.id) && (
          <div className="pl-4 sm:pl-8 pr-2 sm:pr-4 pb-3 sm:pb-4">
            <SortableContext
              items={section.categories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {section.categories && section.categories.length > 0 ? (
                  section.categories.map((category) => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      sectionId={section.id}
                    />
                  ))
                ) : (
                  <div className="px-4 py-4 text-center text-white/70 text-sm">
                    No categories in this section
                  </div>
                )}
              </div>
            </SortableContext>
            {/* Add Category Button */}
            <Button
              onClick={() => setShowAddCategory(section.id)}
              className="w-full mt-3 bg-gradient-to-r from-[#800020] to-[#5C0015] text-white hover:opacity-90 text-sm sm:text-base"
              variant="default"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Add Category
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Sortable Category Component
  function SortableCategory({ category, sectionId }: { category: Category; sectionId: string }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category.id })
    const gripRef = useRef<HTMLButtonElement>(null)

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition, // No animation during drag
      opacity: isDragging ? 0.7 : 1,
      scale: isDragging ? 1.02 : 1,
      boxShadow: isDragging ? '0 10px 25px rgba(0, 0, 0, 0.3)' : 'none',
    }

    const isHolding = holdingId === category.id

    // Only prevent context menu - let dnd-kit handle all touch events
    // CSS properties (touch-action: none, user-select: none, etc.) prevent browser overlays
    useEffect(() => {
      const gripElement = gripRef.current
      if (!gripElement) return

      const handleContextMenu = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }

      gripElement.addEventListener('contextmenu', handleContextMenu)

      return () => {
        gripElement.removeEventListener('contextmenu', handleContextMenu)
      }
    }, [])

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`border rounded-lg transition-colors ${
          isHolding 
            ? 'border-[#FBBF24] bg-[#FBBF24]/20' 
            : 'border-white/20'
        }`}
      >
        {/* Category Header */}
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-2 sm:p-3 cursor-pointer"
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (!target.closest('button') && !target.closest('[data-drag-handle]')) {
              toggleCategory(category.id)
            }
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
            {/* Drag Handle - Far left, vertically centered, large hit area */}
            <button
              ref={gripRef}
              type="button"
              {...attributes}
              {...listeners}
              data-drag-handle
              style={{ 
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
              className="cursor-grab active:cursor-grabbing flex-shrink-0 flex items-center justify-center min-w-[40px] min-h-[40px] bg-transparent border-0 p-0"
              onClick={(e) => {
                // Only prevent accordion toggle, don't prevent drag
                e.stopPropagation()
              }}
            >
              <GripVertical className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-all pointer-events-none select-none" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleCategory(category.id)
              }}
              className="p-1 rounded transition-colors cursor-pointer flex-shrink-0"
              type="button"
            >
              {expandedCategories.has(category.id) ? (
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              ) : (
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                <span className="font-medium text-white text-sm sm:text-base truncate">
                  {category.nameEn}
                </span>
                <span className="text-white/70 text-xs truncate">({category.nameKu} / {category.nameAr})</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditCategory(category)}
              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
            >
              <Edit2 className="w-9 h-9 sm:w-10 sm:h-10 text-white" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeletingCategory(category.id)}
              className="h-8 w-8 p-0 sm:h-9 sm:w-9 text-red-400 hover:text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-9 h-9 sm:w-10 sm:h-10" />
            </Button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={category.isActive}
                onChange={() => toggleActive('category', category.id, category.isActive)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[var(--button-bg)]"></div>
            </label>
          </div>
        </div>

        {/* Items */}
        {expandedCategories.has(category.id) && (
          <div className="pl-4 sm:pl-8 pr-2 sm:pr-3 pb-2 sm:pb-3">
            <SortableContext
              items={category.items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {category.items && category.items.length > 0 ? (
                  category.items.map((item) => (
                    <SortableItem key={item.id} item={item} />
                  ))
                ) : (
                  <div className="px-4 py-4 text-center text-white/70 text-sm">
                    No items in this category
                  </div>
                )}
              </div>
            </SortableContext>
            {/* Add Item Button */}
            <Button
              onClick={() => setShowAddItem(category.id)}
              className="w-full mt-3 bg-gradient-to-r from-[#800020] to-[#5C0015] text-white hover:opacity-90 text-sm sm:text-base"
              variant="default"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Sortable Item Component
  function SortableItem({ item }: { item: Item }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id })
    const gripRef = useRef<HTMLButtonElement>(null)

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition, // No animation during drag
      opacity: isDragging ? 0.7 : 1,
      scale: isDragging ? 1.02 : 1,
      boxShadow: isDragging ? '0 10px 25px rgba(0, 0, 0, 0.3)' : 'none',
    }

    const isHolding = holdingId === item.id

    // Only prevent context menu - let dnd-kit handle all touch events
    // CSS properties (touch-action: none, user-select: none, etc.) prevent browser overlays
    useEffect(() => {
      const gripElement = gripRef.current
      if (!gripElement) return

      const handleContextMenu = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }

      gripElement.addEventListener('contextmenu', handleContextMenu)

      return () => {
        gripElement.removeEventListener('contextmenu', handleContextMenu)
      }
    }, [])

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex flex-col gap-2 sm:gap-3 w-full p-2 sm:p-3 rounded border transition-colors ${
          isHolding 
            ? 'border-[#FBBF24] bg-[#FBBF24]/20' 
            : 'border-white/20'
        }`}
      >
        {/* Top Row: Grip + Photo + Name+Price */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Drag Handle - Far left, vertically centered, large hit area */}
          <button
            ref={gripRef}
            type="button"
            {...attributes}
            {...listeners}
            data-drag-handle
            style={{ 
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
            className="cursor-grab active:cursor-grabbing flex-shrink-0 flex items-center justify-center min-w-[40px] min-h-[40px] bg-transparent border-0 p-0"
            onClick={(e) => {
              // Only prevent accordion toggle, don't prevent drag
              e.stopPropagation()
            }}
          >
            <GripVertical className="w-5 h-5 sm:w-6 sm:h-7 text-white transition-all pointer-events-none select-none" />
          </button>
          
          {/* Photo */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-gray-700 overflow-hidden flex-shrink-0">
            {item.imageMediaId ? (
              <img
                src={`/api/media/${item.imageMediaId}`}
                alt={item.nameEn}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-xs">
                No Img
              </div>
            )}
          </div>
          
          {/* Name + Price */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="font-semibold text-white truncate text-xs sm:text-base">
              {item.nameEn}
            </div>
            <div className="text-xs text-[#FBBF24] font-bold">
              {formatPrice(item.price)}
            </div>
          </div>
        </div>
        
        {/* Bottom Row: Actions - Centered under price */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-shrink-0">
          <label 
            className="relative inline-flex items-center cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={item.isActive}
              onChange={(e) => {
                e.stopPropagation()
                toggleActive('item', item.id, item.isActive)
              }}
              className="sr-only peer"
            />
            <div className="w-8 h-4 sm:w-11 sm:h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:left-auto peer-checked:after:right-[2px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[var(--button-bg)]"></div>
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              handleEditItem(item)
            }}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <Edit2 className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingItem(item.id)
            }}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="w-5 h-5 sm:w-8 sm:h-8" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#400810' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 backdrop-blur-xl bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/20 shadow-lg">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Menu Builder</h1>
          <Button 
            onClick={() => router.push('/admin-portal')} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl shadow-lg border border-white/20 p-3 sm:p-6">
            <SortableContext
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 sm:space-y-4">
                {sections.map((section) => (
                  <SortableSection key={section.id} section={section} />
                ))}
              </div>
            </SortableContext>
            {/* Add Section Button */}
            <Button
              onClick={() => setShowAddSection(true)}
              className="w-full mt-4 bg-gradient-to-r from-[#800020] to-[#5C0015] text-white hover:opacity-90 text-sm sm:text-base"
              variant="default"
              size="lg"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Add Section
            </Button>
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {/* Render preview of dragged item */}
              </div>
            ) : null}
          </DragOverlay>
          {/* Drag Tooltip */}
          {showDragTooltip && tooltipPosition && (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: `${tooltipPosition.x + 20}px`,
                top: `${tooltipPosition.y - 40}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-black/90 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm border border-white/20 whitespace-nowrap">
                Drag to reorder
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45 border-r border-b border-white/20"></div>
              </div>
            </div>
          )}
        </DndContext>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Section</h2>
              <button
                onClick={() => {
                  setShowAddSection(false)
                  setSectionForm({ nameKu: '', nameEn: '', nameAr: '' })
                }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={sectionForm.nameKu}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameKu: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (English)
                </label>
                <Input
                  value={sectionForm.nameEn}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameEn: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Arabic)
                </label>
                <Input
                  value={sectionForm.nameAr}
                  onChange={(e) => setSectionForm({ ...sectionForm, nameAr: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Create Section</Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Category</h2>
              <button
                onClick={() => {
                  setShowAddCategory(null)
                  setCategoryForm({ nameKu: '', nameEn: '', nameAr: '' })
                }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleAddCategory(e, showAddCategory)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={categoryForm.nameKu}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameKu: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (English)
                </label>
                <Input
                  value={categoryForm.nameEn}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Arabic)
                </label>
                <Input
                  value={categoryForm.nameAr}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Create Category</Button>
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddItem(null)
            }
          }}
          onWheel={(e) => {
            // Prevent page scroll when scrolling inside modal
            e.stopPropagation()
          }}
          style={{ overflow: 'hidden' }}
        >
          <div 
            className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-3 sm:p-6 w-full max-w-[71.25%] sm:max-w-[21rem] mx-2 sm:mx-auto max-h-[71.25vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              // Allow scrolling inside modal, prevent page scroll
              e.stopPropagation()
            }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Add Item</h2>
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
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleAddItem(e, showAddItem)} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={itemForm.nameKu}
                  onChange={(e) => setItemForm({ ...itemForm, nameKu: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Name (English)
                </label>
                <Input
                  value={itemForm.nameEn}
                  onChange={(e) => setItemForm({ ...itemForm, nameEn: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Name (Arabic)
                </label>
                <Input
                  value={itemForm.nameAr}
                  onChange={(e) => setItemForm({ ...itemForm, nameAr: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Description (English)
                </label>
                <textarea
                  value={itemForm.descriptionEn}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionEn: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Description (Kurdish)
                </label>
                <textarea
                  value={itemForm.descriptionKu}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionKu: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Description (Arabic)
                </label>
                <textarea
                  value={itemForm.descriptionAr}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionAr: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
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
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
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
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 text-white/70" />
                        <p className="text-xs sm:text-sm text-white/70">Click to upload image</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">PNG, JPG, WEBP (max 5MB)</p>
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
                      }}
                      className="w-full text-xs sm:text-sm"
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 text-xs sm:text-sm py-2">Create Item</Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Edit Section</h2>
              <button
                onClick={() => setEditingSection(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleUpdateSection(e, editingSection)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={editSectionForm.nameKu}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, nameKu: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (English)
                </label>
                <Input
                  value={editSectionForm.nameEn}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, nameEn: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Arabic)
                </label>
                <Input
                  value={editSectionForm.nameAr}
                  onChange={(e) => setEditSectionForm({ ...editSectionForm, nameAr: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Update Section</Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Edit Category</h2>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleUpdateCategory(e, editingCategory)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={editCategoryForm.nameKu}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, nameKu: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (English)
                </label>
                <Input
                  value={editCategoryForm.nameEn}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, nameEn: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Name (Arabic)
                </label>
                <Input
                  value={editCategoryForm.nameAr}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, nameAr: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Update Category</Button>
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingItem(null)
            }
          }}
          onWheel={(e) => {
            // Prevent page scroll when scrolling inside modal
            e.stopPropagation()
          }}
          style={{ overflow: 'hidden' }}
        >
          <div 
            className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-3 sm:p-6 w-full max-w-[76%] sm:max-w-[22.4rem] mx-2 sm:mx-auto max-h-[76vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              // Allow scrolling inside modal, prevent page scroll
              e.stopPropagation()
            }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Edit Item</h2>
              <button
                onClick={() => {
                  setEditingItem(null)
                  setItemImage(null)
                  setItemImagePreview(null)
                }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => handleUpdateItem(e, editingItem)} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Name (Kurdish)
                </label>
                <Input
                  value={editItemForm.nameKu}
                  onChange={(e) => setEditItemForm({ ...editItemForm, nameKu: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Name (English)
                </label>
                <Input
                  value={editItemForm.nameEn}
                  onChange={(e) => setEditItemForm({ ...editItemForm, nameEn: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Name (Arabic)
                </label>
                <Input
                  value={editItemForm.nameAr}
                  onChange={(e) => setEditItemForm({ ...editItemForm, nameAr: e.target.value })}
                  required
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Description (English)
                </label>
                <textarea
                  value={editItemForm.descriptionEn}
                  onChange={(e) => setEditItemForm({ ...editItemForm, descriptionEn: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Description (Kurdish)
                </label>
                <textarea
                  value={editItemForm.descriptionKu}
                  onChange={(e) => setEditItemForm({ ...editItemForm, descriptionKu: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                  Description (Arabic)
                </label>
                <textarea
                  value={editItemForm.descriptionAr}
                  onChange={(e) => setEditItemForm({ ...editItemForm, descriptionAr: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
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
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-1">
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
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-white/70" />
                        <p className="text-[10px] sm:text-xs text-white/70">Click to change image</p>
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
                      }}
                      className="w-full text-xs sm:text-sm"
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 text-xs sm:text-sm py-2">Update Item</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingItem(null)
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

      {/* Delete Section Confirmation Modal */}
      {deletingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Delete Section</h2>
            <p className="text-white/80 mb-6">
              Are you sure you want to delete this section? This will also delete all categories and items within it. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => handleDeleteSection(deletingSection)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
              <Button
                onClick={() => setDeletingSection(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Delete Category</h2>
            <p className="text-white/80 mb-6">
              Are you sure you want to delete this category? This will also delete all items within it. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => handleDeleteCategory(deletingCategory)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
              <Button
                onClick={() => setDeletingCategory(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Delete Item</h2>
            <p className="text-white/80 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => handleDeleteItem(deletingItem)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
              <Button
                onClick={() => setDeletingItem(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


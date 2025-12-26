'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'

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

  useEffect(() => {
    fetchMenuData()
  }, [])

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

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#400810' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 backdrop-blur-xl bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/20 shadow-lg">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Menu Builder</h1>
          <Button 
            onClick={() => router.push('/admin')} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </Button>
        </div>

        <div className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl shadow-lg border border-white/20 p-3 sm:p-6 space-y-3 sm:space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="border border-white/20 rounded-xl backdrop-blur-sm bg-white/5">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                  <button
                    onClick={() => toggleSection(section.id)}
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
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditSection(section)}
                    className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                  >
                    <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
                <div className="pl-4 sm:pl-8 pr-2 sm:pr-4 pb-3 sm:pb-4 space-y-2">
                  {section.categories && section.categories.length > 0 ? (
                    section.categories.map((category) => (
                    <div key={category.id} className="border border-white/20 rounded-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-2 sm:p-3">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                          <button
                            onClick={(e) => toggleCategory(category.id, e)}
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
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCategory(category)}
                            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                          >
                            <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
                        <div className="pl-4 sm:pl-8 pr-2 sm:pr-3 pb-2 sm:pb-3 space-y-2">
                          {category.items && category.items.length > 0 ? (
                            <>
                              {category.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 rounded border border-white/20"
                                >
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
                                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                                    <div className="font-medium text-white truncate text-sm sm:text-base">
                                      {item.nameEn}
                                    </div>
                                    <div className="text-xs sm:text-sm text-[#FBBF24] font-bold">
                                      {formatPrice(item.price)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item.isActive}
                                        onChange={() => toggleActive('item', item.id, item.isActive)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[var(--button-bg)]"></div>
                                    </label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditItem(item)}
                                      className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                                    >
                                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {/* Add Item Button */}
                              <Button
                                onClick={() => setShowAddItem(category.id)}
                                className="w-full mt-3 bg-gradient-to-r from-[#800020] to-[#5C0015] text-white hover:opacity-90 text-sm sm:text-base"
                                variant="default"
                              >
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                Add Item
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="px-4 py-4 text-center text-white/70 text-sm">
                                No items in this category
                              </div>
                              {/* Add Item Button */}
                              <Button
                                onClick={() => setShowAddItem(category.id)}
                                className="w-full mt-3 bg-gradient-to-r from-[#800020] to-[#5C0015] text-white hover:opacity-90 text-sm sm:text-base"
                                variant="default"
                              >
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                Add Item
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-white/70 text-sm">
                      No categories in this section
                    </div>
                  )}
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
          ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-3 sm:p-6 w-full max-w-[95%] sm:max-w-md mx-2 sm:mx-auto my-4 sm:my-8 max-h-[95vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-3 sm:p-6 w-full max-w-[95%] sm:max-w-md mx-2 sm:mx-auto my-4 sm:my-8 max-h-[95vh] overflow-y-auto">
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
    </div>
  )
}


'use client'

import { memo } from 'react'
import { ChevronDown, ChevronRight, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAdminMenuName } from '@/lib/admin-display-name'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category, Item, MenuEntityType, MenuRowType, Section } from './menu-builder-types'

type SortableAttributes = ReturnType<typeof useSortable>['attributes']
type SortableListeners = ReturnType<typeof useSortable>['listeners']

/** Grip + drag listeners shared by every sortable row. */
export interface GripHandlers {
  onGripMouseDown: (e: React.MouseEvent, id: string, type: MenuEntityType) => void
  onGripMouseUp: (e: React.MouseEvent) => void
  onGripMouseLeave: () => void
  onGripTouchStart: (e: React.TouchEvent, id: string, type: MenuEntityType) => void
  onGripTouchEnd: (e: React.TouchEvent) => void
}

const ROW_CLASS_NAME = 'flex items-center gap-2 sm:gap-3 p-2 rounded border relative'

function rowStyle(transform: string | undefined, transition: string | undefined, isDragging: boolean) {
  return {
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    transform,
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
}

function DragHandle({
  id,
  type,
  attributes,
  listeners,
  grip,
}: {
  id: string
  type: MenuEntityType
  attributes: SortableAttributes
  listeners: SortableListeners
  grip: GripHandlers
}) {
  return (
    <>
      <div
        {...attributes}
        {...listeners}
        onMouseDown={(e) => grip.onGripMouseDown(e, id, type)}
        onMouseUp={grip.onGripMouseUp}
        onMouseLeave={grip.onGripMouseLeave}
        onTouchStart={(e) => grip.onGripTouchStart(e, id, type)}
        onTouchEnd={grip.onGripTouchEnd}
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
      <div className="flex-shrink-0" style={{ color: '#94A3B8' }}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
        </svg>
      </div>
    </>
  )
}

function VisibilityToggle({ isActive, onChange }: { isActive: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={isActive}
        onChange={(e) => {
          e.stopPropagation()
          onChange()
        }}
        onClick={(e) => e.stopPropagation()}
        className="sr-only peer"
      />
      <div
        className="w-9 h-5 sm:w-11 sm:h-6 peer-focus:outline-none rounded-full peer peer-checked:after:left-auto peer-checked:after:right-[2px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all border"
        style={{
          backgroundColor: isActive ? '#27C499' : '#EF4444',
          border: '1px solid #D1D5DB',
        }}
      ></div>
    </label>
  )
}

function RowActionsMenu({
  isOpen,
  onToggle,
  onEdit,
  onDelete,
}: {
  isOpen: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className="h-10 w-10 p-0 sm:h-12 sm:w-12"
      >
        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#475569' }} />
      </Button>
      {isOpen && (
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
                onEdit()
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
                onDelete()
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
              style={{ color: '#EF4444' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export interface SortableSectionProps {
  section: Section
  isExpanded: boolean
  isHolding: boolean
  isMenuOpen: boolean
  grip: GripHandlers
  onToggleSection: (id: string) => void
  onEditSection: (section: Section) => void
  onDelete: (type: MenuEntityType, id: string, name: string) => void
  onToggleActive: (type: MenuEntityType, id: string, currentState: boolean) => void
  onToggleRowMenu: (id: string, type: MenuRowType, isOpen: boolean) => void
  onCloseRowMenu: () => void
}

export const SortableSection = memo(function SortableSection({
  section,
  isExpanded,
  isHolding,
  isMenuOpen,
  grip,
  onToggleSection,
  onEditSection,
  onDelete,
  onToggleActive,
  onToggleRowMenu,
  onCloseRowMenu,
}: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${ROW_CLASS_NAME} ${isHolding ? 'scale-105 shadow-lg' : ''}`}
      style={rowStyle(CSS.Transform.toString(transform), transition, isDragging)}
    >
      <DragHandle
        id={section.id}
        type="section"
        attributes={attributes}
        listeners={listeners}
        grip={grip}
      />
      {/* Chevron and Name - Click to toggle expand/collapse */}
      <div
        className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => onToggleSection(section.id)}
      >
        <div className="p-1 rounded transition-colors flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#475569' }} />
          ) : (
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#475569' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-sm sm:text-base" style={{ color: '#0F172A' }}>
            {getAdminMenuName(section)}
          </div>
        </div>
      </div>
      {/* Toggle and Menu */}
      <div className="flex items-center gap-2 flex-shrink-0 relative">
        <VisibilityToggle
          isActive={section.isActive}
          onChange={() => onToggleActive('section', section.id, section.isActive)}
        />
        <RowActionsMenu
          isOpen={isMenuOpen}
          onToggle={() => onToggleRowMenu(section.id, 'section', isMenuOpen)}
          onEdit={() => {
            onCloseRowMenu()
            onEditSection(section)
          }}
          onDelete={() => {
            onCloseRowMenu()
            onDelete('section', section.id, getAdminMenuName(section))
          }}
        />
      </div>
    </div>
  )
})

export interface SortableCategoryProps {
  category: Category
  isExpanded: boolean
  isHolding: boolean
  isMenuOpen: boolean
  grip: GripHandlers
  onToggleCategory: (id: string) => void
  onEditCategory: (category: Category) => void
  onDelete: (type: MenuEntityType, id: string, name: string) => void
  onToggleActive: (type: MenuEntityType, id: string, currentState: boolean) => void
  onToggleRowMenu: (id: string, type: MenuRowType, isOpen: boolean) => void
  onCloseRowMenu: () => void
}

export const SortableCategory = memo(function SortableCategory({
  category,
  isExpanded,
  isHolding,
  isMenuOpen,
  grip,
  onToggleCategory,
  onEditCategory,
  onDelete,
  onToggleActive,
  onToggleRowMenu,
  onCloseRowMenu,
}: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${ROW_CLASS_NAME} ${isHolding ? 'scale-105 shadow-lg' : ''}`}
      style={rowStyle(CSS.Transform.toString(transform), transition, isDragging)}
    >
      <DragHandle
        id={category.id}
        type="category"
        attributes={attributes}
        listeners={listeners}
        grip={grip}
      />
      {/* Chevron and Name - Click to toggle expand/collapse */}
      <div
        className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => onToggleCategory(category.id)}
      >
        <div className="p-1 rounded transition-colors flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#475569' }} />
          ) : (
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#475569' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-sm sm:text-base" style={{ color: '#0F172A' }}>
            {getAdminMenuName(category)}
          </div>
          <div className="text-xs truncate" style={{ color: '#94A3B8' }}>
            {category.items?.length || 0} Items
          </div>
        </div>
      </div>
      {/* Toggle and Menu */}
      <div className="flex items-center gap-2 flex-shrink-0 relative">
        <VisibilityToggle
          isActive={category.isActive}
          onChange={() => onToggleActive('category', category.id, category.isActive)}
        />
        <RowActionsMenu
          isOpen={isMenuOpen}
          onToggle={() => onToggleRowMenu(category.id, 'category', isMenuOpen)}
          onEdit={() => {
            onCloseRowMenu()
            onEditCategory(category)
          }}
          onDelete={() => {
            onCloseRowMenu()
            onDelete('category', category.id, getAdminMenuName(category))
          }}
        />
      </div>
    </div>
  )
})

export interface SortableItemProps {
  item: Item
  isHolding: boolean
  grip: GripHandlers
  onEditItem: (item: Item) => void
  onDelete: (type: MenuEntityType, id: string, name: string) => void
  onToggleActive: (type: MenuEntityType, id: string, currentState: boolean) => void
  formatPrice: (price: number) => string
}

export const SortableItem = memo(function SortableItem({
  item,
  isHolding,
  grip,
  onEditItem,
  onDelete,
  onToggleActive,
  formatPrice,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  // Check R2 URL first, then fall back to old media ID
  const imageUrl = item.imageR2Url || (item.imageMediaId ? `/assets/${item.imageMediaId}` : null)

  return (
    <div
      ref={setNodeRef}
      className={`${ROW_CLASS_NAME} ${isHolding ? 'scale-105 shadow-lg' : ''}`}
      style={rowStyle(CSS.Transform.toString(transform), transition, isDragging)}
    >
      <DragHandle
        id={item.id}
        type="item"
        attributes={attributes}
        listeners={listeners}
        grip={grip}
      />
      {/* Image Thumbnail */}
      <div
        className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-gray-700 overflow-hidden flex-shrink-0 cursor-pointer"
        onClick={() => onEditItem(item)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={getAdminMenuName(item)}
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
        )}
      </div>
      {/* Name and Price */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEditItem(item)}>
        <div
          className="font-medium truncate text-sm sm:text-base"
          style={{
            color: '#0F172A',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F7F2')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {getAdminMenuName(item)}
        </div>
        <div className="text-xs sm:text-sm text-[#FBBF24] font-bold">{formatPrice(item.price)}</div>
      </div>
      {/* Toggle and Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <VisibilityToggle
          isActive={item.isActive}
          onChange={() => onToggleActive('item', item.id, item.isActive)}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onDelete('item', item.id, getAdminMenuName(item))
          }}
          className="h-10 w-10 p-0 sm:h-12 sm:w-12"
        >
          <Trash2 className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#EF4444' }} />
        </Button>
      </div>
    </div>
  )
})

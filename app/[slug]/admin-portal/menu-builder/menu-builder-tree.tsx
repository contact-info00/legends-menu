'use client'

import { memo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAdminMenuName } from '@/lib/admin-display-name'
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableCategory, SortableItem, SortableSection, type GripHandlers } from './menu-builder-rows'
import type { Category, Item, MenuEntityType, MenuRowType, Section } from './menu-builder-types'

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
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
      {label}
    </Button>
  )
}

export interface MenuTreeProps {
  sections: Section[]
  expandedSections: Set<string>
  expandedCategories: Set<string>
  activeId: string | null
  activeType: MenuEntityType | null
  holdingId: string | null
  holdingType: MenuEntityType | null
  openMenuId: string | null
  openMenuType: MenuRowType | null
  sensors: SensorDescriptor<SensorOptions>[]
  grip: GripHandlers
  onDragStart: (event: DragStartEvent) => void
  onDragMove: (event: DragMoveEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onToggleSection: (id: string) => void
  onToggleCategory: (id: string) => void
  onEditSection: (section: Section) => void
  onEditCategory: (category: Category) => void
  onEditItem: (item: Item) => void
  onAdvancedOptions: (item: Item) => void
  onDelete: (type: MenuEntityType, id: string, name: string) => void
  onToggleActive: (type: MenuEntityType, id: string, currentState: boolean) => void
  onToggleRowMenu: (id: string, type: MenuRowType, isOpen: boolean) => void
  onCloseRowMenu: () => void
  onAddCategory: (sectionId: string) => void
  onAddItem: (categoryId: string) => void
  onAddSection: () => void
  formatPrice: (price: number) => string
}

/**
 * The whole drag-and-drop tree. Memoized so that typing in any modal form — which only touches
 * form state in the parent — cannot re-render or remount a single row here.
 */
export const MenuTree = memo(function MenuTree({
  sections,
  expandedSections,
  expandedCategories,
  activeId,
  activeType,
  holdingId,
  holdingType,
  openMenuId,
  openMenuType,
  sensors,
  grip,
  onDragStart,
  onDragMove,
  onDragEnd,
  onToggleSection,
  onToggleCategory,
  onEditSection,
  onEditCategory,
  onEditItem,
  onAdvancedOptions,
  onDelete,
  onToggleActive,
  onToggleRowMenu,
  onCloseRowMenu,
  onAddCategory,
  onAddItem,
  onAddSection,
  formatPrice,
}: MenuTreeProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      <div
        className="backdrop-blur-xl rounded-2xl border p-3 sm:p-6 space-y-3 sm:space-y-4"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1D5DB',
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 20px rgba(39, 196, 153, 0.3), 0 0 40px rgba(39, 196, 153, 0.15)',
        }}
      >
        {/* Always show sections with expand/collapse - sections start collapsed */}
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <SortableSection
                section={section}
                isExpanded={expandedSections.has(section.id)}
                isHolding={holdingId === section.id && holdingType === 'section'}
                isMenuOpen={openMenuId === section.id && openMenuType === 'section'}
                grip={grip}
                onToggleSection={onToggleSection}
                onEditSection={onEditSection}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                onToggleRowMenu={onToggleRowMenu}
                onCloseRowMenu={onCloseRowMenu}
              />
              {/* Categories - rendered outside section frame, directly under section name */}
              {expandedSections.has(section.id) && (
                <div className="space-y-2">
                  <SortableContext
                    items={section.categories.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {section.categories && section.categories.length > 0 ? (
                      section.categories.map((category) => (
                        <div key={category.id} className="space-y-2">
                          <SortableCategory
                            category={category}
                            isExpanded={expandedCategories.has(category.id)}
                            isHolding={holdingId === category.id && holdingType === 'category'}
                            isMenuOpen={openMenuId === category.id && openMenuType === 'category'}
                            grip={grip}
                            onToggleCategory={onToggleCategory}
                            onEditCategory={onEditCategory}
                            onDelete={onDelete}
                            onToggleActive={onToggleActive}
                            onToggleRowMenu={onToggleRowMenu}
                            onCloseRowMenu={onCloseRowMenu}
                          />
                          {/* Items - rendered outside category frame, directly under category name */}
                          {expandedCategories.has(category.id) && (
                            <div className="space-y-2">
                              <SortableContext
                                items={category.items.map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {category.items && category.items.length > 0 ? (
                                  <>
                                    {category.items.map((item) => (
                                      <SortableItem
                                        key={item.id}
                                        item={item}
                                        isHolding={holdingId === item.id && holdingType === 'item'}
                                        grip={grip}
                                        onEditItem={onEditItem}
                                        onAdvancedOptions={onAdvancedOptions}
                                        onDelete={onDelete}
                                        onToggleActive={onToggleActive}
                                        formatPrice={formatPrice}
                                      />
                                    ))}
                                    <AddRowButton
                                      label="Add Item"
                                      onClick={() => onAddItem(category.id)}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <div
                                      className="px-4 py-4 text-center text-sm"
                                      style={{ color: '#94A3B8' }}
                                    >
                                      No items in this category
                                    </div>
                                    <AddRowButton
                                      label="Add Item"
                                      onClick={() => onAddItem(category.id)}
                                    />
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
                  <AddRowButton label="Add Category" onClick={() => onAddCategory(section.id)} />
                </div>
              )}
            </div>
          ))}
        </SortableContext>
        {/* Add Section Button - at bottom of sections */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
          <Button
            onClick={onAddSection}
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
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#20B08A')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#27C499')}
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
                {sections.find((s) => s.id === activeId)
                  ? getAdminMenuName(sections.find((s) => s.id === activeId)!)
                  : ''}
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
                {(() => {
                  const category = sections.flatMap((s) => s.categories).find((c) => c.id === activeId)
                  return category ? getAdminMenuName(category) : ''
                })()}
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
                {(() => {
                  const item = sections
                    .flatMap((s) => s.categories)
                    .flatMap((c) => c.items)
                    .find((i) => i.id === activeId)
                  return item ? getAdminMenuName(item) : ''
                })()}
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
})

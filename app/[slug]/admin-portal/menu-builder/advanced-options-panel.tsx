'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import {
  ArrowDown,
  ArrowUp,
  MoreVertical,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  adminNotifyError,
  runAdminOperation,
} from '@/lib/admin-notifications'
import type {
  AdvancedOptionsPayload,
} from '@/lib/advanced-options'
import { getAdminMenuName } from '@/lib/admin-display-name'
import type { Item } from './menu-builder-types'

type Group = AdvancedOptionsPayload['groups'][number]
type Option = Group['options'][number]
type Level = AdvancedOptionsPayload['levels'][number]

type NameForm = { nameKu: string; nameEn: string }
type OptionForm = NameForm & { priceAdjustment: string; isActive: boolean }
type GroupForm = NameForm

type EditorState =
  | { kind: 'add-group' }
  | { kind: 'edit-group'; group: Group }
  | { kind: 'add-option'; groupId: string }
  | { kind: 'edit-option'; groupId: string; option: Option }
  | null

/** Fixed internal names for the Dry–Sweet scale (not shown as editable fields). */
const DRY_SWEET_NAME_EN = 'Dry-Sweet'
const DRY_SWEET_NAME_KU = 'وشک-شیرین'

const ADMIN_INPUT_STYLE: CSSProperties = {
  border: '1px solid #D1D5DB',
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
}

const ADMIN_SELECT_STYLE: CSSProperties = {
  ...ADMIN_INPUT_STYLE,
  borderRadius: '0.75rem',
  height: '2.5rem',
  width: '100%',
  padding: '0 0.75rem',
  fontSize: '0.875rem',
}

const PRIMARY_BTN_STYLE: CSSProperties = {
  backgroundColor: '#27C499',
  color: '#FFFFFF',
}

interface AdvancedOptionsPanelProps {
  item: Item
  isOpen: boolean
  onClose: () => void
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error
    }
  } catch {
    // ignore
  }
  return fallback
}

function DrySweetScale({
  value,
  onChange,
  interactive = false,
}: {
  value: number
  onChange?: (value: number) => void
  interactive?: boolean
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-sm font-medium shrink-0" style={{ color: '#0F172A' }}>
        Dry
      </span>
      <div className="flex flex-1 items-center justify-center gap-2.5" aria-label={`Level ${value} of 5`}>
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1
          const filled = n <= value
          const DotTag = interactive ? 'button' : 'span'
          return (
            <DotTag
              key={n}
              type={interactive ? 'button' : undefined}
              onClick={interactive && onChange ? () => onChange(n) : undefined}
              className={interactive ? 'p-0.5 rounded-full hover:opacity-80' : undefined}
              aria-label={interactive ? `Set level ${n}` : undefined}
              aria-pressed={interactive ? filled : undefined}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{
                  backgroundColor: filled ? '#0F172A' : 'transparent',
                  border: '1.5px solid #0F172A',
                }}
              />
            </DotTag>
          )
        })}
      </div>
      <span className="text-sm font-medium shrink-0" style={{ color: '#0F172A' }}>
        Sweet
      </span>
    </div>
  )
}

export function AdvancedOptionsPanel({ item, isOpen, onClose }: AdvancedOptionsPanelProps) {
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(null)
  const [draftDrySweet, setDraftDrySweet] = useState(3)
  const [groupForm, setGroupForm] = useState<GroupForm>({
    nameKu: '',
    nameEn: '',
  })
  const [optionForm, setOptionForm] = useState<OptionForm>({
    nameKu: '',
    nameEn: '',
    priceAdjustment: '',
    isActive: true,
  })

  const drySweetLevel = levels[0] ?? null

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/items/${item.id}/advanced-options`)
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load advanced options'))
      }
      const data = await response.json()
      const nextLevels: Level[] = data.levels ?? []
      setGroups(data.groups ?? [])
      setLevels(nextLevels)
      setDraftDrySweet(nextLevels[0]?.value ?? 3)
    } catch (error) {
      adminNotifyError(error instanceof Error ? error.message : 'Failed to load advanced options')
      onClose()
    } finally {
      setLoading(false)
    }
  }, [item.id, onClose])

  useEffect(() => {
    if (!isOpen) return
    setEditor(null)
    setOpenMenuId(null)
    void loadData()
  }, [isOpen, loadData])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editor) {
          setEditor(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, editor, onClose])

  if (!isOpen) return null

  const closeEditor = () => setEditor(null)

  const openAddGroup = () => {
    setGroupForm({ nameKu: '', nameEn: '' })
    setEditor({ kind: 'add-group' })
    setOpenMenuId(null)
  }

  const openEditGroup = (group: Group) => {
    setGroupForm({
      nameKu: group.nameKu,
      nameEn: group.nameEn,
    })
    setEditor({ kind: 'edit-group', group })
    setOpenMenuId(null)
  }

  const openAddOption = (groupId: string) => {
    setOptionForm({ nameKu: '', nameEn: '', priceAdjustment: '', isActive: true })
    setEditor({ kind: 'add-option', groupId })
    setOpenMenuId(null)
  }

  const openEditOption = (groupId: string, option: Option) => {
    setOptionForm({
      nameKu: option.nameKu,
      nameEn: option.nameEn,
      priceAdjustment:
        option.priceAdjustment === null || option.priceAdjustment === undefined
          ? ''
          : String(option.priceAdjustment),
      isActive: option.isActive,
    })
    setEditor({ kind: 'edit-option', groupId, option })
    setOpenMenuId(null)
  }

  const saveGroup = async () => {
    if (!groupForm.nameKu.trim() || !groupForm.nameEn.trim()) {
      adminNotifyError('English and Kurdish names are required')
      return
    }

    if (editor?.kind === 'add-group') {
      await runAdminOperation({
        loadingMessage: 'Creating option group...',
        successMessage: '✓ Option group created',
        errorMessage: 'Failed to create option group',
        operation: async () => {
          const response = await fetch(`/api/admin/items/${item.id}/advanced-options/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...groupForm,
              selectionMode: 'multiple',
            }),
          })
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to create option group'))
          }
          return response.json()
        },
        onSuccess: (created: Group & { options?: Option[] }) => {
          setGroups((prev) => [
            ...prev,
            {
              ...created,
              options: created.options ?? [],
              selectionMode: 'multiple',
            },
          ])
          closeEditor()
        },
      })
      return
    }

    if (editor?.kind === 'edit-group') {
      const groupId = editor.group.id
      await runAdminOperation({
        loadingMessage: 'Updating option group...',
        successMessage: '✓ Option group updated',
        errorMessage: 'Failed to update option group',
        operation: async () => {
          const response = await fetch(`/api/admin/advanced-option-groups/${groupId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...groupForm,
              selectionMode: 'multiple',
            }),
          })
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to update option group'))
          }
          return response.json()
        },
        onSuccess: (updated: Group) => {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    nameKu: updated.nameKu,
                    nameEn: updated.nameEn,
                    nameAr: updated.nameAr,
                    selectionMode: 'multiple',
                    isActive: updated.isActive,
                  }
                : g
            )
          )
          closeEditor()
        },
      })
    }
  }

  const saveOption = async () => {
    if (!optionForm.nameKu.trim() || !optionForm.nameEn.trim()) {
      adminNotifyError('English and Kurdish names are required')
      return
    }

    const priceRaw = optionForm.priceAdjustment.trim()
    const priceAdjustment = priceRaw === '' ? null : Number(priceRaw)
    if (priceRaw !== '' && !Number.isFinite(priceAdjustment)) {
      adminNotifyError('Price adjustment must be a number')
      return
    }

    if (editor?.kind === 'add-option') {
      const groupId = editor.groupId
      await runAdminOperation({
        loadingMessage: 'Creating option...',
        successMessage: '✓ Option created',
        errorMessage: 'Failed to create option',
        operation: async () => {
          const response = await fetch(
            `/api/admin/advanced-option-groups/${groupId}/options`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nameKu: optionForm.nameKu,
                nameEn: optionForm.nameEn,
                priceAdjustment,
                isActive: optionForm.isActive,
              }),
            }
          )
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to create option'))
          }
          return response.json()
        },
        onSuccess: (created: Option) => {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId ? { ...g, options: [...g.options, created] } : g
            )
          )
          closeEditor()
        },
      })
      return
    }

    if (editor?.kind === 'edit-option') {
      const { groupId, option } = editor
      await runAdminOperation({
        loadingMessage: 'Updating option...',
        successMessage: '✓ Option updated',
        errorMessage: 'Failed to update option',
        operation: async () => {
          const response = await fetch(`/api/admin/advanced-options/${option.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nameKu: optionForm.nameKu,
              nameEn: optionForm.nameEn,
              priceAdjustment,
              isActive: optionForm.isActive,
            }),
          })
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to update option'))
          }
          return response.json()
        },
        onSuccess: (updated: Option) => {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    options: g.options.map((o) => (o.id === option.id ? { ...o, ...updated } : o)),
                  }
                : g
            )
          )
          closeEditor()
        },
      })
    }
  }

  const saveDrySweetLevel = async () => {
    const value = Math.min(5, Math.max(1, draftDrySweet))

    if (drySweetLevel) {
      await runAdminOperation({
        loadingMessage: 'Updating level...',
        successMessage: '✓ Level updated',
        errorMessage: 'Failed to update level',
        operation: async () => {
          const response = await fetch(`/api/admin/item-levels/${drySweetLevel.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
          })
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to update level'))
          }
          return response.json()
        },
        onSuccess: (updated: Level) => {
          setLevels([updated])
          setDraftDrySweet(updated.value)
        },
      })
      return
    }

    await runAdminOperation({
      loadingMessage: 'Saving level...',
      successMessage: '✓ Level saved',
      errorMessage: 'Failed to save level',
      operation: async () => {
        const response = await fetch(`/api/admin/items/${item.id}/advanced-options/levels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameEn: DRY_SWEET_NAME_EN,
            nameKu: DRY_SWEET_NAME_KU,
            value,
          }),
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to save level'))
        }
        return response.json()
      },
      onSuccess: (created: Level) => {
        setLevels([created])
        setDraftDrySweet(created.value)
      },
    })
  }

  const removeDrySweetLevel = async () => {
    if (!drySweetLevel) return
    if (!window.confirm('Remove Dry / Sweet level from this item?')) return

    const previous = levels
    setLevels([])
    setDraftDrySweet(3)

    await runAdminOperation({
      loadingMessage: 'Removing level...',
      successMessage: '✓ Level removed',
      errorMessage: 'Failed to remove level',
      operation: async () => {
        const response = await fetch(`/api/admin/item-levels/${drySweetLevel.id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to remove level'))
        }
      },
      onError: () => {
        setLevels(previous)
        setDraftDrySweet(previous[0]?.value ?? 3)
      },
    })
  }

  const deleteGroup = async (group: Group) => {
    setOpenMenuId(null)
    if (!window.confirm(`Delete group "${group.nameEn}" and all its options?`)) return

    const previous = groups
    setGroups((prev) => prev.filter((g) => g.id !== group.id))

    await runAdminOperation({
      loadingMessage: 'Deleting group...',
      successMessage: '✓ Group deleted',
      errorMessage: 'Failed to delete group',
      operation: async () => {
        const response = await fetch(`/api/admin/advanced-option-groups/${group.id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to delete group'))
        }
      },
      onError: () => setGroups(previous),
    })
  }

  const deleteOption = async (groupId: string, option: Option) => {
    setOpenMenuId(null)
    if (!window.confirm(`Delete option "${option.nameEn}"?`)) return

    const previous = groups
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== option.id) }
          : g
      )
    )

    await runAdminOperation({
      loadingMessage: 'Deleting option...',
      successMessage: '✓ Option deleted',
      errorMessage: 'Failed to delete option',
      operation: async () => {
        const response = await fetch(`/api/admin/advanced-options/${option.id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to delete option'))
        }
      },
      onError: () => setGroups(previous),
    })
  }

  const toggleOptionActive = async (groupId: string, option: Option) => {
    setOpenMenuId(null)
    const nextActive = !option.isActive
    const previous = groups
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((o) =>
                o.id === option.id ? { ...o, isActive: nextActive } : o
              ),
            }
          : g
      )
    )

    await runAdminOperation({
      loadingMessage: 'Updating option...',
      successMessage: nextActive ? '✓ Option enabled' : '✓ Option disabled',
      errorMessage: 'Failed to update option',
      operation: async () => {
        const response = await fetch(`/api/admin/advanced-options/${option.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: nextActive }),
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to update option'))
        }
      },
      onError: () => setGroups(previous),
    })
  }

  const moveGroup = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= groups.length) return

    const previous = groups
    const reordered = [...groups]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(nextIndex, 0, moved)
    const withSort = reordered.map((g, i) => ({ ...g, sortOrder: i }))
    setGroups(withSort)

    await runAdminOperation({
      loadingMessage: 'Reordering groups...',
      successMessage: '✓ Groups reordered',
      errorMessage: 'Failed to reorder groups',
      operation: async () => {
        const response = await fetch('/api/admin/advanced-option-groups/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groups: withSort.map((g) => ({ id: g.id, sortOrder: g.sortOrder })),
          }),
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to reorder groups'))
        }
      },
      onError: () => setGroups(previous),
    })
  }

  const moveOption = async (groupId: string, index: number, direction: -1 | 1) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= group.options.length) return

    const previous = groups
    const reordered = [...group.options]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(nextIndex, 0, moved)
    const withSort = reordered.map((o, i) => ({ ...o, sortOrder: i }))

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, options: withSort } : g))
    )

    await runAdminOperation({
      loadingMessage: 'Reordering options...',
      successMessage: '✓ Options reordered',
      errorMessage: 'Failed to reorder options',
      operation: async () => {
        const response = await fetch('/api/admin/advanced-options/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            options: withSort.map((o) => ({ id: o.id, sortOrder: o.sortOrder })),
          }),
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to reorder options'))
        }
      },
      onError: () => setGroups(previous),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="backdrop-blur-xl rounded-3xl border p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-auto my-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1D5DB',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
              <Settings2 className="w-5 h-5 shrink-0" />
              Advanced Options
            </h2>
            <p className="text-sm mt-0.5 truncate" style={{ color: '#64748B' }}>
              Item: {getAdminMenuName(item)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: '#475569', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                Option Groups
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={openAddGroup}
                className="h-8 gap-1"
                style={PRIMARY_BTN_STYLE}
              >
                <Plus className="w-4 h-4" />
                Add Option Group
              </Button>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm" style={{ color: '#64748B' }}>
                No option groups yet. Add groups like Sauce or Sides.
              </p>
            ) : (
              <div className="space-y-3">
                {groups.map((group, groupIndex) => (
                  <div
                    key={group.id}
                    className="rounded-xl p-3"
                    style={{ border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate" style={{ color: '#0F172A' }}>
                          {group.nameEn}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                          Selection: Multiple
                          {!group.isActive ? ' · Hidden' : ''}
                        </div>
                      </div>
                      <div className="relative flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                          disabled={groupIndex === 0}
                          onClick={() => void moveGroup(groupIndex, -1)}
                          aria-label="Move group up"
                        >
                          <ArrowUp className="w-4 h-4" style={{ color: '#475569' }} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                          disabled={groupIndex === groups.length - 1}
                          onClick={() => void moveGroup(groupIndex, 1)}
                          aria-label="Move group down"
                        >
                          <ArrowDown className="w-4 h-4" style={{ color: '#475569' }} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-gray-100"
                          onClick={() =>
                            setOpenMenuId(openMenuId === group.id ? null : group.id)
                          }
                          aria-label="Group menu"
                        >
                          <MoreVertical className="w-4 h-4" style={{ color: '#475569' }} />
                        </button>
                        {openMenuId === group.id && (
                          <div
                            className="absolute right-0 top-8 z-10 w-36 rounded-md py-1 shadow-lg"
                            style={{ border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                          >
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              style={{ color: '#0F172A' }}
                              onClick={() => openEditGroup(group)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              style={{ color: '#EF4444' }}
                              onClick={() => void deleteGroup(group)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {group.options.map((option, optionIndex) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm truncate ${!option.isActive ? 'line-through' : ''}`}
                              style={{ color: option.isActive ? '#0F172A' : '#94A3B8' }}
                            >
                              {option.nameEn}
                            </div>
                            {option.priceAdjustment != null && option.priceAdjustment !== 0 && (
                              <div className="text-xs" style={{ color: '#D97706' }}>
                                {option.priceAdjustment > 0 ? '+' : ''}
                                {option.priceAdjustment}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                            disabled={optionIndex === 0}
                            onClick={() => void moveOption(group.id, optionIndex, -1)}
                            aria-label="Move option up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                            disabled={optionIndex === group.options.length - 1}
                            onClick={() => void moveOption(group.id, optionIndex, 1)}
                            aria-label="Move option down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100"
                              onClick={() =>
                                setOpenMenuId(openMenuId === option.id ? null : option.id)
                              }
                              aria-label="Option menu"
                            >
                              <MoreVertical className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                            </button>
                            {openMenuId === option.id && (
                              <div
                                className="absolute right-0 top-7 z-10 w-40 rounded-md py-1 shadow-lg"
                                style={{ border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
                              >
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                  style={{ color: '#0F172A' }}
                                  onClick={() => openEditOption(group.id, option)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                  style={{ color: '#0F172A' }}
                                  onClick={() => void toggleOptionActive(group.id, option)}
                                >
                                  {option.isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                  style={{ color: '#EF4444' }}
                                  onClick={() => void deleteOption(group.id, option)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddOption(group.id)}
                      className="mt-2 inline-flex items-center gap-1 text-sm hover:underline"
                      style={{ color: '#27C499' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add option
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3" style={{ borderTop: '1px solid #E5E7EB' }}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
                Dry / Sweet Level
              </h3>
              <p className="text-xs mb-3" style={{ color: '#64748B' }}>
                Optional 1–5 scale. Left is Dry, right is Sweet.
              </p>

              <div
                className="rounded-xl p-4 space-y-4"
                style={{ border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF' }}
              >
                <DrySweetScale
                  value={draftDrySweet}
                  interactive
                  onChange={setDraftDrySweet}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => void saveDrySweetLevel()}
                    style={PRIMARY_BTN_STYLE}
                  >
                    {drySweetLevel ? 'Update Level' : 'Save Level'}
                  </Button>
                  {drySweetLevel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void removeDrySweetLevel()}
                      style={{
                        border: '1px solid #D1D5DB',
                        color: '#EF4444',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {editor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={closeEditor}
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
              <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>
                {editor.kind === 'add-group' && 'Add Option Group'}
                {editor.kind === 'edit-group' && 'Edit Option Group'}
                {editor.kind === 'add-option' && 'Add Option'}
                {editor.kind === 'edit-option' && 'Edit Option'}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                style={{ color: '#475569', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(editor.kind === 'add-group' || editor.kind === 'edit-group') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                    Name (Kurdish)
                  </label>
                  <Input
                    value={groupForm.nameKu}
                    onChange={(e) => setGroupForm((f) => ({ ...f, nameKu: e.target.value }))}
                    required
                    style={ADMIN_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                    Name (English)
                  </label>
                  <Input
                    value={groupForm.nameEn}
                    onChange={(e) => setGroupForm((f) => ({ ...f, nameEn: e.target.value }))}
                    required
                    style={ADMIN_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                    Selection
                  </label>
                  <select value="multiple" disabled style={ADMIN_SELECT_STYLE}>
                    <option value="multiple">Multiple choice</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => void saveGroup()}
                    style={PRIMARY_BTN_STYLE}
                  >
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={closeEditor}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {(editor.kind === 'add-option' || editor.kind === 'edit-option') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                    Name (Kurdish)
                  </label>
                  <Input
                    value={optionForm.nameKu}
                    onChange={(e) => setOptionForm((f) => ({ ...f, nameKu: e.target.value }))}
                    required
                    style={ADMIN_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                    Name (English)
                  </label>
                  <Input
                    value={optionForm.nameEn}
                    onChange={(e) => setOptionForm((f) => ({ ...f, nameEn: e.target.value }))}
                    required
                    style={ADMIN_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
                    Price adjustment (optional)
                  </label>
                  <Input
                    value={optionForm.priceAdjustment}
                    onChange={(e) =>
                      setOptionForm((f) => ({ ...f, priceAdjustment: e.target.value }))
                    }
                    placeholder="e.g. 2.5 or -1"
                    style={ADMIN_INPUT_STYLE}
                  />
                </div>
                {editor.kind === 'edit-option' && (
                  <label className="flex items-center gap-2 text-sm" style={{ color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={optionForm.isActive}
                      onChange={(e) =>
                        setOptionForm((f) => ({ ...f, isActive: e.target.checked }))
                      }
                    />
                    Active / visible
                  </label>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => void saveOption()}
                    style={PRIMARY_BTN_STYLE}
                  >
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={closeEditor}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

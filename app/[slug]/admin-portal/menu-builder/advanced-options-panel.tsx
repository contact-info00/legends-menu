'use client'

import { useCallback, useEffect, useState } from 'react'
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
  AdvancedSelectionMode,
} from '@/lib/advanced-options'
import { getAdminMenuName } from '@/lib/admin-display-name'
import type { Item } from './menu-builder-types'

type Group = AdvancedOptionsPayload['groups'][number]
type Option = Group['options'][number]
type Level = AdvancedOptionsPayload['levels'][number]

type NameForm = { nameKu: string; nameEn: string }
type OptionForm = NameForm & { priceAdjustment: string; isActive: boolean }
type LevelForm = NameForm & { value: string }
type GroupForm = NameForm & { selectionMode: AdvancedSelectionMode }

type EditorState =
  | { kind: 'add-group' }
  | { kind: 'edit-group'; group: Group }
  | { kind: 'add-option'; groupId: string }
  | { kind: 'edit-option'; groupId: string; option: Option }
  | { kind: 'add-level' }
  | { kind: 'edit-level'; level: Level }
  | null

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

function LevelDotsPreview({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Level ${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: i < value ? '#0F172A' : 'transparent',
            border: '1.5px solid #0F172A',
          }}
        />
      ))}
    </div>
  )
}

export function AdvancedOptionsPanel({ item, isOpen, onClose }: AdvancedOptionsPanelProps) {
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(null)
  const [groupForm, setGroupForm] = useState<GroupForm>({
    nameKu: '',
    nameEn: '',
    selectionMode: 'single',
  })
  const [optionForm, setOptionForm] = useState<OptionForm>({
    nameKu: '',
    nameEn: '',
    priceAdjustment: '',
    isActive: true,
  })
  const [levelForm, setLevelForm] = useState<LevelForm>({
    nameKu: '',
    nameEn: '',
    value: '3',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/items/${item.id}/advanced-options`)
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load advanced options'))
      }
      const data = await response.json()
      setGroups(data.groups ?? [])
      setLevels(data.levels ?? [])
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
    setGroupForm({ nameKu: '', nameEn: '', selectionMode: 'single' })
    setEditor({ kind: 'add-group' })
    setOpenMenuId(null)
  }

  const openEditGroup = (group: Group) => {
    setGroupForm({
      nameKu: group.nameKu,
      nameEn: group.nameEn,
      selectionMode: group.selectionMode,
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

  const openAddLevel = () => {
    setLevelForm({ nameKu: '', nameEn: '', value: '3' })
    setEditor({ kind: 'add-level' })
    setOpenMenuId(null)
  }

  const openEditLevel = (level: Level) => {
    setLevelForm({
      nameKu: level.nameKu,
      nameEn: level.nameEn,
      value: String(level.value),
    })
    setEditor({ kind: 'edit-level', level })
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
            body: JSON.stringify(groupForm),
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
              selectionMode: created.selectionMode ?? groupForm.selectionMode,
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
            body: JSON.stringify(groupForm),
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
                    selectionMode: updated.selectionMode,
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
    const priceAdjustment =
      priceRaw === '' ? null : Number(priceRaw)
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

  const saveLevel = async () => {
    if (!levelForm.nameKu.trim() || !levelForm.nameEn.trim()) {
      adminNotifyError('English and Kurdish names are required')
      return
    }
    const value = Number(levelForm.value)
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      adminNotifyError('Level value must be 1–5')
      return
    }

    if (editor?.kind === 'add-level') {
      await runAdminOperation({
        loadingMessage: 'Creating level...',
        successMessage: '✓ Level created',
        errorMessage: 'Failed to create level',
        operation: async () => {
          const response = await fetch(`/api/admin/items/${item.id}/advanced-options/levels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nameKu: levelForm.nameKu,
              nameEn: levelForm.nameEn,
              value,
            }),
          })
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to create level'))
          }
          return response.json()
        },
        onSuccess: (created: Level) => {
          setLevels((prev) => [...prev, created])
          closeEditor()
        },
      })
      return
    }

    if (editor?.kind === 'edit-level') {
      const levelId = editor.level.id
      await runAdminOperation({
        loadingMessage: 'Updating level...',
        successMessage: '✓ Level updated',
        errorMessage: 'Failed to update level',
        operation: async () => {
          const response = await fetch(`/api/admin/item-levels/${levelId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nameKu: levelForm.nameKu,
              nameEn: levelForm.nameEn,
              value,
            }),
          })
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Failed to update level'))
          }
          return response.json()
        },
        onSuccess: (updated: Level) => {
          setLevels((prev) => prev.map((l) => (l.id === levelId ? { ...l, ...updated } : l)))
          closeEditor()
        },
      })
    }
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

  const deleteLevel = async (level: Level) => {
    setOpenMenuId(null)
    if (!window.confirm(`Delete level "${level.nameEn}"?`)) return

    const previous = levels
    setLevels((prev) => prev.filter((l) => l.id !== level.id))

    await runAdminOperation({
      loadingMessage: 'Deleting level...',
      successMessage: '✓ Level deleted',
      errorMessage: 'Failed to delete level',
      operation: async () => {
        const response = await fetch(`/api/admin/item-levels/${level.id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to delete level'))
        }
      },
      onError: () => setLevels(previous),
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
        className="relative w-full max-w-lg my-4 rounded-xl border bg-white shadow-xl max-h-[92vh] overflow-hidden flex flex-col"
        style={{ borderColor: '#D1D5DB' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Settings2 className="w-4 h-4 shrink-0" />
              Advanced Options
            </div>
            <div className="text-sm text-slate-500 truncate mt-0.5">
              Item: {getAdminMenuName(item)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Option Groups</h3>
                <Button type="button" size="sm" onClick={openAddGroup} className="h-8 gap-1">
                  <Plus className="w-4 h-4" />
                  Add Option Group
                </Button>
              </div>

              {groups.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No option groups yet. Add groups like Sauce or Sides.
                </p>
              ) : (
                <div className="space-y-3">
                  {groups.map((group, groupIndex) => (
                    <div
                      key={group.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {group.nameEn}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Selection: {group.selectionMode === 'multiple' ? 'Multiple' : 'Single'}
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
                            <ArrowUp className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                            disabled={groupIndex === groups.length - 1}
                            onClick={() => void moveGroup(groupIndex, 1)}
                            aria-label="Move group down"
                          >
                            <ArrowDown className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded hover:bg-gray-100"
                            onClick={() =>
                              setOpenMenuId(openMenuId === group.id ? null : group.id)
                            }
                            aria-label="Group menu"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-600" />
                          </button>
                          {openMenuId === group.id && (
                            <div className="absolute right-0 top-8 z-10 w-36 rounded-md border border-gray-200 bg-white shadow-lg py-1">
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                onClick={() => openEditGroup(group)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
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
                                className={`text-sm truncate ${
                                  option.isActive ? 'text-slate-800' : 'text-slate-400 line-through'
                                }`}
                              >
                                {option.nameEn}
                              </div>
                              {option.priceAdjustment != null && option.priceAdjustment !== 0 && (
                                <div className="text-xs text-amber-600">
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
                              <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                              disabled={optionIndex === group.options.length - 1}
                              onClick={() => void moveOption(group.id, optionIndex, 1)}
                              aria-label="Move option down"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-gray-100"
                                onClick={() =>
                                  setOpenMenuId(
                                    openMenuId === option.id ? null : option.id
                                  )
                                }
                                aria-label="Option menu"
                              >
                                <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                              {openMenuId === option.id && (
                                <div className="absolute right-0 top-7 z-10 w-40 rounded-md border border-gray-200 bg-white shadow-lg py-1">
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                    onClick={() => openEditOption(group.id, option)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                    onClick={() => void toggleOptionActive(group.id, option)}
                                  >
                                    {option.isActive ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
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
                        className="mt-2 inline-flex items-center gap-1 text-sm text-[#27C499] hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add option
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">Levels</h3>
                  <Button type="button" size="sm" variant="outline" onClick={openAddLevel} className="h-8 gap-1">
                    <Plus className="w-4 h-4" />
                    Add Level
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Optional 1–5 visual indicators (e.g. Dry, Sweet). Not limited to wine.
                </p>

                {levels.length === 0 ? (
                  <p className="text-sm text-slate-500">No levels configured.</p>
                ) : (
                  <div className="space-y-2">
                    {levels.map((level) => (
                      <div
                        key={level.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {level.nameEn}
                          </div>
                          <div className="mt-1">
                            <LevelDotsPreview value={level.value} />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-gray-100"
                          onClick={() => openEditLevel(level)}
                          aria-label="Edit level"
                        >
                          <Settings2 className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-gray-100"
                          onClick={() => void deleteLevel(level)}
                          aria-label="Delete level"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {editor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={closeEditor}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white border border-gray-200 shadow-xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold text-slate-900">
              {editor.kind === 'add-group' && 'Add Option Group'}
              {editor.kind === 'edit-group' && 'Edit Option Group'}
              {editor.kind === 'add-option' && 'Add Option'}
              {editor.kind === 'edit-option' && 'Edit Option'}
              {editor.kind === 'add-level' && 'Add Level'}
              {editor.kind === 'edit-level' && 'Edit Level'}
            </div>

            {(editor.kind === 'add-group' || editor.kind === 'edit-group') && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Name (English)</label>
                  <Input
                    value={groupForm.nameEn}
                    onChange={(e) => setGroupForm((f) => ({ ...f, nameEn: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Name (Kurdish)</label>
                  <Input
                    value={groupForm.nameKu}
                    onChange={(e) => setGroupForm((f) => ({ ...f, nameKu: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Selection</label>
                  <select
                    value={groupForm.selectionMode}
                    onChange={(e) =>
                      setGroupForm((f) => ({
                        ...f,
                        selectionMode: e.target.value as AdvancedSelectionMode,
                      }))
                    }
                    className="mt-1 w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                  >
                    <option value="single">Single choice</option>
                    <option value="multiple">Multiple choice</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={closeEditor}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void saveGroup()}>
                    Save
                  </Button>
                </div>
              </>
            )}

            {(editor.kind === 'add-option' || editor.kind === 'edit-option') && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Name (English)</label>
                  <Input
                    value={optionForm.nameEn}
                    onChange={(e) => setOptionForm((f) => ({ ...f, nameEn: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Name (Kurdish)</label>
                  <Input
                    value={optionForm.nameKu}
                    onChange={(e) => setOptionForm((f) => ({ ...f, nameKu: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    Price adjustment (optional)
                  </label>
                  <Input
                    value={optionForm.priceAdjustment}
                    onChange={(e) =>
                      setOptionForm((f) => ({ ...f, priceAdjustment: e.target.value }))
                    }
                    placeholder="e.g. 2.5 or -1"
                    className="mt-1"
                  />
                </div>
                {editor.kind === 'edit-option' && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
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
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={closeEditor}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void saveOption()}>
                    Save
                  </Button>
                </div>
              </>
            )}

            {(editor.kind === 'add-level' || editor.kind === 'edit-level') && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Level name (English)</label>
                  <Input
                    value={levelForm.nameEn}
                    onChange={(e) => setLevelForm((f) => ({ ...f, nameEn: e.target.value }))}
                    placeholder="e.g. Dry"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Level name (Kurdish)</label>
                  <Input
                    value={levelForm.nameKu}
                    onChange={(e) => setLevelForm((f) => ({ ...f, nameKu: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Level value (1–5)</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={levelForm.value}
                    onChange={(e) => setLevelForm((f) => ({ ...f, value: e.target.value }))}
                    className="mt-1"
                  />
                  <div className="mt-2">
                    <LevelDotsPreview
                      value={Math.min(5, Math.max(1, Number(levelForm.value) || 1))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={closeEditor}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void saveLevel()}>
                    Save
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

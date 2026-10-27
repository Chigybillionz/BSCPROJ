'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, X, Search, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface DropdownOption {
  value: string
  label: string
  badge?: string
  subtitle?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface CustomDropdownProps {
  label?: string
  error?: string
  placeholder?: string
  options: DropdownOption[]
  value?: string | string[]
  onChange: (value: any) => void
  multiple?: boolean
  searchable?: boolean
  selectAll?: boolean
  clearable?: boolean
  disabled?: boolean
  className?: string
  triggerClassName?: string
  maxDropdownHeight?: string
  align?: 'left' | 'right'
}

export function CustomDropdown({
  label,
  error,
  placeholder = 'Select an option...',
  options = [],
  value,
  onChange,
  multiple = false,
  searchable = true,
  selectAll = false,
  clearable = false,
  disabled = false,
  className,
  triggerClassName,
  maxDropdownHeight = 'max-h-64',
  align = 'left',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Normalize selected values
  const selectedValues = useMemo<string[]>(() => {
    if (multiple) {
      if (Array.isArray(value)) return value
      if (value !== undefined && value !== null && value !== '') return [String(value)]
      return []
    }
    if (value !== undefined && value !== null) {
      const strVal = String(value)
      // If empty string and no empty string option exists, consider nothing selected
      if (strVal === '' && !options.some(o => o.value === '')) {
        return []
      }
      return [strVal]
    }
    return []
  }, [value, multiple, options])

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    )
  }, [options, search])

  const handleSelect = (optValue: string) => {
    if (multiple) {
      const exists = selectedValues.includes(optValue)
      const next = exists ? selectedValues.filter(v => v !== optValue) : [...selectedValues, optValue]
      onChange(next)
    } else {
      onChange(optValue)
      setIsOpen(false)
    }
  }

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    const allValues = options.filter(o => !o.disabled).map(o => o.value)
    onChange(allValues)
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(multiple ? [] : '')
  }

  // Selected label display text
  const selectedOptions = options.filter(o => selectedValues.includes(o.value))

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return placeholder
    if (!multiple) {
      return selectedOptions[0]?.label || placeholder
    }
    if (selectedValues.length === 1) {
      return selectedOptions[0]?.label || '1 item selected'
    }
    if (selectedValues.length === options.length && options.length > 0) {
      return `All (${options.length}) selected`
    }
    return `${selectedValues.length} selected`
  }, [selectedValues, selectedOptions, multiple, placeholder, options.length])

  const showClear = clearable && !disabled && (
    multiple ? selectedValues.length > 0 : selectedValues.length > 0 && selectedValues[0] !== ''
  )

  return (
    <div className={cn('relative flex flex-col gap-1.5 w-full', className)} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) setIsOpen(!isOpen)
          }
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition-all cursor-pointer shadow-2xs select-none',
          isOpen && 'ring-2 ring-[var(--color-primary)]/40 border-[var(--color-primary)]',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100',
          error && 'border-rose-400 ring-rose-300',
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {!multiple && selectedOptions[0]?.icon && (
            <span className="shrink-0">{selectedOptions[0].icon}</span>
          )}

          <span
            className={cn(
              'truncate font-medium',
              selectedValues.length === 0 ? 'text-[var(--color-muted)] font-normal' : 'text-[var(--color-text)]'
            )}
          >
            {displayText}
          </span>

          {multiple && selectedValues.length > 0 && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white">
              {selectedValues.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[var(--color-muted)]">
          {showClear && (
            <span
              onClick={handleClearAll}
              title="Clear selection"
              className="p-0.5 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1.5 w-full min-w-[200px] z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {/* Search & Actions Bar */}
          {(searchable || (multiple && selectAll)) && (
            <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/60 flex flex-col gap-1.5">
              {searchable && (
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-[var(--color-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search options..."
                    className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    autoFocus
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {multiple && (
                <div className="flex items-center justify-between text-[11px] pt-0.5 px-0.5">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[var(--color-primary)] hover:underline font-semibold cursor-pointer"
                  >
                    Select All ({options.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[var(--color-muted)] hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Options List */}
          <div className={cn('overflow-y-auto p-1 space-y-0.5 divide-y divide-slate-100', maxDropdownHeight)}>
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--color-muted)]">
                No matching options found
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.value)

                return (
                  <div
                    key={opt.value}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer select-none',
                      isSelected
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-text)] hover:bg-slate-100',
                      opt.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {multiple ? (
                        <div className="shrink-0 text-[var(--color-primary)]">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </div>
                      ) : (
                        opt.icon && <span className="shrink-0">{opt.icon}</span>
                      )}

                      <div className="truncate min-w-0">
                        <p className="truncate">{opt.label}</p>
                        {opt.subtitle && (
                          <p className="text-[10px] text-[var(--color-muted)] truncate font-normal">
                            {opt.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {opt.badge}
                        </span>
                      )}
                      {!multiple && isSelected && (
                        <Check className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

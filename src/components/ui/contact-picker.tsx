'use client'

/**
 * ContactPicker
 * Een gewoon tekstveld (ziet eruit als Input) met een live-zoek dropdown
 * over alle contacten. Vrij typen blijft mogelijk — selecteren is optioneel.
 *
 * Gebruikt een module-level cache zodat meerdere pickers op dezelfde pagina
 * niet elk een eigen fetch doen.
 */

import { useState, useEffect, useRef } from 'react'
import { BookUser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export interface PickedContact {
  id: string
  naam: string
  functie: string | null
  organisatie: string | null
  telefoon: string | null
  email: string | null
}

interface ContactPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** Wordt aangeroepen wanneer de gebruiker een contact selecteert uit de lijst */
  onContactSelect?: (contact: PickedContact) => void
  placeholder?: string
  error?: string
  className?: string
}

// ── Module-level cache (TTL 60 s) ────────────────────────────────────────────
let _cache: PickedContact[] | null = null
let _cacheTs = 0
const CACHE_TTL = 60_000

async function loadContacts(): Promise<PickedContact[]> {
  const now = Date.now()
  if (_cache && now - _cacheTs < CACHE_TTL) return _cache

  const supabase = createClient()
  const { data } = await supabase
    .from('contacten')
    .select('id, naam, functie, organisatie, telefoon, email')
    .eq('gearchiveerd', false)
    .order('naam')

  _cache = (data ?? []) as PickedContact[]
  _cacheTs = now
  return _cache
}

/** Invalideert de cache zodat de volgende picker-mount opnieuw laadt */
export function invalidateContactCache() {
  _cache = null
  _cacheTs = 0
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContactPicker({
  label,
  value,
  onChange,
  onContactSelect,
  placeholder,
  error,
  className,
}: ContactPickerProps) {
  const [contacts, setContacts] = useState<PickedContact[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputId = label.toLowerCase().replace(/\s+/g, '-')

  // Laad contacten eenmalig
  useEffect(() => {
    loadContacts().then(setContacts)
  }, [])

  // Sluit dropdown bij klik buiten component
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Gefilterde lijst op basis van getypte tekst
  const filtered =
    value.trim().length > 0
      ? contacts
          .filter((c) => {
            const q = value.toLowerCase()
            return (
              c.naam.toLowerCase().includes(q) ||
              c.functie?.toLowerCase().includes(q) ||
              c.organisatie?.toLowerCase().includes(q)
            )
          })
          .slice(0, 7)
      : []

  const showDropdown = open && filtered.length > 0

  const handleSelect = (contact: PickedContact) => {
    onChange(contact.naam)
    onContactSelect?.(contact)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative space-y-1', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={value}
          placeholder={placeholder}
          onFocus={() => { setFocused(true); setOpen(true) }}
          onBlur={() => setFocused(false)}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className={cn(
            'w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-8 text-gray-900 placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'transition-colors',
            error && 'border-accent focus:ring-accent/20 focus:border-accent',
            focused && 'border-primary'
          )}
        />
        <BookUser
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300"
        />
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-0.5 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {filtered.map((contact) => (
            <button
              key={contact.id}
              type="button"
              // mousedown ipv click zodat onBlur van het input niet eerst sluit
              onMouseDown={(e) => { e.preventDefault(); handleSelect(contact) }}
              className="w-full flex flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-[#4A7C59]/5 border-b border-gray-50 last:border-0 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 leading-tight">{contact.naam}</span>
              {(contact.functie || contact.organisatie) && (
                <span className="text-xs text-[#6B7280] leading-tight">
                  {[contact.functie, contact.organisatie].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

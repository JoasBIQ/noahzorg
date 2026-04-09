'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Download, Filter, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/utils'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { Profile } from '@/types'

interface AuditLogEntry {
  id: string
  created_at: string
  gebruiker_id: string
  actie: string
  module: string
  omschrijving: string
  metadata: Record<string, unknown> | null
}

interface AuditLogProps {
  allProfiles: Profile[]
}

const PAGE_SIZE = 50
const INITIAL_VISIBLE = 5

const MODULE_COLORS: Record<string, string> = {
  notities: 'bg-blue-100 text-blue-800',
  agenda: 'bg-green-100 text-green-800',
  overleggen: 'bg-purple-100 text-purple-800',
  noah_profiel: 'bg-yellow-100 text-yellow-800',
  team: 'bg-orange-100 text-orange-800',
}

const MODULE_LABELS: Record<string, string> = {
  notities: 'Notities',
  agenda: 'Agenda',
  overleggen: 'Overleggen',
  noah_profiel: 'Noah profiel',
  team: 'Team',
}

export function AuditLog({ allProfiles }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [filterGebruiker, setFilterGebruiker] = useState('alle')
  const [filterModule, setFilterModule] = useState('alle')
  const [showFilters, setShowFilters] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const supabase = createClient()
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]))

  const fetchEntries = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    setLoading(true)

    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1)

    if (filterGebruiker !== 'alle') {
      query = query.eq('gebruiker_id', filterGebruiker)
    }
    if (filterModule !== 'alle') {
      query = query.eq('module', filterModule)
    }

    const { data } = await query

    if (data) {
      if (reset) {
        setEntries(data as AuditLogEntry[])
        setOffset(data.length)
      } else {
        setEntries((prev) => [...prev, ...(data as AuditLogEntry[])])
        setOffset(currentOffset + data.length)
      }
      setHasMore(data.length === PAGE_SIZE)
    }

    setLoading(false)
  }, [supabase, offset, filterGebruiker, filterModule])

  useEffect(() => {
    setExpanded(false)
    fetchEntries(true)
  }, [filterGebruiker, filterModule])

  const handleLoadMore = () => {
    fetchEntries(false)
  }

  const handleExportCSV = () => {
    const headers = ['Tijdstip', 'Gebruiker', 'Module', 'Actie', 'Omschrijving']
    const rows = entries.map((entry) => {
      const profile = profileMap.get(entry.gebruiker_id)
      return [
        format(new Date(entry.created_at), 'dd-MM-yyyy HH:mm:ss', { locale: nl }),
        profile?.naam ?? 'Onbekend',
        MODULE_LABELS[entry.module] ?? entry.module,
        entry.actie,
        `"${entry.omschrijving.replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Activiteitenlog</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={entries.length === 0}
          >
            <span className="flex items-center gap-1.5">
              <Download size={14} />
              CSV
            </span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl shadow-sm">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Gebruiker</label>
              <select
                value={filterGebruiker}
                onChange={(e) => setFilterGebruiker(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="alle">Iedereen</option>
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.naam}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-500">Module</label>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="alle">Alle modules</option>
                {Object.entries(MODULE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Entries */}
      {loading && entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted animate-pulse">
          Laden...
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <p className="text-sm text-muted text-center py-6">
            Nog geen activiteiten gelogd.
          </p>
        </Card>
      ) : (
        <div className="space-y-1">
          {(expanded ? entries : entries.slice(0, INITIAL_VISIBLE)).map((entry) => {
            const profile = profileMap.get(entry.gebruiker_id)
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white transition-colors"
              >
                <Avatar
                  naam={profile?.naam ?? 'Onbekend'}
                  kleur={profile?.kleur ?? '#6B7280'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {profile?.naam ?? 'Onbekend'}
                    </span>
                    <Badge className={MODULE_COLORS[entry.module] ?? 'bg-gray-100 text-gray-600'}>
                      {MODULE_LABELS[entry.module] ?? entry.module}
                    </Badge>
                    <span className="text-xs text-muted">
                      {formatRelative(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {entry.omschrijving}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Toon meer / minder */}
      {entries.length > INITIAL_VISIBLE && (
        <div className="text-center pt-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mx-auto text-sm text-primary hover:underline"
          >
            {expanded ? 'Toon minder' : `Toon alle ${entries.length} activiteiten`}
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Load more (alleen zichtbaar als uitgevouwen en er zijn nog meer) */}
      {expanded && hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {loading ? 'Laden...' : 'Laad meer'}
          </button>
        </div>
      )}
    </div>
  )
}

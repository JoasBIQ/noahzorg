'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare,
  FileText,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
  File,
  Calendar,
  ChevronDown,
  Users,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { Profile, Overleg } from '@/types'

interface OverleggenPageProps {
  currentUserId: string
  currentProfile: Profile
  verslagenFolderId: string | null
  initialOverleggen: Overleg[]
}

interface TrelloCard {
  id: string
  name: string
  desc: string
  due: string | null
  url: string
  labels: { id: string; name: string; color: string }[]
}

interface TrelloList {
  id: string
  name: string
  cards: TrelloCard[]
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string | null
}

function stripLeadingNonLetter(str: string): string {
  return str.replace(/^[^A-Za-z]+/, '').trim()
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.includes('image')) return FileImage
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('presentation')) return FileText
  return File
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

export function OverleggenPage({
  currentUserId: _currentUserId,
  currentProfile: _currentProfile,
  verslagenFolderId,
  initialOverleggen,
}: OverleggenPageProps) {
  const supabase = createClient()
  const now = new Date().toISOString()

  // DB overleggen (future only)
  const [overleggen, setOverleggen] = useState<Overleg[]>(
    initialOverleggen.filter((o) => !o.gearchiveerd && o.datum_tijd >= now)
      .sort((a, b) => a.datum_tijd.localeCompare(b.datum_tijd))
  )

  const fetchOverleggen = useCallback(async () => {
    const { data } = await supabase
      .from('overleggen')
      .select('*')
      .eq('gearchiveerd', false)
      .gte('datum_tijd', new Date().toISOString())
      .order('datum_tijd', { ascending: true })
    if (data) setOverleggen(data as Overleg[])
  }, [supabase])

  useRealtime('overleggen', fetchOverleggen)

  // Trello agenda cards
  const [trelloCards, setTrelloCards] = useState<TrelloCard[]>([])
  const [trelloLoading, setTrelloLoading] = useState(true)
  const [trelloError, setTrelloError] = useState<string | null>(null)

  // Drive verslagen
  const [verslagen, setVerslagen] = useState<DriveFile[]>([])
  const [verslagenLoading, setVerslagenLoading] = useState(true)
  const [verslagenError, setVerslagenError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Expanded overleg ID
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const TARGET = 'DIT BESPREKEN'
    fetch('/api/trello/board')
      .then((r) => r.json())
      .then((data) => {
        if (!data.configured) { setTrelloError('Trello niet gekoppeld.'); return }
        if (data.error) { setTrelloError(data.error); return }
        const list = (data.lists as TrelloList[]).find((l) =>
          stripLeadingNonLetter(l.name).startsWith(TARGET)
        )
        setTrelloCards(list?.cards ?? [])
      })
      .catch(() => setTrelloError('Trello ophalen mislukt.'))
      .finally(() => setTrelloLoading(false))
  }, [])

  useEffect(() => {
    if (!verslagenFolderId) { setVerslagenLoading(false); return }
    fetch(`/api/drive?folderId=${encodeURIComponent(verslagenFolderId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setVerslagenError('Drive niet gekoppeld of map niet gevonden.'); return }
        const files: DriveFile[] = (data.files as DriveFile[])
          .filter((f) => f.mimeType !== 'application/vnd.google-apps.folder')
          .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
        setVerslagen(files)
      })
      .catch(() => setVerslagenError('Verslagen ophalen mislukt.'))
      .finally(() => setVerslagenLoading(false))
  }, [verslagenFolderId])

  const filteredVerslagen = useMemo(() => {
    if (!searchQuery.trim()) return verslagen
    const q = searchQuery.toLowerCase()
    return verslagen.filter((f) => f.name.toLowerCase().includes(q))
  }, [verslagen, searchQuery])

  // First upcoming overleg gets Trello cards
  const firstOverlegId = overleggen[0]?.id ?? null

  return (
    <>
      <Header title="Familieoverleg" />
      <div className="p-4 lg:p-8 space-y-8">

        {/* Aankomend */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Aankomend</h2>
          </div>

          {overleggen.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Geen aankomend overleg"
              description="Er zijn geen geplande overleggen. Maak een overleg aan via een mail in de inbox."
            />
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
              {overleggen.map((overleg) => {
                const isFirst = overleg.id === firstOverlegId
                const isExpanded = expandedId === overleg.id
                return (
                  <motion.div key={overleg.id} variants={itemVariants}>
                    <Card>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : overleg.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm">{overleg.titel}</h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDateTime(overleg.datum_tijd)}
                              </span>
                              {((overleg as any).aanwezigen_tekst || overleg.aanwezigen?.length > 0) && (
                                <span className="flex items-center gap-1">
                                  <Users size={12} />
                                  {(overleg as any).aanwezigen_tekst || `${overleg.aanwezigen.length} aanwezig`}
                                </span>
                              )}
                              {isFirst && trelloCards.length > 0 && (
                                <span className="flex items-center gap-1 text-primary">
                                  <CheckSquare size={12} />
                                  {trelloCards.length} agendapunt{trelloCards.length !== 1 ? 'en' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={16} className="text-gray-400" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 mt-3 border-t border-gray-100 space-y-4">
                              {overleg.notities && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Notities</p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{overleg.notities}</p>
                                </div>
                              )}
                              {isFirst && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <MessageSquare size={13} className="text-primary" />
                                    <p className="text-xs font-medium text-gray-500">Agendapunten vanuit Trello</p>
                                  </div>
                                  {trelloLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-muted">
                                      <Loader2 size={13} className="animate-spin" />Laden...
                                    </div>
                                  ) : trelloError ? (
                                    <p className="text-xs text-amber-600">{trelloError}</p>
                                  ) : trelloCards.length === 0 ? (
                                    <p className="text-xs text-muted">Geen agendapunten in Trello.</p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {trelloCards.map((card, i) => (
                                        <li key={card.id} className="flex items-start gap-2 text-sm">
                                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">{i + 1}</span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-gray-900">{card.name}</p>
                                            {card.desc && <p className="text-xs text-muted mt-0.5 line-clamp-2">{card.desc}</p>}
                                          </div>
                                          <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary flex-shrink-0">
                                            <ExternalLink size={13} />
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </section>

        {/* Verslagen */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Verslagen</h2>
          </div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op bestandsnaam..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          {verslagenLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted py-4"><Loader2 size={16} className="animate-spin" />Verslagen laden...</div>
          ) : verslagenError ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5"><AlertCircle size={16} className="flex-shrink-0" />{verslagenError}</div>
          ) : !verslagenFolderId ? (
            <div className="flex items-center gap-2 text-sm text-muted bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5"><AlertCircle size={16} className="flex-shrink-0" />Drive verslagen-map is nog niet ingesteld. Maak de mappen aan via Beheer.</div>
          ) : filteredVerslagen.length === 0 ? (
            <EmptyState icon={FileText} title={searchQuery ? 'Geen resultaten' : 'Nog geen verslagen'} description={searchQuery ? 'Geen bestanden gevonden.' : 'Er staan nog geen verslagen in de Drive map.'} />
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
              {filteredVerslagen.map((file) => {
                const Icon = getFileIcon(file.mimeType)
                const href = file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`
                return (
                  <motion.div key={file.id} variants={itemVariants}>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Icon size={18} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted mt-0.5">{formatDate(file.modifiedTime)}</p>
                          </div>
                          <ExternalLink size={15} className="text-gray-400 flex-shrink-0" />
                        </div>
                      </Card>
                    </a>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </section>
      </div>
    </>
  )
}

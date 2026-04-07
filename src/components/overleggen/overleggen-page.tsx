'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CheckSquare,
  FileText,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  ClipboardList,
  Save,
  FileSpreadsheet,
  FileImage,
  File,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types'

interface OverleggenPageProps {
  currentUserId: string
  currentProfile: Profile
  verslagenFolderId: string | null
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

// Strip leading non-letter characters (emoji, symbols, spaces) from a string
function stripLeadingEmoji(str: string): string {
  return str.replace(/^[^A-Za-z]+/, '').trim()
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return FileSpreadsheet
  if (mimeType.includes('image')) return FileImage
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('presentation')
  )
    return FileText
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
  currentUserId,
  currentProfile: _currentProfile,
  verslagenFolderId,
}: OverleggenPageProps) {
  // Trello agenda
  const [trelloCards, setTrelloCards] = useState<TrelloCard[]>([])
  const [trelloLoading, setTrelloLoading] = useState(true)
  const [trelloError, setTrelloError] = useState<string | null>(null)

  // Drive verslagen
  const [verslagen, setVerslagen] = useState<DriveFile[]>([])
  const [verslagenLoading, setVerslagenLoading] = useState(true)
  const [verslagenError, setVerslagenError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Notities
  const [notities, setNotities] = useState('')
  const [initialNotities, setInitialNotities] = useState('')
  const [savingNotities, setSavingNotities] = useState(false)

  const supabase = createClient()

  // Load Trello agenda cards
  useEffect(() => {
    const TARGET = 'DIT BESPREKEN IN HET VOLGENDE OVERLEG'
    fetch('/api/trello/board')
      .then((r) => r.json())
      .then((data) => {
        if (!data.configured) {
          setTrelloError('Trello is niet gekoppeld. Configureer Trello via Beheer.')
          return
        }
        if (data.error) {
          setTrelloError(data.error)
          return
        }
        const agendaList = (data.lists as TrelloList[]).find((list) =>
          stripLeadingEmoji(list.name).startsWith(TARGET)
        )
        setTrelloCards(agendaList?.cards ?? [])
      })
      .catch(() => setTrelloError('Trello ophalen mislukt.'))
      .finally(() => setTrelloLoading(false))
  }, [])

  // Load Drive verslagen
  useEffect(() => {
    if (!verslagenFolderId) {
      setVerslagenLoading(false)
      return
    }
    fetch(`/api/drive?folderId=${encodeURIComponent(verslagenFolderId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'not_connected') {
          setVerslagenError('Drive is niet gekoppeld. Koppel Gmail/Drive via Beheer.')
          return
        }
        if (data.error) {
          setVerslagenError('Verslagen ophalen mislukt.')
          return
        }
        const files: DriveFile[] = (data.files as DriveFile[])
          .filter((f) => f.mimeType !== 'application/vnd.google-apps.folder')
          .sort(
            (a, b) =>
              new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
          )
        setVerslagen(files)
      })
      .catch(() => setVerslagenError('Verslagen ophalen mislukt.'))
      .finally(() => setVerslagenLoading(false))
  }, [verslagenFolderId])

  // Load notities
  useEffect(() => {
    supabase
      .from('app_instellingen')
      .select('value')
      .eq('key', 'familieoverleg_notities')
      .maybeSingle()
      .then(({ data }) => {
        const val = (data as { value: string } | null)?.value ?? ''
        setNotities(val)
        setInitialNotities(val)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveNotities = async () => {
    setSavingNotities(true)
    const { data: existing } = await supabase
      .from('app_instellingen')
      .select('id')
      .eq('key', 'familieoverleg_notities')
      .maybeSingle()

    if (existing) {
      await supabase
        .from('app_instellingen')
        .update({ value: notities.trim(), updated_by: currentUserId } as never)
        .eq('key', 'familieoverleg_notities')
    } else {
      await supabase
        .from('app_instellingen')
        .insert({
          key: 'familieoverleg_notities',
          value: notities.trim(),
          updated_by: currentUserId,
        } as never)
    }
    setInitialNotities(notities.trim())
    setSavingNotities(false)
  }

  const filteredVerslagen = useMemo(() => {
    if (!searchQuery.trim()) return verslagen
    const q = searchQuery.toLowerCase()
    return verslagen.filter((f) => f.name.toLowerCase().includes(q))
  }, [verslagen, searchQuery])

  return (
    <>
      <Header title="Familieoverleg" />

      <div className="p-4 lg:p-8 space-y-8">
        {/* Section 1: Trello agenda */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Agenda voor het volgende overleg
            </h2>
          </div>

          {trelloLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted py-4">
              <Loader2 size={16} className="animate-spin" />
              Agenda laden...
            </div>
          ) : trelloError ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <AlertCircle size={16} className="flex-shrink-0" />
              {trelloError}
            </div>
          ) : trelloCards.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Geen agendapunten"
              description='Voeg kaarten toe aan de Trello lijst "DIT BESPREKEN IN HET VOLGENDE OVERLEG".'
            />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {trelloCards.map((card, i) => (
                <motion.div key={card.id} variants={itemVariants}>
                  <Card>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{card.name}</p>
                        {card.desc && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">
                            {card.desc}
                          </p>
                        )}
                        {card.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {card.labels.filter((l) => l.name).map((label) => (
                              <span
                                key={label.id}
                                className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                              >
                                {label.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary transition-colors flex-shrink-0 mt-0.5"
                        title="Openen in Trello"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Section 2: Notities */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notities voor het volgende overleg
            </h2>
          </div>
          <Card>
            <textarea
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              placeholder="Voeg notities toe voor het volgende overleg..."
              rows={4}
              className="w-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none resize-y"
            />
            {notities !== initialNotities && (
              <div className="mt-2 flex justify-end border-t border-gray-100 pt-2">
                <button
                  onClick={handleSaveNotities}
                  disabled={savingNotities}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {savingNotities ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* Section 3: Verslagen */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Verslagen</h2>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op bestandsnaam..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {verslagenLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted py-4">
              <Loader2 size={16} className="animate-spin" />
              Verslagen laden...
            </div>
          ) : verslagenError ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <AlertCircle size={16} className="flex-shrink-0" />
              {verslagenError}
            </div>
          ) : !verslagenFolderId ? (
            <div className="flex items-center gap-2 text-sm text-muted bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={16} className="flex-shrink-0" />
              Drive verslagen-map is nog niet ingesteld. Maak de mappen aan via Beheer → Drive.
            </div>
          ) : filteredVerslagen.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchQuery ? 'Geen resultaten' : 'Nog geen verslagen'}
              description={
                searchQuery
                  ? 'Geen bestanden gevonden voor deze zoekopdracht.'
                  : 'Er staan nog geen verslagen in de Drive map.'
              }
            />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {filteredVerslagen.map((file) => {
                const Icon = getFileIcon(file.mimeType)
                const href =
                  file.webViewLink ??
                  `https://drive.google.com/file/d/${file.id}/view`
                return (
                  <motion.div key={file.id} variants={itemVariants}>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Icon size={18} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted mt-0.5">
                              {formatDate(file.modifiedTime)}
                            </p>
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

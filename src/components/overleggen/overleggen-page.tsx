'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  MapPin,
  Monitor,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Save,
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
  initialVerleden: Overleg[]
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

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  overleg: Overleg
  onClose: () => void
  onSaved: (updated: Overleg) => void
}

function EditModal({ overleg, onClose, onSaved }: EditModalProps) {
  const supabase = createClient()
  const [titel, setTitel] = useState(overleg.titel)
  const [datumTijd, setDatumTijd] = useState(overleg.datum_tijd.slice(0, 16))
  const [typeOverleg, setTypeOverleg] = useState<'fysiek' | 'online' | 'telefoon'>(overleg.type_overleg)
  const [locatie, setLocatie] = useState(overleg.locatie ?? '')
  const [aanwezigenTekst, setAanwezigenTekst] = useState(overleg.aanwezigen_tekst ?? '')
  const [notities, setNotities] = useState(overleg.notities ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locatiePlaceholder =
    typeOverleg === 'online' ? 'Meeting-link (bijv. https://meet.google.com/…)' :
    typeOverleg === 'telefoon' ? 'Telefoonnummer of instructie' :
    'Locatie (bijv. zorgkantoor Utrecht)'

  async function handleSave() {
    if (!titel.trim() || !datumTijd) { setError('Titel en datum zijn verplicht.'); return }
    setSaving(true)
    setError(null)
    const { data, error: dbError } = await supabase
      .from('overleggen')
      .update({
        titel: titel.trim(),
        datum_tijd: new Date(datumTijd).toISOString(),
        type_overleg: typeOverleg,
        locatie: locatie.trim() || null,
        aanwezigen_tekst: aanwezigenTekst.trim() || null,
        notities: notities.trim() || null,
      })
      .eq('id', overleg.id)
      .select()
      .single()
    setSaving(false)
    if (dbError) { setError('Opslaan mislukt.'); return }
    onSaved(data as Overleg)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Overleg bewerken</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Titel */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Titel *</label>
            <input
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Datum & tijd */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Datum & tijd *</label>
            <input
              type="datetime-local"
              value={datumTijd}
              onChange={(e) => setDatumTijd(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Type</label>
            <div className="flex gap-2">
              {(['fysiek', 'online', 'telefoon'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeOverleg(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    typeOverleg === t
                      ? t === 'online' ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : t === 'telefoon' ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-[#4A7C59]/10 border-[#4A7C59]/30 text-[#4A7C59]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t === 'fysiek' ? <MapPin size={13} /> : t === 'online' ? <Monitor size={13} /> : <Phone size={13} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Locatie */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {typeOverleg === 'online' ? 'Meeting-link' : typeOverleg === 'telefoon' ? 'Telefoon' : 'Locatie'}
            </label>
            <input
              type="text"
              value={locatie}
              onChange={(e) => setLocatie(e.target.value)}
              placeholder={locatiePlaceholder}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Aanwezigen */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Aanwezigen</label>
            <input
              type="text"
              value={aanwezigenTekst}
              onChange={(e) => setAanwezigenTekst(e.target.value)}
              placeholder="bijv. Joas, mama, zorgmanager"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Notities */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notities</label>
            <textarea
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              rows={3}
              placeholder="Eventuele aantekeningen..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Opslaan
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  overleg: Overleg
  onClose: () => void
  onDeleted: (id: string) => void
}

function DeleteConfirm({ overleg, onClose, onDeleted }: DeleteConfirmProps) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('overleggen').update({ gearchiveerd: true }).eq('id', overleg.id)
    onDeleted(overleg.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Overleg verwijderen?</h2>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          <span className="font-medium">{overleg.titel}</span> wordt gearchiveerd en verdwijnt uit de lijst.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Verwijderen
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Context menu ──────────────────────────────────────────────────────────────

interface OverlegMenuProps {
  overleg: Overleg
  onEdit: () => void
  onDelete: () => void
}

function OverlegMenu({ overleg: _overleg, onEdit, onDelete }: OverlegMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Opties"
      >
        <MoreVertical size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[140px] py-1 overflow-hidden"
          >
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={13} className="text-gray-400" /> Bewerken
            </button>
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} className="text-red-400" /> Verwijderen
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OverleggenPage({
  currentUserId: _currentUserId,
  currentProfile: _currentProfile,
  verslagenFolderId,
  initialOverleggen,
  initialVerleden,
}: OverleggenPageProps) {
  const supabase = createClient()
  const now = new Date().toISOString()

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

  // Edit / delete modal state
  const [editOverleg, setEditOverleg] = useState<Overleg | null>(null)
  const [deleteOverleg, setDeleteOverleg] = useState<Overleg | null>(null)

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

  const firstOverlegId = overleggen[0]?.id ?? null

  // Verleden overleggen
  const [verleden, setVerleden] = useState<Overleg[]>(
    initialVerleden.filter((o) => !o.gearchiveerd)
  )
  const [verledenOpen, setVerledenOpen] = useState(false)
  const VERLEDEN_STAP = 5
  const [verledenZichtbaar, setVerledenZichtbaar] = useState(VERLEDEN_STAP)

  function handleSaved(updated: Overleg) {
    // Als datum nu in verleden ligt: verplaats naar verleden-lijst
    const isPast = new Date(updated.datum_tijd) < new Date()
    if (isPast) {
      setOverleggen((prev) => prev.filter((o) => o.id !== updated.id))
      setVerleden((prev) => {
        const exists = prev.some((o) => o.id === updated.id)
        const next = exists
          ? prev.map((o) => o.id === updated.id ? updated : o)
          : [updated, ...prev]
        return next.sort((a, b) => b.datum_tijd.localeCompare(a.datum_tijd))
      })
    } else {
      setOverleggen((prev) =>
        prev.map((o) => o.id === updated.id ? updated : o)
          .sort((a, b) => a.datum_tijd.localeCompare(b.datum_tijd))
      )
    }
  }

  function handleDeleted(id: string) {
    setOverleggen((prev) => prev.filter((o) => o.id !== id))
    setVerleden((prev) => prev.filter((o) => o.id !== id))
  }

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
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : overleg.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex-1 min-w-0">
                            {/* Type badge */}
                            <div className="flex items-center gap-2 mb-1.5">
                              {overleg.type_overleg === 'online' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                                  <Monitor size={11} /> Online
                                </span>
                              ) : overleg.type_overleg === 'telefoon' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5">
                                  <Phone size={11} /> Telefoon
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4A7C59] bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-full px-2 py-0.5">
                                  <MapPin size={11} /> Fysiek
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900">{overleg.titel}</h3>
                            <p className="text-base font-medium text-gray-700 mt-1">
                              {formatDateTime(overleg.datum_tijd)}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted">
                              {((overleg as any).aanwezigen_tekst || overleg.aanwezigen?.length > 0) && (
                                <span className="flex items-center gap-1">
                                  <Users size={12} />
                                  {(overleg as any).aanwezigen_tekst || `${overleg.aanwezigen.length} aanwezig`}
                                </span>
                              )}
                              {overleg.locatie && overleg.type_overleg !== 'online' && (
                                <span className="flex items-center gap-1">
                                  {overleg.type_overleg === 'telefoon' ? <Phone size={12} /> : <MapPin size={12} />}
                                  {overleg.locatie}
                                </span>
                              )}
                              {isFirst && trelloCards.length > 0 && (
                                <span className="flex items-center gap-1 text-primary">
                                  <CheckSquare size={12} />
                                  {trelloCards.length} agendapunt{trelloCards.length !== 1 ? 'en' : ''}
                                </span>
                              )}
                            </div>
                            {/* Online meeting link */}
                            {overleg.locatie && overleg.type_overleg === 'online' && (
                              <a
                                href={overleg.locatie}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <Monitor size={14} />
                                Deelnemen aan meeting
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </button>

                        {/* Right: menu + chevron */}
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                          <OverlegMenu
                            overleg={overleg}
                            onEdit={() => setEditOverleg(overleg)}
                            onDelete={() => setDeleteOverleg(overleg)}
                          />
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : overleg.id)}
                            className="p-1"
                          >
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown size={16} className="text-gray-400" />
                            </motion.div>
                          </button>
                        </div>
                      </div>

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

        {/* Verleden */}
        {verleden.length > 0 && (
          <section>
            <button
              onClick={() => setVerledenOpen((v) => !v)}
              className="flex items-center gap-2 mb-3 w-full text-left group"
            >
              <Calendar size={18} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Verleden</h2>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 ml-1">{verleden.length}</span>
              <ChevronDown
                size={16}
                className={`text-gray-400 ml-auto transition-transform ${verledenOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {verledenOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                    {verleden.slice(0, verledenZichtbaar).map((overleg) => (
                      <motion.div key={overleg.id} variants={itemVariants}>
                        <Card className="opacity-80">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Type badge */}
                              <div className="flex items-center gap-2 mb-1.5">
                                {overleg.type_overleg === 'online' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                                    <Monitor size={11} /> Online
                                  </span>
                                ) : overleg.type_overleg === 'telefoon' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5">
                                    <Phone size={11} /> Telefoon
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4A7C59] bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-full px-2 py-0.5">
                                    <MapPin size={11} /> Fysiek
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900">{overleg.titel}</h3>
                              <p className="text-sm text-gray-500 mt-1">{formatDateTime(overleg.datum_tijd)}</p>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted">
                                {((overleg as any).aanwezigen_tekst || overleg.aanwezigen?.length > 0) && (
                                  <span className="flex items-center gap-1">
                                    <Users size={12} />
                                    {(overleg as any).aanwezigen_tekst || `${overleg.aanwezigen.length} aanwezig`}
                                  </span>
                                )}
                                {overleg.locatie && (
                                  <span className="flex items-center gap-1">
                                    {overleg.type_overleg === 'telefoon' ? <Phone size={12} /> : <MapPin size={12} />}
                                    {overleg.locatie}
                                  </span>
                                )}
                              </div>
                              {overleg.notities && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">{overleg.notities}</p>
                              )}
                            </div>
                            <div className="flex-shrink-0 mt-0.5">
                              <OverlegMenu
                                overleg={overleg}
                                onEdit={() => setEditOverleg(overleg)}
                                onDelete={() => setDeleteOverleg(overleg)}
                              />
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>

                  {verleden.length > verledenZichtbaar && (
                    <button
                      onClick={() => setVerledenZichtbaar((v) => v + VERLEDEN_STAP)}
                      className="mt-3 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Toon meer ({verleden.length - verledenZichtbaar} resterend)
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

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

      {/* Modals */}
      <AnimatePresence>
        {editOverleg && (
          <EditModal
            overleg={editOverleg}
            onClose={() => setEditOverleg(null)}
            onSaved={handleSaved}
          />
        )}
        {deleteOverleg && (
          <DeleteConfirm
            overleg={deleteOverleg}
            onClose={() => setDeleteOverleg(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </>
  )
}

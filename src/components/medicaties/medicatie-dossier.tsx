'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  ExternalLink,
  ChevronDown,
  FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MedicatieItem {
  id: string
  naam: string
  werkzame_stof: string | null
  dosering: string | null
  toediening: string | null
  tijdstip: string | null
  startdatum: string | null
  einddatum: string | null
  actief: boolean
  reden_start: string | null
  reden_stop: string | null
  voorschrijver: string | null
  notities: string | null
  fk_url: string | null
  aangemaakt_door: string | null
  created_at: string
  updated_at: string
}

interface MedicatieDossierProps {
  currentUserId: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIJDSTIP_ORDER = ['Ochtend', 'Lunch', 'Uur voor bedtijd', 'Bedtijd', 'Zo nodig', 'Anders']

const tijdstipOptions = TIJDSTIP_ORDER.map((t) => ({ value: t, label: t }))

const tijdstipBadgeStyle = 'bg-[#4A7C59]/10 text-[#4A7C59] text-xs px-2 py-0.5 rounded-full font-medium'

function sortByTijdstip(items: MedicatieItem[]): MedicatieItem[] {
  return [...items].sort((a, b) => {
    const ai = TIJDSTIP_ORDER.indexOf(a.tijdstip ?? 'Anders')
    const bi = TIJDSTIP_ORDER.indexOf(b.tijdstip ?? 'Anders')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

function formatDateNL(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Empty form ────────────────────────────────────────────────────────────────

interface FormData {
  naam: string
  werkzame_stof: string
  dosering: string
  tijdstip: string
  toediening: string
  startdatum: string
  voorschrijver: string
  reden_start: string
  fk_url: string
  notities: string
}

const emptyForm: FormData = {
  naam: '',
  werkzame_stof: '',
  dosering: '',
  tijdstip: 'Ochtend',
  toediening: '',
  startdatum: '',
  voorschrijver: '',
  reden_start: '',
  fk_url: '',
  notities: '',
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MedicatieDossier({ currentUserId }: MedicatieDossierProps) {
  const [medicaties, setMedicaties] = useState<MedicatieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'actueel' | 'historie'>('actueel')
  const [historieView, setHistorieView] = useState<'per_medicijn' | 'chronologisch'>('per_medicijn')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Form modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MedicatieItem | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  // Stop modal
  const [stopOpen, setStopOpen] = useState(false)
  const [stoppingItem, setStoppingItem] = useState<MedicatieItem | null>(null)
  const [stopEinddatum, setStopEinddatum] = useState('')
  const [stopReden, setStopReden] = useState('')
  const [isStopping, setIsStopping] = useState(false)

  // PDF export
  const [isExporting, setIsExporting] = useState(false)

  const supabase = createClient()

  const fetchMedicaties = async () => {
    const { data, error } = await supabase
      .from('medicatie_dossier')
      .select('*')
      .order('startdatum', { ascending: false })

    if (!error && data) {
      setMedicaties(data as unknown as MedicatieItem[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMedicaties()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const actueelItems = sortByTijdstip(medicaties.filter((m) => m.actief))
  const historieItems = medicaties.filter((m) => !m.actief)

  // ── Form handlers ──────────────────────────────────────────────────────────

  const openAddForm = () => {
    setEditingItem(null)
    setFormData(emptyForm)
    setFormOpen(true)
  }

  const openEditForm = (item: MedicatieItem) => {
    setEditingItem(item)
    setFormData({
      naam: item.naam ?? '',
      werkzame_stof: item.werkzame_stof ?? '',
      dosering: item.dosering ?? '',
      tijdstip: item.tijdstip ?? 'Ochtend',
      toediening: item.toediening ?? '',
      startdatum: item.startdatum ?? '',
      voorschrijver: item.voorschrijver ?? '',
      reden_start: item.reden_start ?? '',
      fk_url: item.fk_url ?? '',
      notities: item.notities ?? '',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingItem(null)
    setFormData(emptyForm)
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.naam.trim() || !formData.dosering.trim() || !formData.startdatum) return
    setIsSaving(true)
    try {
      const payload = {
        naam: formData.naam.trim(),
        werkzame_stof: formData.werkzame_stof.trim() || null,
        dosering: formData.dosering.trim() || null,
        tijdstip: formData.tijdstip || null,
        toediening: formData.toediening.trim() || null,
        startdatum: formData.startdatum || null,
        voorschrijver: formData.voorschrijver.trim() || null,
        reden_start: formData.reden_start.trim() || null,
        fk_url: formData.fk_url.trim() || null,
        notities: formData.notities.trim() || null,
        actief: true,
        aangemaakt_door: currentUserId,
      }

      if (editingItem) {
        const { error } = await supabase
          .from('medicatie_dossier')
          .update(payload as never)
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('medicatie_dossier')
          .insert(payload as never)
        if (error) throw error
      }

      await fetchMedicaties()
      closeForm()
    } catch (err) {
      console.error('Fout bij opslaan medicatie:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Stop handlers ──────────────────────────────────────────────────────────

  const openStopModal = (item: MedicatieItem) => {
    setStoppingItem(item)
    setStopEinddatum(new Date().toISOString().split('T')[0])
    setStopReden('')
    setStopOpen(true)
  }

  const closeStopModal = () => {
    setStopOpen(false)
    setStoppingItem(null)
    setStopEinddatum('')
    setStopReden('')
  }

  const handleStop = async () => {
    if (!stoppingItem) return
    setIsStopping(true)
    try {
      const { error } = await supabase
        .from('medicatie_dossier')
        .update({
          actief: false,
          einddatum: stopEinddatum || null,
          reden_stop: stopReden.trim() || null,
        } as never)
        .eq('id', stoppingItem.id)
      if (error) throw error
      await fetchMedicaties()
      closeStopModal()
    } catch (err) {
      console.error('Fout bij stoppen medicatie:', err)
    } finally {
      setIsStopping(false)
    }
  }

  // ── PDF export ─────────────────────────────────────────────────────────────

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/export/medicatie-dossier', { method: 'POST' })
      if (!res.ok) throw new Error('PDF genereren mislukt')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Medicatiedossier-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export fout:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // ── Toggle accordion group ─────────────────────────────────────────────────

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-[#6B7280]">
        Medicatie laden...
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">Medicatie</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportPDF} disabled={isExporting}>
            <span className="flex items-center gap-1.5">
              <FileText size={14} />
              {isExporting ? 'Laden...' : 'PDF'}
            </span>
          </Button>
          <Button size="sm" onClick={openAddForm}>
            <span className="flex items-center gap-1.5">
              <Plus size={14} />
              Toevoegen
            </span>
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
        <button
          onClick={() => setView('actueel')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            view === 'actueel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Actueel ({actueelItems.length})
        </button>
        <button
          onClick={() => setView('historie')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            view === 'historie' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historie
        </button>
      </div>

      {/* Actueel view */}
      {view === 'actueel' && (
        <div className="space-y-3">
          {actueelItems.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-8">
              Geen actuele medicatie
            </p>
          ) : (
            actueelItems.map((item) => (
              <ActueelCard
                key={item.id}
                item={item}
                onEdit={() => openEditForm(item)}
                onStop={() => openStopModal(item)}
              />
            ))
          )}
        </div>
      )}

      {/* Historie view */}
      {view === 'historie' && (
        <div className="space-y-4">
          {/* Sub-toggle */}
          <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setHistorieView('per_medicijn')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                historieView === 'per_medicijn' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Per medicijn
            </button>
            <button
              onClick={() => setHistorieView('chronologisch')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                historieView === 'chronologisch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Chronologisch
            </button>
          </div>

          {historieView === 'per_medicijn' ? (
            <HistoriePerMedicijn
              alle={medicaties}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
            />
          ) : (
            <HistorieChronologisch alle={medicaties} />
          )}
        </div>
      )}

      {/* Form modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingItem ? 'Medicijn bewerken' : 'Medicijn toevoegen'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="Naam *"
                value={formData.naam}
                onChange={(e) => updateField('naam', e.target.value)}
                placeholder="Bijv. Lorazepam 1mg"
              />
            </div>
            <Input
              label="Werkzame stof"
              value={formData.werkzame_stof}
              onChange={(e) => updateField('werkzame_stof', e.target.value)}
              placeholder="Bijv. Lorazepam"
            />
            <Input
              label="Dosering *"
              value={formData.dosering}
              onChange={(e) => updateField('dosering', e.target.value)}
              placeholder="Bijv. 1 mg"
            />
            <Select
              label="Tijdstip"
              options={tijdstipOptions}
              value={formData.tijdstip}
              onChange={(e) => updateField('tijdstip', e.target.value)}
            />
            <Input
              label="Toediening"
              value={formData.toediening}
              onChange={(e) => updateField('toediening', e.target.value)}
              placeholder="Bijv. Oraal"
            />
            <Input
              label="Startdatum *"
              type="date"
              value={formData.startdatum}
              onChange={(e) => updateField('startdatum', e.target.value)}
            />
            <Input
              label="Voorschrijver"
              value={formData.voorschrijver}
              onChange={(e) => updateField('voorschrijver', e.target.value)}
              placeholder="Naam arts"
            />
            <div className="col-span-2">
              <Textarea
                label="Reden start"
                value={formData.reden_start}
                onChange={(e) => updateField('reden_start', e.target.value)}
                placeholder="Reden voor het starten van dit medicijn..."
                rows={2}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="FK URL"
                value={formData.fk_url}
                onChange={(e) => updateField('fk_url', e.target.value)}
                placeholder="https://www.farmacotherapeutischkompas.nl/..."
              />
            </div>
            <div className="col-span-2">
              <Textarea
                label="Notities"
                value={formData.notities}
                onChange={(e) => updateField('notities', e.target.value)}
                placeholder="Extra informatie..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeForm} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.naam.trim() || !formData.dosering.trim() || !formData.startdatum}
              className="flex-1"
            >
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stop modal */}
      <Modal
        open={stopOpen}
        onClose={closeStopModal}
        title={`Stop: ${stoppingItem?.naam ?? ''}`}
      >
        <div className="space-y-4">
          <Input
            label="Einddatum"
            type="date"
            value={stopEinddatum}
            onChange={(e) => setStopEinddatum(e.target.value)}
          />
          <Textarea
            label="Reden stop"
            value={stopReden}
            onChange={(e) => setStopReden(e.target.value)}
            placeholder="Reden voor het stoppen van dit medicijn..."
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeStopModal} className="flex-1">
              Annuleren
            </Button>
            <Button
              variant="danger"
              onClick={handleStop}
              disabled={isStopping}
              className="flex-1"
            >
              {isStopping ? 'Stoppen...' : 'Medicijn stoppen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Actueel Card ───────────────────────────────────────────────────────────────

function ActueelCard({
  item,
  onEdit,
  onStop,
}: {
  item: MedicatieItem
  onEdit: () => void
  onStop: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{item.naam}</span>
            {item.werkzame_stof && (
              <span className="text-sm text-[#6B7280]">({item.werkzame_stof})</span>
            )}
            {item.tijdstip && (
              <span className={tijdstipBadgeStyle}>{item.tijdstip}</span>
            )}
          </div>
          <div className="mt-1.5 space-y-0.5">
            {item.dosering && (
              <p className="text-sm text-gray-700">{item.dosering}</p>
            )}
            {item.toediening && (
              <p className="text-sm text-[#6B7280]">{item.toediening}</p>
            )}
            {item.startdatum && (
              <p className="text-sm text-[#6B7280]">Vanaf {formatDateNL(item.startdatum)}</p>
            )}
            {item.voorschrijver && (
              <p className="text-sm text-[#6B7280]">Voorschrijver: {item.voorschrijver}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {item.fk_url && (
            <a
              href={item.fk_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#4A7C59] hover:bg-gray-100 transition-colors"
              title="Farmacotherapeutisch Kompas"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Bewerken"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onStop}
            className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Historie Per Medicijn ──────────────────────────────────────────────────────

function HistoriePerMedicijn({
  alle,
  expandedGroups,
  onToggleGroup,
}: {
  alle: MedicatieItem[]
  expandedGroups: Set<string>
  onToggleGroup: (key: string) => void
}) {
  // Group all items by naam
  const groupMap = new Map<string, MedicatieItem[]>()
  for (const item of alle) {
    const key = item.naam
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(item)
  }

  const groups = Array.from(groupMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  if (groups.length === 0) {
    return <p className="text-sm text-[#6B7280] text-center py-8">Geen medicatie in de historie</p>
  }

  return (
    <div className="space-y-2">
      {groups.map(([naam, items]) => {
        const isExpanded = expandedGroups.has(naam)
        const hasActief = items.some((i) => i.actief)
        const sortedItems = [...items].sort((a, b) => {
          if (a.actief && !b.actief) return -1
          if (!a.actief && b.actief) return 1
          return (b.startdatum ?? '').localeCompare(a.startdatum ?? '')
        })

        return (
          <div key={naam} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <button
              onClick={() => onToggleGroup(naam)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    hasActief ? 'bg-[#4A7C59]' : 'bg-gray-300'
                  }`}
                />
                <span className="font-medium text-gray-900">{naam}</span>
                <span className="text-xs text-[#6B7280]">({items.length})</span>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-gray-400"
              >
                <ChevronDown size={16} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {sortedItems.map((item) => (
                      <div key={item.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              item.actief ? 'bg-[#4A7C59]' : 'bg-gray-300'
                            }`}
                          />
                          <span className="text-sm text-gray-700">{item.dosering}</span>
                          {item.tijdstip && (
                            <span className={tijdstipBadgeStyle}>{item.tijdstip}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] pl-4">
                          {formatDateNL(item.startdatum)}
                          {item.einddatum ? ` → ${formatDateNL(item.einddatum)}` : ' → heden'}
                        </p>
                        {item.reden_start && (
                          <p className="text-xs text-[#6B7280] pl-4">Start: {item.reden_start}</p>
                        )}
                        {item.reden_stop && (
                          <p className="text-xs text-[#6B7280] pl-4">Stop: {item.reden_stop}</p>
                        )}
                        {item.notities && (
                          <p className="text-xs text-[#6B7280] pl-4 italic">{item.notities}</p>
                        )}
                        {item.fk_url && (
                          <a
                            href={item.fk_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#4A7C59] hover:underline pl-4 flex items-center gap-1"
                          >
                            <ExternalLink size={11} />
                            Farmacotherapeutisch Kompas
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// ── Historie Chronologisch ─────────────────────────────────────────────────────

function HistorieChronologisch({ alle }: { alle: MedicatieItem[] }) {
  const sorted = [...alle].sort((a, b) =>
    (b.startdatum ?? '').localeCompare(a.startdatum ?? '')
  )

  if (sorted.length === 0) {
    return <p className="text-sm text-[#6B7280] text-center py-8">Geen medicatie</p>
  }

  // Group by year
  const byYear = new Map<string, MedicatieItem[]>()
  for (const item of sorted) {
    const year = item.startdatum ? item.startdatum.slice(0, 4) : 'Onbekend'
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(item)
  }

  return (
    <div className="space-y-5">
      {Array.from(byYear.entries()).map(([year, items]) => (
        <div key={year}>
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">{year}</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${
                  item.actief
                    ? 'bg-[#4A7C59]/5 border-[#4A7C59]/20'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{item.naam}</span>
                      {item.tijdstip && (
                        <span className={tijdstipBadgeStyle}>{item.tijdstip}</span>
                      )}
                    </div>
                    {item.dosering && (
                      <p className="text-xs text-gray-700 mt-0.5">{item.dosering}</p>
                    )}
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {formatDateNL(item.startdatum)}
                      {item.einddatum ? ` → ${formatDateNL(item.einddatum)}` : ' → heden'}
                    </p>
                    {item.voorschrijver && (
                      <p className="text-xs text-[#6B7280]">{item.voorschrijver}</p>
                    )}
                    {item.reden_stop && (
                      <p className="text-xs text-[#6B7280] mt-0.5">Gestopt: {item.reden_stop}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

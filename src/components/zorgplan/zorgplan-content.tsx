'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList,
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ContactPicker } from '@/components/ui/contact-picker'
import type { Profile } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface ZorgplanAfspraak {
  id: string
  created_at: string
  titel: string
  categorie: string
  wie_doet_het: string | null
  frequentie: string | null
  omschrijving: string | null
  notities: string | null
  actief: boolean
}

interface Dagbesteding {
  id: string
  created_at: string
  naam: string
  adres: string | null
  contactpersoon: string | null
  telefoon: string | null
  dagen_tijden: string | null
  activiteiten: string | null
  bijzonderheden: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIE_LABELS: Record<string, string> = {
  algemeen: 'Algemeen',
  medisch: 'Medisch',
  dagbesteding: 'Dagbesteding',
  wonen: 'Wonen',
  financieel: 'Financieel',
  communicatie: 'Communicatie',
  overig: 'Overig',
}

const CATEGORIE_ORDER = [
  'algemeen',
  'medisch',
  'dagbesteding',
  'wonen',
  'financieel',
  'communicatie',
  'overig',
]

const CATEGORIE_OPTIONS = CATEGORIE_ORDER.map((c) => ({
  value: c,
  label: CATEGORIE_LABELS[c] ?? c,
}))

const PRIMARY_COLOR = '#4A7C59'

// ── Empty form helpers ─────────────────────────────────────────────────────

function emptyAfspraakForm() {
  return {
    titel: '',
    categorie: 'algemeen',
    wie_doet_het: '',
    frequentie: '',
    omschrijving: '',
    notities: '',
  }
}

function emptyDagbestedingForm() {
  return {
    naam: '',
    adres: '',
    contactpersoon: '',
    telefoon: '',
    dagen_tijden: '',
    activiteiten: '',
    bijzonderheden: '',
  }
}

// ── Animation variants ─────────────────────────────────────────────────────

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

// ── Props ──────────────────────────────────────────────────────────────────

interface ZorgplanContentProps {
  currentUserId: string
  currentProfile: Profile
}

// ══════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════

export function ZorgplanContent({ currentUserId }: ZorgplanContentProps) {
  const supabase = createClient()

  // ── Active tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'afspraken' | 'dagbesteding'>('afspraken')

  // ── Afspraken state ──────────────────────────────────────────────────────
  const [afspraken, setAfspraken] = useState<ZorgplanAfspraak[]>([])
  const [afsprakenLoading, setAfsprakenLoading] = useState(true)
  const [expandedAfspraken, setExpandedAfspraken] = useState<Set<string>>(new Set())

  // Afspraken form
  const [afspraakModalOpen, setAfspraakModalOpen] = useState(false)
  const [editingAfspraak, setEditingAfspraak] = useState<ZorgplanAfspraak | null>(null)
  const [afspraakForm, setAfspraakForm] = useState(emptyAfspraakForm())
  const [afspraakSaving, setAfspraakSaving] = useState(false)
  const [defaultCategorie, setDefaultCategorie] = useState('algemeen')

  // ── Dagbesteding state ───────────────────────────────────────────────────
  const [dagbestedingen, setDagbestedingen] = useState<Dagbesteding[]>([])
  const [dagbestedingLoading, setDagbestedingLoading] = useState(true)

  const [dagbestedingModalOpen, setDagbestedingModalOpen] = useState(false)
  const [editingDagbesteding, setEditingDagbesteding] = useState<Dagbesteding | null>(null)
  const [dagbestedingForm, setDagbestedingForm] = useState(emptyDagbestedingForm())
  const [dagbestedingSaving, setDagbestedingSaving] = useState(false)

  // ── Fetch afspraken ──────────────────────────────────────────────────────
  const fetchAfspraken = useCallback(async () => {
    setAfsprakenLoading(true)
    const { data } = await supabase
      .from('zorgplan_afspraken')
      .select('*')
      .eq('actief', true)
      .order('created_at', { ascending: true })
    setAfspraken((data as ZorgplanAfspraak[]) ?? [])
    setAfsprakenLoading(false)
  }, [supabase])

  // ── Fetch dagbestedingen ─────────────────────────────────────────────────
  const fetchDagbestedingen = useCallback(async () => {
    setDagbestedingLoading(true)
    const { data } = await supabase
      .from('dagbesteding')
      .select('*')
      .order('created_at', { ascending: true })
    setDagbestedingen((data as Dagbesteding[]) ?? [])
    setDagbestedingLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAfspraken()
    fetchDagbestedingen()
  }, [fetchAfspraken, fetchDagbestedingen])

  // ── Afspraken grouped by categorie ──────────────────────────────────────
  const afsprakenByCategorie = CATEGORIE_ORDER.reduce<Record<string, ZorgplanAfspraak[]>>(
    (acc, cat) => {
      acc[cat] = afspraken.filter((a) => a.categorie === cat)
      return acc
    },
    {}
  )

  // ── Toggle expand afspraak ───────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpandedAfspraken((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Open afspraak form ───────────────────────────────────────────────────
  function openAfspraakForm(categorie: string, afspraak?: ZorgplanAfspraak) {
    setDefaultCategorie(categorie)
    if (afspraak) {
      setEditingAfspraak(afspraak)
      setAfspraakForm({
        titel: afspraak.titel,
        categorie: afspraak.categorie,
        wie_doet_het: afspraak.wie_doet_het ?? '',
        frequentie: afspraak.frequentie ?? '',
        omschrijving: afspraak.omschrijving ?? '',
        notities: afspraak.notities ?? '',
      })
    } else {
      setEditingAfspraak(null)
      setAfspraakForm({ ...emptyAfspraakForm(), categorie })
    }
    setAfspraakModalOpen(true)
  }

  function closeAfspraakModal() {
    setAfspraakModalOpen(false)
    setEditingAfspraak(null)
    setAfspraakForm(emptyAfspraakForm())
  }

  // ── Save afspraak ────────────────────────────────────────────────────────
  async function saveAfspraak() {
    if (!afspraakForm.titel.trim()) return
    setAfspraakSaving(true)
    try {
      const payload = {
        titel: afspraakForm.titel.trim(),
        categorie: afspraakForm.categorie,
        wie_doet_het: afspraakForm.wie_doet_het.trim() || null,
        frequentie: afspraakForm.frequentie.trim() || null,
        omschrijving: afspraakForm.omschrijving.trim() || null,
        notities: afspraakForm.notities.trim() || null,
        actief: true,
      }

      if (editingAfspraak) {
        await supabase
          .from('zorgplan_afspraken')
          .update(payload as never)
          .eq('id', editingAfspraak.id)
      } else {
        await supabase
          .from('zorgplan_afspraken')
          .insert({ ...payload, aangemaakt_door: currentUserId } as never)
      }

      await fetchAfspraken()
      closeAfspraakModal()
    } finally {
      setAfspraakSaving(false)
    }
  }

  // ── Delete afspraak (soft) ───────────────────────────────────────────────
  async function deleteAfspraak(id: string) {
    await supabase
      .from('zorgplan_afspraken')
      .update({ actief: false } as never)
      .eq('id', id)
    setAfspraken((prev) => prev.filter((a) => a.id !== id))
  }

  // ── Open dagbesteding form ───────────────────────────────────────────────
  function openDagbestedingForm(item?: Dagbesteding) {
    if (item) {
      setEditingDagbesteding(item)
      setDagbestedingForm({
        naam: item.naam,
        adres: item.adres ?? '',
        contactpersoon: item.contactpersoon ?? '',
        telefoon: item.telefoon ?? '',
        dagen_tijden: item.dagen_tijden ?? '',
        activiteiten: item.activiteiten ?? '',
        bijzonderheden: item.bijzonderheden ?? '',
      })
    } else {
      setEditingDagbesteding(null)
      setDagbestedingForm(emptyDagbestedingForm())
    }
    setDagbestedingModalOpen(true)
  }

  function closeDagbestedingModal() {
    setDagbestedingModalOpen(false)
    setEditingDagbesteding(null)
    setDagbestedingForm(emptyDagbestedingForm())
  }

  // ── Save dagbesteding ────────────────────────────────────────────────────
  async function saveDagbesteding() {
    if (!dagbestedingForm.naam.trim()) return
    setDagbestedingSaving(true)
    try {
      const payload = {
        naam: dagbestedingForm.naam.trim(),
        adres: dagbestedingForm.adres.trim() || null,
        contactpersoon: dagbestedingForm.contactpersoon.trim() || null,
        telefoon: dagbestedingForm.telefoon.trim() || null,
        dagen_tijden: dagbestedingForm.dagen_tijden.trim() || null,
        activiteiten: dagbestedingForm.activiteiten.trim() || null,
        bijzonderheden: dagbestedingForm.bijzonderheden.trim() || null,
      }

      if (editingDagbesteding) {
        await supabase
          .from('dagbesteding')
          .update(payload as never)
          .eq('id', editingDagbesteding.id)
      } else {
        await supabase
          .from('dagbesteding')
          .insert({ ...payload, aangemaakt_door: currentUserId } as never)
      }

      await fetchDagbestedingen()
      closeDagbestedingModal()
    } finally {
      setDagbestedingSaving(false)
    }
  }

  // ── Delete dagbesteding ──────────────────────────────────────────────────
  async function deleteDagbesteding(id: string) {
    await supabase.from('dagbesteding').delete().eq('id', id)
    setDagbestedingen((prev) => prev.filter((d) => d.id !== id))
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zorgplan</h1>
        <p className="text-sm text-gray-500 mt-1">Afspraken en dagbesteding voor Noah</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('afspraken')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'afspraken'
              ? 'border-[#4A7C59] text-[#4A7C59]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList size={16} />
          Afspraken
        </button>
        <button
          onClick={() => setActiveTab('dagbesteding')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'dagbesteding'
              ? 'border-[#4A7C59] text-[#4A7C59]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} />
          Dagbesteding
        </button>
      </div>

      {/* ── Afspraken tab ─────────────────────────────────────────────────── */}
      {activeTab === 'afspraken' && (
        <div className="space-y-6">
          {afsprakenLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Laden...</p>
          ) : (
            CATEGORIE_ORDER.map((cat) => {
              const items = afsprakenByCategorie[cat] ?? []
              return (
                <div key={cat} className="space-y-2">
                  {/* Categorie header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-700">
                      {CATEGORIE_LABELS[cat]}
                    </h2>
                    <button
                      onClick={() => openAfspraakForm(cat)}
                      className="flex items-center gap-1 text-xs text-[#4A7C59] hover:underline"
                    >
                      <Plus size={14} />
                      Toevoegen
                    </button>
                  </div>

                  {/* Items */}
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-1">Geen afspraken in deze categorie.</p>
                  ) : (
                    <motion.ul
                      variants={listVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      {items.map((item) => {
                        const expanded = expandedAfspraken.has(item.id)
                        const hasDetails = item.omschrijving || item.notities
                        return (
                          <motion.li key={item.id} variants={itemVariants}>
                            <Card borderColor={PRIMARY_COLOR}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {item.titel}
                                  </p>
                                  {item.wie_doet_het && (
                                    <p className="text-sm text-gray-600 mt-0.5">
                                      {item.wie_doet_het}
                                    </p>
                                  )}
                                  {item.frequentie && (
                                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                      {item.frequentie}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {hasDetails && (
                                    <button
                                      onClick={() => toggleExpand(item.id)}
                                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                      title={expanded ? 'Inklappen' : 'Uitklappen'}
                                    >
                                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openAfspraakForm(item.categorie, item)}
                                    className="p-1 text-gray-400 hover:text-[#4A7C59] transition-colors"
                                    title="Bewerken"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={() => deleteAfspraak(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Verwijderen"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* Expandable details */}
                              <AnimatePresence initial={false}>
                                {expanded && hasDetails && (
                                  <motion.div
                                    key="details"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
                                      {item.omschrijving && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Omschrijving
                                          </p>
                                          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
                                            {item.omschrijving}
                                          </p>
                                        </div>
                                      )}
                                      {item.notities && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Notities
                                          </p>
                                          <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
                                            {item.notities}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          </motion.li>
                        )
                      })}
                    </motion.ul>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Dagbesteding tab ──────────────────────────────────────────────── */}
      {activeTab === 'dagbesteding' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => openDagbestedingForm()}
            >
              <Plus size={14} className="inline mr-1" />
              Toevoegen
            </Button>
          </div>

          {dagbestedingLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Laden...</p>
          ) : dagbestedingen.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Nog geen dagbestedingen toegevoegd.
            </p>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {dagbestedingen.map((item) => (
                <motion.div key={item.id} variants={itemVariants}>
                  <Card borderColor={PRIMARY_COLOR}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{item.naam}</p>

                        {item.adres && (
                          <p className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <MapPin size={13} className="shrink-0 text-gray-400" />
                            {item.adres}
                          </p>
                        )}
                        {item.telefoon && (
                          <p className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                            <Phone size={13} className="shrink-0 text-gray-400" />
                            {item.telefoon}
                          </p>
                        )}
                        {item.dagen_tijden && (
                          <p className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                            <Clock size={13} className="shrink-0 text-gray-400" />
                            {item.dagen_tijden}
                          </p>
                        )}
                        {item.contactpersoon && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            <span className="text-gray-400">Contact: </span>
                            {item.contactpersoon}
                          </p>
                        )}
                        {item.activiteiten && (
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            <span className="text-gray-400">Activiteiten: </span>
                            {item.activiteiten}
                          </p>
                        )}
                        {item.bijzonderheden && (
                          <p className="text-sm text-gray-500 mt-1 italic whitespace-pre-wrap">
                            {item.bijzonderheden}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openDagbestedingForm(item)}
                          className="p-1 text-gray-400 hover:text-[#4A7C59] transition-colors"
                          title="Bewerken"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => deleteDagbesteding(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* ── Afspraak modal ─────────────────────────────────────────────────── */}
      <Modal
        open={afspraakModalOpen}
        onClose={closeAfspraakModal}
        title={editingAfspraak ? 'Afspraak bewerken' : 'Afspraak toevoegen'}
      >
        <div className="space-y-4">
          <Input
            label="Titel *"
            value={afspraakForm.titel}
            onChange={(e) => setAfspraakForm((f) => ({ ...f, titel: e.target.value }))}
            placeholder="Bijv. Dagelijks medicijnen innemen"
          />
          <Select
            label="Categorie"
            value={afspraakForm.categorie}
            options={CATEGORIE_OPTIONS}
            onChange={(e) => setAfspraakForm((f) => ({ ...f, categorie: e.target.value }))}
          />
          <Input
            label="Wie doet het"
            value={afspraakForm.wie_doet_het}
            onChange={(e) => setAfspraakForm((f) => ({ ...f, wie_doet_het: e.target.value }))}
            placeholder="Bijv. Begeleider, Thuiszorg"
          />
          <Input
            label="Frequentie"
            value={afspraakForm.frequentie}
            onChange={(e) => setAfspraakForm((f) => ({ ...f, frequentie: e.target.value }))}
            placeholder="Bijv. Dagelijks, Wekelijks"
          />
          <Textarea
            label="Omschrijving"
            value={afspraakForm.omschrijving}
            onChange={(e) => setAfspraakForm((f) => ({ ...f, omschrijving: e.target.value }))}
            placeholder="Toelichting op de afspraak..."
          />
          <Textarea
            label="Notities"
            value={afspraakForm.notities}
            onChange={(e) => setAfspraakForm((f) => ({ ...f, notities: e.target.value }))}
            placeholder="Extra aantekeningen..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeAfspraakModal} disabled={afspraakSaving}>
              Annuleren
            </Button>
            <Button
              variant="primary"
              onClick={saveAfspraak}
              disabled={afspraakSaving || !afspraakForm.titel.trim()}
            >
              {afspraakSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Dagbesteding modal ─────────────────────────────────────────────── */}
      <Modal
        open={dagbestedingModalOpen}
        onClose={closeDagbestedingModal}
        title={editingDagbesteding ? 'Dagbesteding bewerken' : 'Dagbesteding toevoegen'}
      >
        <div className="space-y-4">
          <Input
            label="Naam *"
            value={dagbestedingForm.naam}
            onChange={(e) => setDagbestedingForm((f) => ({ ...f, naam: e.target.value }))}
            placeholder="Naam van de locatie of activiteit"
          />
          <Input
            label="Adres"
            value={dagbestedingForm.adres}
            onChange={(e) => setDagbestedingForm((f) => ({ ...f, adres: e.target.value }))}
            placeholder="Straat en huisnummer, postcode"
          />
          <ContactPicker
            label="Contactpersoon"
            value={dagbestedingForm.contactpersoon}
            onChange={(v) => setDagbestedingForm((f) => ({ ...f, contactpersoon: v }))}
            onContactSelect={(c) =>
              setDagbestedingForm((f) => ({
                ...f,
                contactpersoon: c.naam,
                telefoon: f.telefoon || c.telefoon || '',
              }))
            }
            placeholder="Naam van de contactpersoon"
          />
          <Input
            label="Telefoon"
            value={dagbestedingForm.telefoon}
            onChange={(e) => setDagbestedingForm((f) => ({ ...f, telefoon: e.target.value }))}
            placeholder="06-12345678"
          />
          <Input
            label="Dagen & tijden"
            value={dagbestedingForm.dagen_tijden}
            onChange={(e) => setDagbestedingForm((f) => ({ ...f, dagen_tijden: e.target.value }))}
            placeholder="Bijv. Ma, wo, vr 9:00–15:00"
          />
          <Textarea
            label="Activiteiten"
            value={dagbestedingForm.activiteiten}
            onChange={(e) =>
              setDagbestedingForm((f) => ({ ...f, activiteiten: e.target.value }))
            }
            placeholder="Welke activiteiten worden er gedaan?"
          />
          <Textarea
            label="Bijzonderheden"
            value={dagbestedingForm.bijzonderheden}
            onChange={(e) =>
              setDagbestedingForm((f) => ({ ...f, bijzonderheden: e.target.value }))
            }
            placeholder="Aandachtspunten of bijzonderheden..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={closeDagbestedingModal}
              disabled={dagbestedingSaving}
            >
              Annuleren
            </Button>
            <Button
              variant="primary"
              onClick={saveDagbesteding}
              disabled={dagbestedingSaving || !dagbestedingForm.naam.trim()}
            >
              {dagbestedingSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

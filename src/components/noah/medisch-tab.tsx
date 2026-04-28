'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Stethoscope,
  Building2,
  Users,
  FileText,
  Shield,
  Lock,
  ExternalLink,
  HardDrive,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ContactPicker, invalidateContactCache } from '@/components/ui/contact-picker'
import type { PickedContact } from '@/components/ui/contact-picker'
import { MedicatieDossier } from '@/components/medicaties/medicatie-dossier'
import { DriveFilePicker } from '@/components/overleggen/drive-file-picker'
import { DiagnosesSectie } from '@/components/noah/diagnoses-sectie'

interface MedischTabProps {
  currentUserId: string
}

interface NoahProfiel {
  id: string
  huisarts_naam: string | null
  huisarts_praktijk: string | null
  huisarts_telefoon: string | null
  zorgkantoor: string | null
  zorgkantoor_nummer: string | null
  medicatielijst_tekst: string | null
  medicatielijst_afbeelding_url: string | null
  reanimatie_beleid: string | null
  reanimatie_toelichting: string | null
  reanimatie_gesprek_gevoerd: boolean
}

interface Behandelaar {
  id: string
  naam: string
  specialisme: string | null
  ziekenhuis: string | null
  telefoon: string | null
  notities: string | null
  aangemaakt_door: string
}

const emptyProfiel: NoahProfiel = {
  id: '',
  huisarts_naam: null,
  huisarts_praktijk: null,
  huisarts_telefoon: null,
  zorgkantoor: null,
  zorgkantoor_nummer: null,
  medicatielijst_tekst: null,
  medicatielijst_afbeelding_url: null,
  reanimatie_beleid: null,
  reanimatie_toelichting: null,
  reanimatie_gesprek_gevoerd: false,
}

interface BehandelaarFormData {
  naam: string
  specialisme: string
  ziekenhuis: string
  telefoon: string
  notities: string
}

const emptyBehandelaarForm: BehandelaarFormData = {
  naam: '',
  specialisme: '',
  ziekenhuis: '',
  telefoon: '',
  notities: '',
}

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3 },
  }),
}

export function MedischTab({ currentUserId }: MedischTabProps) {
  const [profiel, setProfiel] = useState<NoahProfiel>(emptyProfiel)
  const [behandelaars, setBehandelaars] = useState<Behandelaar[]>([])
  const [loading, setLoading] = useState(true)
  const [keeperUrl, setKeeperUrl] = useState('https://keepersecurity.com')
  const supabase = createClient()

  // Edit states per section
  const [editHuisarts, setEditHuisarts] = useState(false)
  const [editZorgkantoor, setEditZorgkantoor] = useState(false)
  const [editMedicatielijst, setEditMedicatielijst] = useState(false)
  const [editReanimatie, setEditReanimatie] = useState(false)
  const [showMedicatiePicker, setShowMedicatiePicker] = useState(false)
  const [medicatieFolderId, setMedicatieFolderId] = useState<string | null>(null)

  // Draft states for editing
  const [draftProfiel, setDraftProfiel] = useState<NoahProfiel>(emptyProfiel)

  // Behandelaar modal
  const [behandelaarModalOpen, setBehandelaarModalOpen] = useState(false)
  const [editingBehandelaar, setEditingBehandelaar] = useState<Behandelaar | null>(null)
  const [behandelaarForm, setBehandelaarForm] = useState<BehandelaarFormData>(emptyBehandelaarForm)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchProfiel = useCallback(async () => {
    const { data, error } = await supabase
      .from('noah_profiel')
      .select('*')
      .single()

    if (!error && data) {
      const p = data as unknown as Record<string, unknown>
      const parsed: NoahProfiel = {
        id: (p.id as string) ?? '',
        huisarts_naam: (p.huisarts_naam as string) ?? null,
        huisarts_praktijk: (p.huisarts_praktijk as string) ?? null,
        huisarts_telefoon: (p.huisarts_telefoon as string) ?? null,
        zorgkantoor: (p.zorgkantoor as string) ?? null,
        zorgkantoor_nummer: (p.zorgkantoor_nummer as string) ?? null,
        medicatielijst_tekst: (p.medicatielijst_tekst as string) ?? null,
        medicatielijst_afbeelding_url: (p.medicatielijst_afbeelding_url as string) ?? null,
        reanimatie_beleid: (p.reanimatie_beleid as string) ?? null,
        reanimatie_toelichting: (p.reanimatie_toelichting as string) ?? null,
        reanimatie_gesprek_gevoerd: (p.reanimatie_gesprek_gevoerd as boolean) ?? false,
      }
      setProfiel(parsed)
      setDraftProfiel(parsed)
    }
  }, [supabase])

  const fetchBehandelaars = useCallback(async () => {
    const { data, error } = await supabase
      .from('behandelaars')
      .select('*')
      .eq('gearchiveerd', false)
      .order('naam', { ascending: true })

    if (!error && data) {
      setBehandelaars(data as unknown as Behandelaar[])
    }
  }, [supabase])

  const fetchKeeperUrl = useCallback(async () => {
    const { data } = await supabase
      .from('app_instellingen')
      .select('value')
      .eq('key', 'keeper_url')
      .single()

    if (data) {
      const row = data as unknown as { value: string }
      setKeeperUrl(row.value || 'https://keepersecurity.com')
    }
  }, [supabase])

  useEffect(() => {
    Promise.all([fetchProfiel(), fetchBehandelaars(), fetchKeeperUrl()]).then(() =>
      setLoading(false)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openMedicatiePicker = async () => {
    if (!medicatieFolderId) {
      const { data } = await supabase
        .from('app_instellingen')
        .select('value')
        .eq('key', 'drive_map_medicatielijst')
        .single()
      setMedicatieFolderId((data as unknown as { value: string } | null)?.value ?? null)
    }
    setShowMedicatiePicker(true)
  }

  const saveProfiel = async (fields: Partial<NoahProfiel>) => {
    if (!profiel.id) {
      console.error('Profiel id ontbreekt — kan niet opslaan')
      return
    }
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('noah_profiel')
        .update({ ...fields, updated_by: currentUserId } as never)
        .eq('id', profiel.id)

      if (error) {
        console.error('Supabase fout bij opslaan profiel:', error)
      } else {
        setProfiel((prev) => ({ ...prev, ...fields }))
      }
    } catch (err) {
      console.error('Fout bij opslaan profiel:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const cancelEdit = (section: string) => {
    setDraftProfiel({ ...profiel })
    switch (section) {
      case 'huisarts': setEditHuisarts(false); break
      case 'zorgkantoor': setEditZorgkantoor(false); break
      case 'medicatielijst': setEditMedicatielijst(false); break
      case 'reanimatie': setEditReanimatie(false); break
    }
  }

  const saveHuisarts = async () => {
    await saveProfiel({
      huisarts_naam: draftProfiel.huisarts_naam,
      huisarts_praktijk: draftProfiel.huisarts_praktijk,
      huisarts_telefoon: draftProfiel.huisarts_telefoon,
    })
    setEditHuisarts(false)
  }

  const saveZorgkantoor = async () => {
    await saveProfiel({
      zorgkantoor: draftProfiel.zorgkantoor,
      zorgkantoor_nummer: draftProfiel.zorgkantoor_nummer,
    })
    setEditZorgkantoor(false)
  }

  const saveMedicatielijst = async () => {
    await saveProfiel({
      medicatielijst_tekst: draftProfiel.medicatielijst_tekst,
      medicatielijst_afbeelding_url: draftProfiel.medicatielijst_afbeelding_url,
    })
    setEditMedicatielijst(false)
  }

  const saveReanimatie = async () => {
    await saveProfiel({
      reanimatie_beleid: draftProfiel.reanimatie_beleid,
      reanimatie_toelichting: draftProfiel.reanimatie_toelichting,
      reanimatie_gesprek_gevoerd: draftProfiel.reanimatie_gesprek_gevoerd,
    })
    setEditReanimatie(false)
  }

  // Behandelaar CRUD
  const openAddBehandelaar = () => {
    setEditingBehandelaar(null)
    setBehandelaarForm(emptyBehandelaarForm)
    setBehandelaarModalOpen(true)
  }

  const openEditBehandelaar = (b: Behandelaar) => {
    setEditingBehandelaar(b)
    setBehandelaarForm({
      naam: b.naam,
      specialisme: b.specialisme ?? '',
      ziekenhuis: b.ziekenhuis ?? '',
      telefoon: b.telefoon ?? '',
      notities: b.notities ?? '',
    })
    setBehandelaarModalOpen(true)
  }

  const closeBehandelaarModal = () => {
    setBehandelaarModalOpen(false)
    setEditingBehandelaar(null)
    setBehandelaarForm(emptyBehandelaarForm)
  }

  const saveBehandelaar = async () => {
    if (!behandelaarForm.naam.trim()) return
    setIsSaving(true)
    try {
      const payload = {
        naam: behandelaarForm.naam.trim(),
        specialisme: behandelaarForm.specialisme || null,
        ziekenhuis: behandelaarForm.ziekenhuis || null,
        telefoon: behandelaarForm.telefoon || null,
        notities: behandelaarForm.notities || null,
        aangemaakt_door: currentUserId,
      }

      if (editingBehandelaar) {
        const { error } = await supabase
          .from('behandelaars')
          .update(payload as never)
          .eq('id', editingBehandelaar.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('behandelaars')
          .insert(payload as never)
        if (error) throw error
      }

      // Behandelaar automatisch ook synchroniseren naar contacten
      await syncBehandelaarNaarContacten(payload)

      await fetchBehandelaars()
      closeBehandelaarModal()
    } catch (err) {
      console.error('Fout bij opslaan behandelaar:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const syncBehandelaarNaarContacten = async (payload: {
    naam: string
    specialisme: string | null
    ziekenhuis: string | null
    telefoon: string | null
  }) => {
    try {
      // Zoek bestaand contact op naam (case-insensitive)
      const { data: existing } = await supabase
        .from('contacten')
        .select('id')
        .ilike('naam', payload.naam)
        .limit(1)
        .maybeSingle()

      const contactPayload = {
        naam: payload.naam,
        functie: payload.specialisme,
        organisatie: payload.ziekenhuis,
        telefoon: payload.telefoon,
        categorie: 'zorg',
      }

      if (existing) {
        await supabase
          .from('contacten')
          .update(contactPayload as never)
          .eq('id', existing.id)
      } else {
        await supabase
          .from('contacten')
          .insert({ ...contactPayload, aangemaakt_door: currentUserId } as never)
      }
      // Cache invalideren zodat andere pickers de nieuwe data zien
      invalidateContactCache()
    } catch (err) {
      // Sync-fouten zijn niet fataal — behandelaar is al opgeslagen
      console.warn('Behandelaar sync naar contacten mislukt:', err)
    }
  }

  const deleteBehandelaar = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) {
      setDeleteConfirmId(null)
      return
    }
    try {
      const { error } = await supabase
        .from('behandelaars')
        .update({ gearchiveerd: true } as never)
        .eq('id', id)
      if (error) throw error
      await fetchBehandelaars()
    } catch (err) {
      console.error('Fout bij verwijderen behandelaar:', err)
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const updateDraft = (field: keyof NoahProfiel, value: string | boolean) => {
    setDraftProfiel((prev) => ({ ...prev, [field]: value || null }))
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-[#6B7280]">
        Medische gegevens laden...
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-6">
      {/* 1. Huisarts */}
      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope size={18} className="text-[#4A7C59]" />
              <h3 className="font-semibold text-gray-900">Huisarts</h3>
            </div>
            {editHuisarts ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cancelEdit('huisarts')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={saveHuisarts}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-[#4A7C59] hover:bg-[#4A7C59]/10 transition-colors"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setDraftProfiel({ ...profiel }); setEditHuisarts(true) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          {editHuisarts ? (
            <div className="space-y-3">
              <ContactPicker
                label="Naam huisarts"
                value={draftProfiel.huisarts_naam ?? ''}
                onChange={(v) => updateDraft('huisarts_naam', v)}
                onContactSelect={(c: PickedContact) =>
                  setDraftProfiel((prev) => ({
                    ...prev,
                    huisarts_naam: c.naam,
                    huisarts_praktijk: prev.huisarts_praktijk || c.organisatie || null,
                    huisarts_telefoon: prev.huisarts_telefoon || c.telefoon || null,
                  }))
                }
                placeholder="Naam huisarts"
              />
              <Input
                label="Praktijk"
                value={draftProfiel.huisarts_praktijk ?? ''}
                onChange={(e) => updateDraft('huisarts_praktijk', e.target.value)}
              />
              <Input
                label="Telefoon"
                value={draftProfiel.huisarts_telefoon ?? ''}
                onChange={(e) => updateDraft('huisarts_telefoon', e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <DetailRow label="Naam" value={profiel.huisarts_naam} />
              <DetailRow label="Praktijk" value={profiel.huisarts_praktijk} />
              <DetailRow label="Telefoon" value={profiel.huisarts_telefoon} />
              {!profiel.huisarts_naam && !profiel.huisarts_praktijk && !profiel.huisarts_telefoon && (
                <p className="text-sm text-[#6B7280]">Nog niet ingevuld</p>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 2. Diagnoses */}
      <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <DiagnosesSectie currentUserId={currentUserId} />
        </Card>
      </motion.div>

      {/* 3. Zorgkantoor */}
      <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[#4A7C59]" />
              <h3 className="font-semibold text-gray-900">Zorgkantoor</h3>
            </div>
            {editZorgkantoor ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cancelEdit('zorgkantoor')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={saveZorgkantoor}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-[#4A7C59] hover:bg-[#4A7C59]/10 transition-colors"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setDraftProfiel({ ...profiel }); setEditZorgkantoor(true) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          {editZorgkantoor ? (
            <div className="space-y-3">
              <Input
                label="Zorgkantoor"
                value={draftProfiel.zorgkantoor ?? ''}
                onChange={(e) => updateDraft('zorgkantoor', e.target.value)}
              />
              <Input
                label="Zorgkantoornummer"
                value={draftProfiel.zorgkantoor_nummer ?? ''}
                onChange={(e) => updateDraft('zorgkantoor_nummer', e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <DetailRow label="Zorgkantoor" value={profiel.zorgkantoor} />
              <DetailRow label="Nummer" value={profiel.zorgkantoor_nummer} />
              {!profiel.zorgkantoor && !profiel.zorgkantoor_nummer && (
                <p className="text-sm text-[#6B7280]">Nog niet ingevuld</p>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 4. Behandelaars */}
      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#4A7C59]" />
              <h3 className="font-semibold text-gray-900">Behandelaars</h3>
            </div>
            <Button size="sm" onClick={openAddBehandelaar}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} />
                Toevoegen
              </span>
            </Button>
          </div>

          {behandelaars.length === 0 && (
            <p className="text-sm text-[#6B7280] text-center py-4">
              Nog geen behandelaars toegevoegd
            </p>
          )}

          {behandelaars.map((b) => (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{b.naam}</h4>
                    {b.specialisme && (
                      <p className="text-sm text-[#6B7280]">{b.specialisme}</p>
                    )}
                    {b.ziekenhuis && (
                      <p className="text-sm text-[#6B7280]">{b.ziekenhuis}</p>
                    )}
                    {b.telefoon && (
                      <p className="text-sm text-[#6B7280]">Tel: {b.telefoon}</p>
                    )}
                    {b.notities && (
                      <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{b.notities}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditBehandelaar(b)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    {deleteConfirmId === b.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteBehandelaar(b.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(b.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 5. Medicatie */}
      <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="border-t border-gray-100 pt-6">
          <MedicatieDossier currentUserId={currentUserId} />
        </div>
      </motion.div>

      {/* 6. Medicatielijst apotheek */}
      <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#4A7C59]" />
              <h3 className="font-semibold text-gray-900">Medicatielijst apotheek</h3>
            </div>
            {editMedicatielijst ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cancelEdit('medicatielijst')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={saveMedicatielijst}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-[#4A7C59] hover:bg-[#4A7C59]/10 transition-colors"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setDraftProfiel({ ...profiel }); setEditMedicatielijst(true) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          {editMedicatielijst ? (
            <div className="space-y-3">
              <Textarea
                label="Medicatielijst"
                value={draftProfiel.medicatielijst_tekst ?? ''}
                onChange={(e) => updateDraft('medicatielijst_tekst', e.target.value)}
                rows={4}
                placeholder="Kopieer hier de medicatielijst van de apotheek..."
              />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Afbeelding URL</label>
                  <button
                    type="button"
                    onClick={openMedicatiePicker}
                    className="flex items-center gap-1 text-xs text-[#4A7C59] hover:underline"
                  >
                    <HardDrive size={12} />
                    Kies uit Drive
                  </button>
                </div>
                <Input
                  label=""
                  value={draftProfiel.medicatielijst_afbeelding_url ?? ''}
                  onChange={(e) => updateDraft('medicatielijst_afbeelding_url', e.target.value)}
                  placeholder="Google Drive link naar medicatielijst afbeelding"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {profiel.medicatielijst_tekst ? (
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {profiel.medicatielijst_tekst}
                </p>
              ) : (
                <p className="text-sm text-[#6B7280]">Nog geen medicatielijst toegevoegd</p>
              )}
              {profiel.medicatielijst_afbeelding_url && (
                <a
                  href={profiel.medicatielijst_afbeelding_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A7C59] hover:underline"
                >
                  <ExternalLink size={14} />
                  Bekijk afbeelding
                </a>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 7. Reanimatiebeleid */}
      <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible">
        <Card className="border border-[#C4704F]/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#C4704F]" />
              <h3 className="font-semibold text-gray-900">Reanimatiebeleid</h3>
            </div>
            {editReanimatie ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cancelEdit('reanimatie')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={saveReanimatie}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-[#4A7C59] hover:bg-[#4A7C59]/10 transition-colors"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setDraftProfiel({ ...profiel }); setEditReanimatie(true) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          {editReanimatie ? (
            <div className="space-y-3">
              <Textarea
                label="Beleid"
                value={draftProfiel.reanimatie_beleid ?? ''}
                onChange={(e) => updateDraft('reanimatie_beleid', e.target.value)}
                rows={3}
                placeholder="Beschrijf het reanimatiebeleid..."
              />
              <Textarea
                label="Toelichting"
                value={draftProfiel.reanimatie_toelichting ?? ''}
                onChange={(e) => updateDraft('reanimatie_toelichting', e.target.value)}
                rows={3}
                placeholder="Eventuele toelichting..."
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={draftProfiel.reanimatie_gesprek_gevoerd}
                    onChange={(e) => updateDraft('reanimatie_gesprek_gevoerd', e.target.checked as unknown as string)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:border-[#4A7C59] peer-checked:bg-[#4A7C59] transition-colors flex items-center justify-center">
                    {draftProfiel.reanimatie_gesprek_gevoerd && (
                      <Check size={14} className="text-white" />
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Gesprek over reanimatiebeleid gevoerd
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <DetailRow label="Beleid" value={profiel.reanimatie_beleid} />
              <DetailRow label="Toelichting" value={profiel.reanimatie_toelichting} />
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`w-4 h-4 rounded-md border-2 flex items-center justify-center ${
                    profiel.reanimatie_gesprek_gevoerd
                      ? 'border-[#4A7C59] bg-[#4A7C59]'
                      : 'border-gray-300'
                  }`}
                >
                  {profiel.reanimatie_gesprek_gevoerd && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
                <span className="text-sm text-gray-700">Gesprek gevoerd</span>
              </div>
              {!profiel.reanimatie_beleid && !profiel.reanimatie_toelichting && (
                <p className="text-sm text-[#6B7280]">Nog niet ingevuld</p>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 8. Toegang en accounts */}
      <motion.div custom={7} variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Lock size={18} className="text-[#4A7C59]" />
            <h3 className="font-semibold text-gray-900">Toegang en accounts</h3>
          </div>
          <p className="text-sm text-[#6B7280] mb-4">
            Wachtwoorden en toegangsgegevens van Noah worden beheerd in Keeper. Vraag Joas om
            toegang.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(keeperUrl, '_blank')}
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink size={14} />
              Open Keeper
            </span>
          </Button>
        </Card>
      </motion.div>

      {/* Drive picker voor medicatielijst */}
      {showMedicatiePicker && (
        <DriveFilePicker
          mode="afbeelding"
          folderId={medicatieFolderId}
          onSelect={(file) => {
            updateDraft(
              'medicatielijst_afbeelding_url',
              file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`
            )
            setShowMedicatiePicker(false)
          }}
          onClose={() => setShowMedicatiePicker(false)}
        />
      )}

      {/* Behandelaar Modal */}
      <Modal
        open={behandelaarModalOpen}
        onClose={closeBehandelaarModal}
        title={editingBehandelaar ? 'Behandelaar bewerken' : 'Behandelaar toevoegen'}
      >
        <div className="space-y-4">
          <ContactPicker
            label="Naam"
            value={behandelaarForm.naam}
            onChange={(v) => setBehandelaarForm((prev) => ({ ...prev, naam: v }))}
            onContactSelect={(c: PickedContact) =>
              setBehandelaarForm((prev) => ({
                ...prev,
                naam: c.naam,
                telefoon: prev.telefoon || c.telefoon || '',
                specialisme: prev.specialisme || c.functie || '',
                ziekenhuis: prev.ziekenhuis || c.organisatie || '',
              }))
            }
            placeholder="Naam behandelaar"
          />
          <Input
            label="Specialisme"
            value={behandelaarForm.specialisme}
            onChange={(e) =>
              setBehandelaarForm((prev) => ({ ...prev, specialisme: e.target.value }))
            }
            placeholder="Bijv. kinderarts, fysiotherapeut"
          />
          <Input
            label="Ziekenhuis / instelling"
            value={behandelaarForm.ziekenhuis}
            onChange={(e) =>
              setBehandelaarForm((prev) => ({ ...prev, ziekenhuis: e.target.value }))
            }
            placeholder="Naam ziekenhuis of instelling"
          />
          <Input
            label="Telefoon"
            value={behandelaarForm.telefoon}
            onChange={(e) =>
              setBehandelaarForm((prev) => ({ ...prev, telefoon: e.target.value }))
            }
            placeholder="Telefoonnummer"
          />
          <Textarea
            label="Notities"
            value={behandelaarForm.notities}
            onChange={(e) =>
              setBehandelaarForm((prev) => ({ ...prev, notities: e.target.value }))
            }
            placeholder="Extra informatie..."
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeBehandelaarModal} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={saveBehandelaar}
              disabled={isSaving || !behandelaarForm.naam.trim()}
              className="flex-1"
            >
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-sm text-[#6B7280] sm:w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 whitespace-pre-wrap">{value}</span>
    </div>
  )
}

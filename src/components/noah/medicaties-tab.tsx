'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill,
  Plus,
  Pencil,
  ChevronDown,
  ChevronUp,
  X,
  History,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatDate } from '@/lib/utils'
import type { Medicatie, MedicatieStatus } from '@/types'

interface MedicatiesTabProps {
  currentUserId: string
}

const statusOptions = [
  { value: 'actief', label: 'Actief' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'gestopt', label: 'Gestopt' },
]

const statusBadgeStyles: Record<MedicatieStatus, string> = {
  actief: 'bg-[#4A7C59]/10 text-[#4A7C59]',
  gestopt: 'bg-gray-100 text-[#6B7280]',
  on_hold: 'bg-yellow-50 text-yellow-700',
}

const statusLabels: Record<MedicatieStatus, string> = {
  actief: 'Actief',
  gestopt: 'Gestopt',
  on_hold: 'On hold',
}

interface MedicatieFormData {
  naam: string
  dosering: string
  frequentie: string
  voorschrijver: string
  startdatum: string
  einddatum: string
  status: MedicatieStatus
  notities: string
}

const emptyForm: MedicatieFormData = {
  naam: '',
  dosering: '',
  frequentie: '',
  voorschrijver: '',
  startdatum: '',
  einddatum: '',
  status: 'actief',
  notities: '',
}

function formFromMedicatie(m: Medicatie): MedicatieFormData {
  return {
    naam: m.naam ?? '',
    dosering: m.dosering ?? '',
    frequentie: m.frequentie ?? '',
    voorschrijver: m.voorschrijver ?? '',
    startdatum: m.startdatum ?? '',
    einddatum: m.einddatum ?? '',
    status: m.status,
    notities: m.notities ?? '',
  }
}

export function MedicatiesTab({ currentUserId }: MedicatiesTabProps) {
  const [medicaties, setMedicaties] = useState<Medicatie[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showHistorie, setShowHistorie] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMedicatie, setEditingMedicatie] = useState<Medicatie | null>(null)
  const [formData, setFormData] = useState<MedicatieFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const fetchMedicaties = async () => {
    const { data, error } = await supabase
      .from('medicaties')
      .select('*')
      .eq('gearchiveerd', false)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setMedicaties(data as unknown as Medicatie[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMedicaties()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const actieveMedicaties = medicaties.filter((m) => m.status !== 'gestopt')
  const gestopteMedicaties = medicaties.filter((m) => m.status === 'gestopt')

  const openAddModal = () => {
    setEditingMedicatie(null)
    setFormData(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (medicatie: Medicatie) => {
    setEditingMedicatie(medicatie)
    setFormData(formFromMedicatie(medicatie))
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingMedicatie(null)
    setFormData(emptyForm)
  }

  const updateField = (field: keyof MedicatieFormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // Auto-set einddatum when status changes to 'gestopt'
      if (field === 'status' && value === 'gestopt' && !prev.einddatum) {
        updated.einddatum = new Date().toISOString().split('T')[0]
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!formData.naam.trim()) return
    setIsSaving(true)

    try {
      const payload = {
        naam: formData.naam,
        dosering: formData.dosering || null,
        frequentie: formData.frequentie || null,
        voorschrijver: formData.voorschrijver || null,
        startdatum: formData.startdatum || null,
        einddatum: formData.einddatum || null,
        status: formData.status,
        notities: formData.notities || null,
        aangemaakt_door: currentUserId,
      }

      if (editingMedicatie) {
        const { error } = await supabase
          .from('medicaties')
          .update(payload as never)
          .eq('id', editingMedicatie.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('medicaties')
          .insert(payload as never)

        if (error) throw error
      }

      await fetchMedicaties()
      closeModal()
    } catch (err) {
      console.error('Fout bij opslaan medicatie:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleArchive = async (med: Medicatie) => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) return
    try {
      const { error } = await supabase
        .from('medicaties')
        .update({ gearchiveerd: true } as never)
        .eq('id', med.id)
      if (error) throw error
      await fetchMedicaties()
    } catch (err) {
      console.error('Fout bij archiveren medicatie:', err)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-[#6B7280]">
        Medicatie laden...
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-6">
      {/* Header met toevoegen knop */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill size={18} className="text-[#4A7C59]" />
          <h2 className="text-base font-semibold text-gray-900">Medicatie</h2>
        </div>
        <Button size="sm" onClick={openAddModal}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} />
            Toevoegen
          </span>
        </Button>
      </div>

      {/* Actieve medicaties */}
      {actieveMedicaties.length === 0 && gestopteMedicaties.length === 0 && (
        <p className="text-sm text-[#6B7280] text-center py-8">
          Nog geen medicatie toegevoegd
        </p>
      )}

      <div className="space-y-3">
        {actieveMedicaties.map((med) => (
          <MedicatieCard
            key={med.id}
            medicatie={med}
            expanded={expandedId === med.id}
            onToggle={() => toggleExpand(med.id)}
            onEdit={() => openEditModal(med)}
            onArchive={() => handleArchive(med)}
          />
        ))}
      </div>

      {/* Historie (gestopte medicaties) */}
      {gestopteMedicaties.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistorie(!showHistorie)}
            className="flex items-center gap-2 text-sm font-medium text-[#6B7280] hover:text-gray-900 transition-colors"
          >
            <History size={16} />
            Historie ({gestopteMedicaties.length})
            <motion.div
              animate={{ rotate: showHistorie ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} />
            </motion.div>
          </button>

          <AnimatePresence>
            {showHistorie && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 mt-3">
                  {gestopteMedicaties.map((med) => (
                    <MedicatieCard
                      key={med.id}
                      medicatie={med}
                      expanded={expandedId === med.id}
                      onToggle={() => toggleExpand(med.id)}
                      onEdit={() => openEditModal(med)}
                      onArchive={() => handleArchive(med)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modal voor toevoegen/bewerken */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingMedicatie ? 'Medicatie bewerken' : 'Medicatie toevoegen'}
      >
        <div className="space-y-4">
          <Input
            label="Naam medicatie"
            value={formData.naam}
            onChange={(e) => updateField('naam', e.target.value)}
            placeholder="Bijv. Melatonine"
          />
          <Input
            label="Dosering"
            value={formData.dosering}
            onChange={(e) => updateField('dosering', e.target.value)}
            placeholder="Bijv. 3 mg"
          />
          <Input
            label="Frequentie"
            value={formData.frequentie}
            onChange={(e) => updateField('frequentie', e.target.value)}
            placeholder="Bijv. 1x per dag voor het slapen"
          />
          <Input
            label="Voorschrijver"
            value={formData.voorschrijver}
            onChange={(e) => updateField('voorschrijver', e.target.value)}
            placeholder="Naam arts of specialist"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Startdatum"
              type="date"
              value={formData.startdatum}
              onChange={(e) => updateField('startdatum', e.target.value)}
            />
            <Input
              label="Einddatum"
              type="date"
              value={formData.einddatum}
              onChange={(e) => updateField('einddatum', e.target.value)}
            />
          </div>
          <Select
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={(e) => updateField('status', e.target.value as MedicatieStatus)}
          />
          <Textarea
            label="Notities"
            value={formData.notities}
            onChange={(e) => updateField('notities', e.target.value)}
            placeholder="Extra informatie over deze medicatie..."
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.naam.trim()} className="flex-1">
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function MedicatieCard({
  medicatie,
  expanded,
  onToggle,
  onEdit,
  onArchive,
}: {
  medicatie: Medicatie
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onArchive: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <button
          onClick={onToggle}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{medicatie.naam}</h3>
                <Badge className={statusBadgeStyles[medicatie.status]}>
                  {statusLabels[medicatie.status]}
                </Badge>
              </div>
              {(medicatie.dosering || medicatie.frequentie) && (
                <p className="text-sm text-[#6B7280] mt-1">
                  {[medicatie.dosering, medicatie.frequentie].filter(Boolean).join(' — ')}
                </p>
              )}
              {medicatie.voorschrijver && (
                <p className="text-sm text-[#6B7280]">
                  Voorschrijver: {medicatie.voorschrijver}
                </p>
              )}
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-400 mt-1 flex-shrink-0"
            >
              <ChevronDown size={18} />
            </motion.div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
                <DetailRow label="Dosering" value={medicatie.dosering} />
                <DetailRow label="Frequentie" value={medicatie.frequentie} />
                <DetailRow label="Voorschrijver" value={medicatie.voorschrijver} />
                <DetailRow
                  label="Startdatum"
                  value={medicatie.startdatum ? formatDate(medicatie.startdatum) : null}
                />
                <DetailRow
                  label="Einddatum"
                  value={medicatie.einddatum ? formatDate(medicatie.einddatum) : null}
                />
                <DetailRow label="Notities" value={medicatie.notities} />

                <div className="pt-2 flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={onEdit}>
                    <span className="flex items-center gap-1.5">
                      <Pencil size={14} />
                      Bewerken
                    </span>
                  </Button>
                  <Button size="sm" variant="danger" onClick={onArchive}>
                    <span className="flex items-center gap-1.5">
                      <Trash2 size={14} />
                      Verwijderen
                    </span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-sm text-[#6B7280] sm:w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}

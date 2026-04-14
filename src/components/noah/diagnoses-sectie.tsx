'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, ExternalLink, FlaskConical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'

interface Diagnose {
  id: string
  naam: string
  datum_gesteld: string | null
  gesteld_door: string | null
  toelichting: string | null
  onderbouwing: string | null
  info_link_1: string | null
  info_link_1_label: string | null
  info_link_2: string | null
  info_link_2_label: string | null
  info_link_3: string | null
  info_link_3_label: string | null
  actief: boolean
}

interface DiagnosesSectieProps {
  currentUserId: string
}

const emptyForm = {
  naam: '',
  datum_gesteld: '',
  gesteld_door: '',
  toelichting: '',
  onderbouwing: '',
  info_link_1: '',
  info_link_1_label: '',
  info_link_2: '',
  info_link_2_label: '',
  info_link_3: '',
  info_link_3_label: '',
}

function formatDatum(datum: string | null): string {
  if (!datum) return ''
  try {
    return new Date(datum).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return datum
  }
}

export function DiagnosesSectie({ currentUserId }: DiagnosesSectieProps) {
  const [diagnoses, setDiagnoses] = useState<Diagnose[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDiagnose, setEditingDiagnose] = useState<Diagnose | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const fetchDiagnoses = useCallback(async () => {
    const { data, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('actief', true)
      .order('datum_gesteld', { ascending: true })

    if (!error && data) {
      setDiagnoses(data as unknown as Diagnose[])
    }
  }, [supabase])

  useEffect(() => {
    fetchDiagnoses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = () => {
    setEditingDiagnose(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (d: Diagnose) => {
    setEditingDiagnose(d)
    setForm({
      naam: d.naam,
      datum_gesteld: d.datum_gesteld ?? '',
      gesteld_door: d.gesteld_door ?? '',
      toelichting: d.toelichting ?? '',
      onderbouwing: d.onderbouwing ?? '',
      info_link_1: d.info_link_1 ?? '',
      info_link_1_label: d.info_link_1_label ?? '',
      info_link_2: d.info_link_2 ?? '',
      info_link_2_label: d.info_link_2_label ?? '',
      info_link_3: d.info_link_3 ?? '',
      info_link_3_label: d.info_link_3_label ?? '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingDiagnose(null)
    setForm(emptyForm)
  }

  const saveDiagnose = async () => {
    if (!form.naam.trim()) return
    setIsSaving(true)
    try {
      const payload = {
        naam: form.naam.trim(),
        datum_gesteld: form.datum_gesteld || null,
        gesteld_door: form.gesteld_door || null,
        toelichting: form.toelichting || null,
        onderbouwing: form.onderbouwing || null,
        info_link_1: form.info_link_1 || null,
        info_link_1_label: form.info_link_1_label || null,
        info_link_2: form.info_link_2 || null,
        info_link_2_label: form.info_link_2_label || null,
        info_link_3: form.info_link_3 || null,
        info_link_3_label: form.info_link_3_label || null,
        aangemaakt_door: currentUserId,
      }

      if (editingDiagnose) {
        const { error } = await supabase
          .from('diagnoses')
          .update(payload as never)
          .eq('id', editingDiagnose.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('diagnoses')
          .insert(payload as never)
        if (error) throw error
      }

      await fetchDiagnoses()
      closeModal()
    } catch (err) {
      console.error('Fout bij opslaan diagnose:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const infoLinks = (d: Diagnose) => {
    const links: { url: string; label: string }[] = []
    if (d.info_link_1) links.push({ url: d.info_link_1, label: d.info_link_1_label || d.info_link_1 })
    if (d.info_link_2) links.push({ url: d.info_link_2, label: d.info_link_2_label || d.info_link_2 })
    if (d.info_link_3) links.push({ url: d.info_link_3, label: d.info_link_3_label || d.info_link_3 })
    return links
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-[#4A7C59]" />
          <h3 className="font-semibold text-gray-900">Diagnoses</h3>
        </div>
        <Button size="sm" onClick={openAdd}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} />
            Toevoegen
          </span>
        </Button>
      </div>

      {/* Diagnose cards */}
      {diagnoses.length === 0 && (
        <p className="text-sm text-[#6B7280] text-center py-4">Nog geen diagnoses toegevoegd</p>
      )}

      <div className="space-y-3">
        {diagnoses.map((d) => {
          const links = infoLinks(d)
          const metaLine = [
            d.datum_gesteld ? `Gesteld op ${formatDatum(d.datum_gesteld)}` : null,
            d.gesteld_door ? `door ${d.gesteld_door}` : null,
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{d.naam}</h4>
                    {metaLine && (
                      <p className="text-xs text-[#6B7280] mt-0.5">{metaLine}</p>
                    )}
                    {d.toelichting && (
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{d.toelichting}</p>
                    )}
                    {d.onderbouwing && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                          Onderbouwing
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.onderbouwing}</p>
                      </div>
                    )}
                    {links.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#4A7C59] bg-[#4A7C59]/10 px-3 py-1.5 rounded-full hover:bg-[#4A7C59]/20 transition-colors"
                          >
                            <ExternalLink size={11} />
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(d)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingDiagnose ? 'Diagnose bewerken' : 'Diagnose toevoegen'}
      >
        <div className="space-y-4">
          <Input
            label="Naam *"
            value={form.naam}
            onChange={(e) => setForm((prev) => ({ ...prev, naam: e.target.value }))}
            placeholder="Naam van de diagnose"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Datum gesteld"
              value={form.datum_gesteld}
              onChange={(e) => setForm((prev) => ({ ...prev, datum_gesteld: e.target.value }))}
              type="date"
            />
            <Input
              label="Gesteld door"
              value={form.gesteld_door}
              onChange={(e) => setForm((prev) => ({ ...prev, gesteld_door: e.target.value }))}
              placeholder="Naam arts of instelling"
            />
          </div>
          <Textarea
            label="Toelichting"
            value={form.toelichting}
            onChange={(e) => setForm((prev) => ({ ...prev, toelichting: e.target.value }))}
            rows={3}
            placeholder="Toelichting op de diagnose..."
          />
          <Textarea
            label="Onderbouwing"
            value={form.onderbouwing}
            onChange={(e) => setForm((prev) => ({ ...prev, onderbouwing: e.target.value }))}
            rows={3}
            placeholder="Onderbouwing of aanvullende informatie..."
          />
          {/* Info link 1 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Informatie link 1"
              value={form.info_link_1}
              onChange={(e) => setForm((prev) => ({ ...prev, info_link_1: e.target.value }))}
              placeholder="https://..."
            />
            <Input
              label="Label link 1"
              value={form.info_link_1_label}
              onChange={(e) => setForm((prev) => ({ ...prev, info_link_1_label: e.target.value }))}
              placeholder="Bijv. Kinderneurologie.eu"
            />
          </div>
          {/* Info link 2 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Informatie link 2"
              value={form.info_link_2}
              onChange={(e) => setForm((prev) => ({ ...prev, info_link_2: e.target.value }))}
              placeholder="https://..."
            />
            <Input
              label="Label link 2"
              value={form.info_link_2_label}
              onChange={(e) => setForm((prev) => ({ ...prev, info_link_2_label: e.target.value }))}
              placeholder="Bijv. Kinderneurologie.eu"
            />
          </div>
          {/* Info link 3 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Informatie link 3"
              value={form.info_link_3}
              onChange={(e) => setForm((prev) => ({ ...prev, info_link_3: e.target.value }))}
              placeholder="https://..."
            />
            <Input
              label="Label link 3"
              value={form.info_link_3_label}
              onChange={(e) => setForm((prev) => ({ ...prev, info_link_3_label: e.target.value }))}
              placeholder="Bijv. Kinderneurologie.eu"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={saveDiagnose}
              disabled={isSaving || !form.naam.trim()}
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

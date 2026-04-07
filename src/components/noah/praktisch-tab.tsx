'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pencil,
  Check,
  User,
  Home,
  Banknote,
  Scale,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'

interface PraktischTabProps {
  currentUserId: string
}

interface ProfielData {
  id: string
  volledige_naam: string | null
  geboortedatum: string | null
  wonen_huidig: string | null
  wonen_historie: string | null
  wonen_wensen: string | null
  financieel_notities: string | null
  juridisch_notities: string | null
}

interface DocumentVerwijzing {
  id: string
  naam: string
  omschrijving: string | null
  locatie: string | null
  created_at: string
}

type EditableSection = 'persoonlijk' | 'wonen' | 'financieel' | 'juridisch' | null

export function PraktischTab({ currentUserId }: PraktischTabProps) {
  const [profiel, setProfiel] = useState<ProfielData | null>(null)
  const [documenten, setDocumenten] = useState<DocumentVerwijzing[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<EditableSection>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Document state
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [docForm, setDocForm] = useState({ naam: '', omschrijving: '', locatie: '' })
  const [isSavingDoc, setIsSavingDoc] = useState(false)

  const supabase = createClient()

  const fetchData = async () => {
    const [profielResult, docResult] = await Promise.all([
      supabase
        .from('noah_profiel')
        .select('id, volledige_naam, geboortedatum, wonen_huidig, wonen_historie, wonen_wensen, financieel_notities, juridisch_notities')
        .single(),
      supabase
        .from('document_verwijzingen')
        .select('*')
        .eq('gearchiveerd', false)
        .order('created_at', { ascending: false }),
    ])

    if (profielResult.data) {
      setProfiel(profielResult.data as unknown as ProfielData)
    }
    if (docResult.data) {
      setDocumenten(docResult.data as unknown as DocumentVerwijzing[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sectionFields: Record<string, { key: keyof ProfielData; label: string; type?: string; placeholder?: string }[]> = {
    persoonlijk: [
      { key: 'volledige_naam', label: 'Volledige naam' },
      { key: 'geboortedatum', label: 'Geboortedatum', type: 'date' },
    ],
    wonen: [
      { key: 'wonen_huidig', label: 'Huidige woonsituatie', placeholder: 'Nog niet beschreven' },
      { key: 'wonen_historie', label: 'Woonhistorie', placeholder: 'Nog niet beschreven' },
      { key: 'wonen_wensen', label: 'Woonwensen', placeholder: 'Nog niet beschreven' },
    ],
    financieel: [
      { key: 'financieel_notities', label: 'Financieel', placeholder: 'Wajong, PGB, wie beheert geld — wordt later uitgewerkt' },
    ],
    juridisch: [
      { key: 'juridisch_notities', label: 'Juridisch', placeholder: 'Mentorschap, bewindvoering, wettelijk vertegenwoordiger, wilsbeschikking' },
    ],
  }

  const startEditing = (section: EditableSection) => {
    if (!section) return
    const fields = sectionFields[section]
    const data: Record<string, string> = {}
    fields.forEach((f) => {
      data[f.key] = (profiel?.[f.key] as string) ?? ''
    })
    setFormData(data)
    setEditingSection(section)
  }

  const cancelEditing = () => {
    setEditingSection(null)
    setFormData({})
  }

  const handleSave = async () => {
    if (!profiel?.id) return
    setIsSaving(true)

    try {
      const payload: Record<string, string | null> = { updated_by: currentUserId }
      Object.entries(formData).forEach(([key, value]) => {
        payload[key] = value?.trim() || null
      })

      const { error } = await supabase
        .from('noah_profiel')
        .update(payload as never)
        .eq('id', profiel.id)

      if (error) throw error

      await fetchData()
      setEditingSection(null)
      setFormData({})
    } catch (err) {
      console.error('Fout bij opslaan profiel:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // Document handlers
  const openAddDoc = () => {
    setDocForm({ naam: '', omschrijving: '', locatie: '' })
    setEditingDocId(null)
    setShowAddDoc(true)
  }

  const openEditDoc = (doc: DocumentVerwijzing) => {
    setDocForm({
      naam: doc.naam,
      omschrijving: doc.omschrijving ?? '',
      locatie: doc.locatie ?? '',
    })
    setEditingDocId(doc.id)
    setShowAddDoc(true)
  }

  const cancelDocForm = () => {
    setShowAddDoc(false)
    setEditingDocId(null)
    setDocForm({ naam: '', omschrijving: '', locatie: '' })
  }

  const handleSaveDoc = async () => {
    if (!docForm.naam.trim()) return
    setIsSavingDoc(true)

    try {
      const payload = {
        naam: docForm.naam.trim(),
        omschrijving: docForm.omschrijving.trim() || null,
        locatie: docForm.locatie.trim() || null,
        aangemaakt_door: currentUserId,
      }

      if (editingDocId) {
        const { error } = await supabase
          .from('document_verwijzingen')
          .update(payload as never)
          .eq('id', editingDocId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('document_verwijzingen')
          .insert(payload as never)
        if (error) throw error
      }

      await fetchData()
      cancelDocForm()
    } catch (err) {
      console.error('Fout bij opslaan document:', err)
    } finally {
      setIsSavingDoc(false)
    }
  }

  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) return
    try {
      const { error } = await supabase
        .from('document_verwijzingen')
        .update({ gearchiveerd: true } as never)
        .eq('id', id)
      if (error) throw error
      await fetchData()
    } catch (err) {
      console.error('Fout bij verwijderen document:', err)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-[#6B7280]">
        Gegevens laden...
      </div>
    )
  }

  const sectionConfig: {
    id: EditableSection
    title: string
    icon: React.ReactNode
    fields: typeof sectionFields.persoonlijk
    useTextarea: boolean
  }[] = [
    { id: 'persoonlijk', title: 'Persoonlijke gegevens', icon: <User size={18} className="text-[#4A7C59]" />, fields: sectionFields.persoonlijk, useTextarea: false },
    { id: 'wonen', title: 'Wonen', icon: <Home size={18} className="text-[#4A7C59]" />, fields: sectionFields.wonen, useTextarea: true },
    { id: 'financieel', title: 'Financieel', icon: <Banknote size={18} className="text-[#C4704F]" />, fields: sectionFields.financieel, useTextarea: true },
    { id: 'juridisch', title: 'Juridisch', icon: <Scale size={18} className="text-[#C4704F]" />, fields: sectionFields.juridisch, useTextarea: true },
  ]

  return (
    <div className="px-4 py-6 sm:px-6 space-y-8">
      {sectionConfig.map((section, sIdx) => (
        <motion.section
          key={section.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: sIdx * 0.05 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {section.icon}
              <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
            </div>
            {editingSection !== section.id ? (
              <button
                onClick={() => startEditing(section.id)}
                className="p-2 rounded-lg text-[#6B7280] hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Pencil size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={cancelEditing}>
                  Annuleren
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <span className="flex items-center gap-1.5">
                    <Check size={14} />
                    {isSaving ? 'Opslaan...' : 'Opslaan'}
                  </span>
                </Button>
              </div>
            )}
          </div>

          <Card>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  {editingSection === section.id ? (
                    section.useTextarea && field.type !== 'date' ? (
                      <Textarea
                        label={field.label}
                        value={formData[field.key] ?? ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder ?? ''}
                        rows={3}
                      />
                    ) : (
                      <Input
                        label={field.label}
                        type={field.type ?? 'text'}
                        value={formData[field.key] ?? ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder ?? ''}
                      />
                    )
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-[#6B7280] mb-1">{field.label}</p>
                      <p className="text-base text-gray-900 whitespace-pre-wrap">
                        {field.key === 'geboortedatum' && profiel?.[field.key]
                          ? formatDate(profiel[field.key] as string)
                          : (profiel?.[field.key] as string) || (
                              <span className="text-[#6B7280] italic">
                                {field.placeholder ?? 'Nog niet ingevuld'}
                              </span>
                            )}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.section>
      ))}

      {/* Documenten */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">Documenten</h2>
          </div>
          <Button size="sm" onClick={openAddDoc}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} />
              Toevoegen
            </span>
          </Button>
        </div>

        {/* Add / Edit document form */}
        <AnimatePresence>
          {showAddDoc && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4"
            >
              <Card className="border border-[#4A7C59]/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {editingDocId ? 'Document bewerken' : 'Nieuw document'}
                    </p>
                    <button
                      onClick={cancelDocForm}
                      className="p-1 rounded-lg text-[#6B7280] hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <Input
                    label="Naam"
                    value={docForm.naam}
                    onChange={(e) => setDocForm((p) => ({ ...p, naam: e.target.value }))}
                    placeholder="Bijv. Zorgplan"
                  />
                  <Textarea
                    label="Omschrijving"
                    value={docForm.omschrijving}
                    onChange={(e) => setDocForm((p) => ({ ...p, omschrijving: e.target.value }))}
                    placeholder="Korte omschrijving van het document"
                    rows={2}
                  />
                  <Input
                    label="Locatie"
                    value={docForm.locatie}
                    onChange={(e) => setDocForm((p) => ({ ...p, locatie: e.target.value }))}
                    placeholder="Bijv. Rode map bureau Johan of een Drive-link"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="secondary" onClick={cancelDocForm}>
                      Annuleren
                    </Button>
                    <Button size="sm" onClick={handleSaveDoc} disabled={isSavingDoc || !docForm.naam.trim()}>
                      {isSavingDoc ? 'Opslaan...' : 'Opslaan'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document list */}
        {documenten.length === 0 && !showAddDoc ? (
          <p className="text-sm text-[#6B7280] text-center py-6">
            Nog geen documenten toegevoegd
          </p>
        ) : (
          <div className="space-y-3">
            {documenten.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{doc.naam}</h3>
                      {doc.omschrijving && (
                        <p className="text-sm text-[#6B7280] mt-0.5">{doc.omschrijving}</p>
                      )}
                      {doc.locatie && (
                        <p className="text-sm text-[#4A7C59] mt-1">
                          {doc.locatie.startsWith('http') ? (
                            <a
                              href={doc.locatie}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {doc.locatie}
                            </a>
                          ) : (
                            doc.locatie
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditDoc(doc)}
                        className="p-1.5 rounded-lg text-[#6B7280] hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  )
}

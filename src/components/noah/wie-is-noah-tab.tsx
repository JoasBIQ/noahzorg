'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Check, Heart, Sun } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface WieIsNoahTabProps {
  currentUserId: string
}

interface ProfielData {
  id: string
  karakter: string | null
  wat_fijn: string | null
  wat_onrustig: string | null
  communicatie: string | null
  dagritme: string | null
  eetgewoontes: string | null
  slaap: string | null
  activiteiten: string | null
  gewoontes: string | null
}

const overNoahFields: { key: keyof ProfielData; label: string; placeholder: string }[] = [
  { key: 'karakter', label: 'Hoe zou je Noah omschrijven?', placeholder: 'Nog niet beschreven' },
  { key: 'wat_fijn', label: 'Wat vindt hij fijn?', placeholder: 'Nog niet beschreven' },
  { key: 'wat_onrustig', label: 'Wat maakt hem onrustig?', placeholder: 'Nog niet beschreven' },
  { key: 'communicatie', label: 'Hoe communiceert hij?', placeholder: 'Nog niet beschreven' },
]

const dagelijksLevenFields: { key: keyof ProfielData; label: string; placeholder: string }[] = [
  { key: 'dagritme', label: 'Dagritme', placeholder: 'Nog niet beschreven' },
  { key: 'eetgewoontes', label: 'Eetgewoontes', placeholder: 'Nog niet beschreven' },
  { key: 'slaap', label: 'Slaap', placeholder: 'Nog niet beschreven' },
  { key: 'activiteiten', label: 'Activiteiten', placeholder: 'Nog niet beschreven' },
  { key: 'gewoontes', label: 'Gewoontes', placeholder: 'Nog niet beschreven' },
]

export function WieIsNoahTab({ currentUserId }: WieIsNoahTabProps) {
  const [profiel, setProfiel] = useState<ProfielData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<'over' | 'dagelijks' | null>(null)
  const [formData, setFormData] = useState<Partial<ProfielData>>({})
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const fetchProfiel = async () => {
    const { data, error } = await supabase
      .from('noah_profiel')
      .select('id, karakter, wat_fijn, wat_onrustig, communicatie, dagritme, eetgewoontes, slaap, activiteiten, gewoontes')
      .single()

    if (!error && data) {
      setProfiel(data as unknown as ProfielData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfiel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startEditing = (section: 'over' | 'dagelijks') => {
    const fields = section === 'over' ? overNoahFields : dagelijksLevenFields
    const data: Partial<ProfielData> = {}
    fields.forEach((f) => {
      ;(data as Record<string, string>)[f.key] = (profiel?.[f.key] as string) ?? ''
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
        payload[key] = (value as string)?.trim() || null
      })

      const { error } = await supabase
        .from('noah_profiel')
        .update(payload as never)
        .eq('id', profiel.id)

      if (error) throw error

      await fetchProfiel()
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

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-[#6B7280]">
        Profiel laden...
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-8">
      {/* Over Noah */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-[#C4704F]" />
            <h2 className="text-base font-semibold text-gray-900">Over Noah</h2>
          </div>
          {editingSection !== 'over' ? (
            <button
              onClick={() => startEditing('over')}
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

        <div className="space-y-4">
          {overNoahFields.map((field) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                {editingSection === 'over' ? (
                  <Textarea
                    label={field.label}
                    value={(formData[field.key] as string) ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : (
                  <div>
                    <p className="text-sm font-medium text-[#6B7280] mb-1">{field.label}</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {(profiel?.[field.key] as string) || (
                        <span className="text-[#6B7280] italic">{field.placeholder}</span>
                      )}
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Dagelijks leven */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-[#C4704F]" />
            <h2 className="text-base font-semibold text-gray-900">Dagelijks leven</h2>
          </div>
          {editingSection !== 'dagelijks' ? (
            <button
              onClick={() => startEditing('dagelijks')}
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

        <div className="space-y-4">
          {dagelijksLevenFields.map((field) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                {editingSection === 'dagelijks' ? (
                  <Textarea
                    label={field.label}
                    value={(formData[field.key] as string) ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : (
                  <div>
                    <p className="text-sm font-medium text-[#6B7280] mb-1">{field.label}</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">
                      {(profiel?.[field.key] as string) || (
                        <span className="text-[#6B7280] italic">{field.placeholder}</span>
                      )}
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  )
}

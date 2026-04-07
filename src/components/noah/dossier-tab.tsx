'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  ChevronDown,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  HardDrive,
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
import type { DossierItem, DossierCategorie } from '@/types'
import { DriveFilePicker } from '@/components/overleggen/drive-file-picker'

// Categorie → app_instellingen sleutel voor de juiste Drive-map
const CATEGORIE_FOLDER_KEY: Record<DossierCategorie, string> = {
  brief:      'drive_map_brieven',
  rapport:    'drive_map_brieven',
  verslag:    'drive_map_brieven',
  recept:     'drive_map_recepten',
  indicatie:  'drive_map_indicaties',
  juridisch:  'drive_map_juridisch',
  financieel: 'drive_map_financieel',
  overig:     'drive_root_folder_id',
}

interface DossierTabProps {
  currentUserId: string
}

const categorieOptions = [
  { value: 'brief', label: 'Brief' },
  { value: 'rapport', label: 'Rapport' },
  { value: 'verslag', label: 'Verslag' },
  { value: 'recept', label: 'Recept' },
  { value: 'indicatie', label: 'Indicatie' },
  { value: 'juridisch', label: 'Juridisch' },
  { value: 'financieel', label: 'Financieel' },
  { value: 'overig', label: 'Overig' },
]

const filterOptions = [
  { value: '', label: 'Alle categorieën' },
  ...categorieOptions,
]

const categorieBadgeStyles: Record<DossierCategorie, string> = {
  brief: 'bg-blue-50 text-blue-700',
  rapport: 'bg-purple-50 text-purple-700',
  verslag: 'bg-[#4A7C59]/10 text-[#4A7C59]',
  recept: 'bg-orange-50 text-orange-700',
  indicatie: 'bg-teal-50 text-teal-700',
  juridisch: 'bg-red-50 text-red-700',
  financieel: 'bg-yellow-50 text-yellow-700',
  overig: 'bg-gray-100 text-[#6B7280]',
}

const categorieLabels: Record<DossierCategorie, string> = {
  brief: 'Brief',
  rapport: 'Rapport',
  verslag: 'Verslag',
  recept: 'Recept',
  indicatie: 'Indicatie',
  juridisch: 'Juridisch',
  financieel: 'Financieel',
  overig: 'Overig',
}

interface DossierFormData {
  titel: string
  categorie: DossierCategorie
  datum_document: string
  afzender: string
  samenvatting: string
  inhoud: string
  drive_link: string
}

const emptyForm: DossierFormData = {
  titel: '',
  categorie: 'overig',
  datum_document: '',
  afzender: '',
  samenvatting: '',
  inhoud: '',
  drive_link: '',
}

export function DossierTab({ currentUserId }: DossierTabProps) {
  const [items, setItems] = useState<DossierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterCategorie, setFilterCategorie] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState<DossierFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null)
  const supabase = createClient()

  const openDrivePicker = async () => {
    const settingKey = CATEGORIE_FOLDER_KEY[formData.categorie] ?? 'drive_root_folder_id'
    const { data } = await supabase
      .from('app_instellingen')
      .select('value')
      .eq('key', settingKey)
      .single()
    setDriveFolderId((data as unknown as { value: string } | null)?.value ?? null)
    setShowDrivePicker(true)
  }

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('dossier_items')
      .select('*')
      .eq('gearchiveerd', false)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setItems(data as unknown as DossierItem[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = useMemo(() => {
    let result = items

    if (filterCategorie) {
      result = result.filter((item) => item.categorie === filterCategorie)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.titel.toLowerCase().includes(q) ||
          (item.afzender && item.afzender.toLowerCase().includes(q))
      )
    }

    return result
  }, [items, filterCategorie, searchQuery])

  const openAddModal = () => {
    setFormData(emptyForm)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setFormData(emptyForm)
  }

  const updateField = (field: keyof DossierFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.titel.trim()) return
    setIsSaving(true)

    try {
      const payload = {
        titel: formData.titel,
        categorie: formData.categorie,
        datum_document: formData.datum_document || null,
        afzender: formData.afzender || null,
        samenvatting: formData.samenvatting || null,
        inhoud: formData.inhoud || null,
        drive_link: formData.drive_link || null,
        aangemaakt_door: currentUserId,
      }

      const { error } = await supabase
        .from('dossier_items')
        .insert(payload as never)

      if (error) throw error

      await fetchItems()
      closeModal()
    } catch (err) {
      console.error('Fout bij opslaan dossier item:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleArchive = async (item: DossierItem) => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) return
    try {
      const { error } = await supabase
        .from('dossier_items')
        .update({ gearchiveerd: true } as never)
        .eq('id', item.id)
      if (error) throw error
      await fetchItems()
    } catch (err) {
      console.error('Fout bij archiveren dossier item:', err)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-[#6B7280]">
        Dossier laden...
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-[#4A7C59]" />
          <h2 className="text-base font-semibold text-gray-900">Dossier</h2>
        </div>
        <Button size="sm" onClick={openAddModal}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} />
            Toevoegen
          </span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op titel of afzender..."
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20 focus:border-[#4A7C59] transition-colors"
          />
        </div>
        <select
          value={filterCategorie}
          onChange={(e) => setFilterCategorie(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20 focus:border-[#4A7C59] transition-colors appearance-none sm:w-48"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Items */}
      {filteredItems.length === 0 && (
        <p className="text-sm text-[#6B7280] text-center py-8">
          {items.length === 0
            ? 'Nog geen documenten in het dossier'
            : 'Geen resultaten gevonden'}
        </p>
      )}

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <DossierItemCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => toggleExpand(item.id)}
            onArchive={() => handleArchive(item)}
          />
        ))}
      </div>

      {/* Drive bestandspicker */}
      {showDrivePicker && (
        <DriveFilePicker
          mode="bestand"
          folderId={driveFolderId}
          onSelect={(file) => {
            updateField('drive_link', file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`)
            setShowDrivePicker(false)
          }}
          onClose={() => setShowDrivePicker(false)}
        />
      )}

      {/* Modal voor toevoegen */}
      <Modal open={modalOpen} onClose={closeModal} title="Document toevoegen">
        <div className="space-y-4">
          <Input
            label="Titel"
            value={formData.titel}
            onChange={(e) => updateField('titel', e.target.value)}
            placeholder="Titel van het document"
          />
          <Select
            label="Categorie"
            options={categorieOptions}
            value={formData.categorie}
            onChange={(e) => updateField('categorie', e.target.value as DossierCategorie)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Datum document"
              type="date"
              value={formData.datum_document}
              onChange={(e) => updateField('datum_document', e.target.value)}
            />
            <Input
              label="Afzender"
              value={formData.afzender}
              onChange={(e) => updateField('afzender', e.target.value)}
              placeholder="Naam afzender"
            />
          </div>
          <Textarea
            label="Samenvatting"
            value={formData.samenvatting}
            onChange={(e) => updateField('samenvatting', e.target.value)}
            placeholder="Korte samenvatting..."
            rows={2}
          />
          <Textarea
            label="Inhoud"
            value={formData.inhoud}
            onChange={(e) => updateField('inhoud', e.target.value)}
            placeholder="Volledige inhoud of aantekeningen..."
            rows={4}
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Google Drive link</label>
              <button
                type="button"
                onClick={openDrivePicker}
                className="flex items-center gap-1 text-xs text-[#4A7C59] hover:underline"
              >
                <HardDrive size={12} />
                Kies uit Drive
              </button>
            </div>
            <Input
              label=""
              value={formData.drive_link}
              onChange={(e) => updateField('drive_link', e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.titel.trim()} className="flex-1">
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DossierItemCard({
  item,
  expanded,
  onToggle,
  onArchive,
}: {
  item: DossierItem
  expanded: boolean
  onToggle: () => void
  onArchive: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <button onClick={onToggle} className="w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{item.titel}</h3>
                <Badge className={categorieBadgeStyles[item.categorie]}>
                  {categorieLabels[item.categorie]}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-[#6B7280]">
                {item.datum_document && (
                  <span>{formatDate(item.datum_document)}</span>
                )}
                {item.afzender && <span>{item.afzender}</span>}
              </div>
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
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-3">
                {item.samenvatting && (
                  <div>
                    <span className="text-sm font-medium text-[#6B7280]">Samenvatting</span>
                    <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">
                      {item.samenvatting}
                    </p>
                  </div>
                )}
                {item.inhoud && (
                  <div>
                    <span className="text-sm font-medium text-[#6B7280]">Inhoud</span>
                    <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">
                      {item.inhoud}
                    </p>
                  </div>
                )}
                {item.drive_link && (
                  <a
                    href={item.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#4A7C59] text-white px-3 py-2 text-sm font-medium hover:bg-[#3d6a4a] transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open in Google Drive
                  </a>
                )}
                {!item.samenvatting && !item.inhoud && !item.drive_link && (
                  <p className="text-sm text-[#6B7280]">Geen extra informatie beschikbaar</p>
                )}
                <div className="pt-1">
                  <button
                    onClick={onArchive}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    Verwijderen
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

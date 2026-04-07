'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Phone,
  Mail,
  Pencil,
  Trash2,
  Plus,
  Search,
  Check,
  X,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'

interface ContactenTabProps {
  currentUserId: string
}

interface Contact {
  id: string
  created_at: string
  naam: string
  functie: string | null
  organisatie: string | null
  telefoon: string | null
  email: string | null
  adres: string | null
  notities: string | null
  is_noodcontact: boolean
  nood_volgorde: number | null
  aangemaakt_door: string
}

interface ContactFormData {
  naam: string
  functie: string
  organisatie: string
  telefoon: string
  email: string
  adres: string
  notities: string
  is_noodcontact: boolean
  nood_volgorde: string
}

const emptyForm: ContactFormData = {
  naam: '',
  functie: '',
  organisatie: '',
  telefoon: '',
  email: '',
  adres: '',
  notities: '',
  is_noodcontact: false,
  nood_volgorde: '',
}

type FilterTab = 'alle' | 'noodcontacten' | 'familie' | 'zorg' | 'overig'

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'noodcontacten', label: 'Noodcontacten' },
  { value: 'familie', label: 'Familie' },
  { value: 'zorg', label: 'Zorg' },
  { value: 'overig', label: 'Overig' },
]

function isFamilie(functie: string | null): boolean {
  if (!functie) return false
  const lower = functie.toLowerCase()
  return ['familie', 'ouder', 'broer', 'zus'].some((k) => lower.includes(k))
}

function isZorg(functie: string | null): boolean {
  if (!functie) return false
  const lower = functie.toLowerCase()
  return ['arts', 'begeleider', 'therapeut', 'zorg', 'verpleeg'].some((k) => lower.includes(k))
}

function noodLabel(volgorde: number | null): string {
  if (volgorde === 1) return '1e'
  if (volgorde === 2) return '2e'
  if (volgorde === 3) return '3e'
  return `${volgorde}e`
}

export function ContactenTab({ currentUserId }: ContactenTabProps) {
  const [contacten, setContacten] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('alle')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState<ContactFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchContacten = useCallback(async () => {
    const { data, error } = await supabase
      .from('contacten')
      .select('*')
      .eq('gearchiveerd', false)
      .order('naam', { ascending: true })

    if (!error && data) {
      setContacten(data as unknown as Contact[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchContacten()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredContacten = useMemo(() => {
    let result = [...contacten]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.naam.toLowerCase().includes(q) ||
          (c.functie && c.functie.toLowerCase().includes(q)) ||
          (c.organisatie && c.organisatie.toLowerCase().includes(q))
      )
    }

    // Tab filter
    switch (activeFilter) {
      case 'noodcontacten':
        result = result.filter((c) => c.is_noodcontact)
        break
      case 'familie':
        result = result.filter((c) => isFamilie(c.functie))
        break
      case 'zorg':
        result = result.filter((c) => isZorg(c.functie))
        break
      case 'overig':
        result = result.filter((c) => !isFamilie(c.functie) && !isZorg(c.functie))
        break
    }

    // Sort: noodcontacten first by volgorde, then alphabetically
    result.sort((a, b) => {
      if (a.is_noodcontact && !b.is_noodcontact) return -1
      if (!a.is_noodcontact && b.is_noodcontact) return 1
      if (a.is_noodcontact && b.is_noodcontact) {
        return (a.nood_volgorde ?? 999) - (b.nood_volgorde ?? 999)
      }
      return a.naam.localeCompare(b.naam)
    })

    return result
  }, [contacten, searchQuery, activeFilter])

  const openAddModal = () => {
    setEditingContact(null)
    setFormData(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      naam: contact.naam,
      functie: contact.functie ?? '',
      organisatie: contact.organisatie ?? '',
      telefoon: contact.telefoon ?? '',
      email: contact.email ?? '',
      adres: contact.adres ?? '',
      notities: contact.notities ?? '',
      is_noodcontact: contact.is_noodcontact,
      nood_volgorde: contact.nood_volgorde?.toString() ?? '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingContact(null)
    setFormData(emptyForm)
  }

  const updateField = (field: keyof ContactFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.naam.trim()) return
    setIsSaving(true)

    try {
      const payload = {
        naam: formData.naam,
        functie: formData.functie || null,
        organisatie: formData.organisatie || null,
        telefoon: formData.telefoon || null,
        email: formData.email || null,
        adres: formData.adres || null,
        notities: formData.notities || null,
        is_noodcontact: formData.is_noodcontact,
        nood_volgorde: formData.is_noodcontact && formData.nood_volgorde
          ? parseInt(formData.nood_volgorde, 10)
          : null,
        aangemaakt_door: currentUserId,
      }

      if (editingContact) {
        const { error } = await supabase
          .from('contacten')
          .update(payload as never)
          .eq('id', editingContact.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('contacten')
          .insert(payload as never)
        if (error) throw error
      }

      await fetchContacten()
      closeModal()
    } catch (err) {
      console.error('Fout bij opslaan contact:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteContact = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) {
      setDeleteConfirmId(null)
      return
    }
    try {
      const { error } = await supabase
        .from('contacten')
        .update({ gearchiveerd: true } as never)
        .eq('id', id)
      if (error) throw error
      await fetchContacten()
    } catch (err) {
      console.error('Fout bij verwijderen contact:', err)
    } finally {
      setDeleteConfirmId(null)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-center text-[#6B7280]">
        Contacten laden...
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#4A7C59]" />
          <h2 className="text-base font-semibold text-gray-900">Contacten</h2>
        </div>
        <Button size="sm" onClick={openAddModal}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} />
            Toevoegen
          </span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoek op naam, functie of organisatie..."
          className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20 focus:border-[#4A7C59] transition-colors"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === tab.value
                ? 'bg-[#4A7C59] text-white'
                : 'text-[#6B7280] hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contact list */}
      {filteredContacten.length === 0 && (
        <p className="text-sm text-[#6B7280] text-center py-8">
          {contacten.length === 0
            ? 'Nog geen contacten toegevoegd'
            : 'Geen contacten gevonden'}
        </p>
      )}

      <div className="space-y-3">
        {filteredContacten.map((contact, index) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.25 }}
          >
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{contact.naam}</h3>
                    {contact.is_noodcontact && (
                      <Badge className="bg-[#C4704F]/10 text-[#C4704F]">
                        Noodcontact{contact.nood_volgorde ? ` (${noodLabel(contact.nood_volgorde)})` : ''}
                      </Badge>
                    )}
                  </div>
                  {contact.functie && (
                    <p className="text-sm text-[#6B7280]">{contact.functie}</p>
                  )}
                  {contact.organisatie && (
                    <p className="text-sm text-[#6B7280]">{contact.organisatie}</p>
                  )}

                  {/* Contact actions */}
                  <div className="flex items-center gap-3 mt-2">
                    {contact.telefoon && (
                      <a
                        href={`tel:${contact.telefoon}`}
                        className="inline-flex items-center gap-1.5 text-sm text-[#4A7C59] hover:underline"
                      >
                        <Phone size={14} />
                        {contact.telefoon}
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-1.5 text-sm text-[#4A7C59] hover:underline"
                      >
                        <Mail size={14} />
                        {contact.email}
                      </a>
                    )}
                  </div>

                  {contact.notities && (
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                      {contact.notities}
                    </p>
                  )}
                </div>

                {/* Edit / Delete */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(contact)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  {deleteConfirmId === contact.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteContact(contact.id)}
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
                      onClick={() => setDeleteConfirmId(contact.id)}
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

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingContact ? 'Contact bewerken' : 'Contact toevoegen'}
      >
        <div className="space-y-4">
          <Input
            label="Naam"
            value={formData.naam}
            onChange={(e) => updateField('naam', e.target.value)}
            placeholder="Naam contactpersoon"
            required
          />
          <Input
            label="Functie"
            value={formData.functie}
            onChange={(e) => updateField('functie', e.target.value)}
            placeholder="Bijv. huisarts, begeleider, familie"
          />
          <Input
            label="Organisatie"
            value={formData.organisatie}
            onChange={(e) => updateField('organisatie', e.target.value)}
            placeholder="Naam organisatie"
          />
          <Input
            label="Telefoon"
            value={formData.telefoon}
            onChange={(e) => updateField('telefoon', e.target.value)}
            placeholder="Telefoonnummer"
          />
          <Input
            label="E-mail"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="E-mailadres"
          />
          <Textarea
            label="Adres"
            value={formData.adres}
            onChange={(e) => updateField('adres', e.target.value)}
            placeholder="Adresgegevens"
            rows={2}
          />
          <Textarea
            label="Notities"
            value={formData.notities}
            onChange={(e) => updateField('notities', e.target.value)}
            placeholder="Extra informatie..."
            rows={3}
          />

          {/* Noodcontact toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_noodcontact}
                onChange={(e) => updateField('is_noodcontact', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:border-[#C4704F] peer-checked:bg-[#C4704F] transition-colors flex items-center justify-center">
                {formData.is_noodcontact && (
                  <Check size={14} className="text-white" />
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              Noodcontact
            </span>
          </label>

          {formData.is_noodcontact && (
            <Input
              label="Volgorde (1 = eerste contact)"
              type="number"
              value={formData.nood_volgorde}
              onChange={(e) => updateField('nood_volgorde', e.target.value)}
              placeholder="1"
              min="1"
            />
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.naam.trim()}
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

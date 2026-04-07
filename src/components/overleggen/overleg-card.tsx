'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Calendar,
  FileText,
  Video,
  ExternalLink,
  ListChecks,
  Pencil,
  Save,
  X,
  Trash2,
  Archive,
  Link as LinkIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BespreekpuntForm } from '@/components/overleggen/bespreekpunt-form'
import { DriveFilePicker } from '@/components/overleggen/drive-file-picker'
import { cn, formatDateTime, formatRelative } from '@/lib/utils'
import type { Overleg, Profile, Bespreekpunt } from '@/types'

interface OverlegCardProps {
  overleg: Overleg
  allProfiles: Profile[]
  currentProfile: Profile
  currentUserId: string
  onUpdate: () => void
}

export function OverlegCard({
  overleg,
  allProfiles,
  currentProfile,
  currentUserId,
  onUpdate,
}: OverlegCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [drivePickerMode, setDrivePickerMode] = useState<'verslag' | 'opname'>('verslag')
  const [verslagenFolderId, setVerslagenFolderId] = useState<string | null>(null)
  const [opnameFolderId, setOpnameFolderId] = useState<string | null>(null)
  const [notities, setNotities] = useState(overleg.notities ?? '')
  const [savingNotities, setSavingNotities] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitel, setEditTitel] = useState(overleg.titel)
  const [editDatumTijd, setEditDatumTijd] = useState('')
  const [editAanwezigen, setEditAanwezigen] = useState<string[]>(overleg.aanwezigen ?? [])
  const [editNotities, setEditNotities] = useState(overleg.notities ?? '')
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
  const [archiving, setArchiving] = useState(false)

  const supabase = createClient()

  // Laad Drive folder-IDs eenmalig
  useEffect(() => {
    supabase
      .from('app_instellingen')
      .select('key, value')
      .in('key', ['drive_map_verslagen', 'drive_map_opnames'])
      .then(({ data }) => {
        if (!data) return
        const verslagen = data.find((r: { key: string; value: string }) => r.key === 'drive_map_verslagen')
        const opnames = data.find((r: { key: string; value: string }) => r.key === 'drive_map_opnames')
        if (verslagen) setVerslagenFolderId(verslagen.value as string)
        if (opnames) setOpnameFolderId(opnames.value as string)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isBeheerder = currentProfile?.rol === 'beheerder'
  const isPast = new Date(overleg.datum_tijd) < new Date()
  const isGearchiveerd = !!(overleg as any).gearchiveerd

  const aanwezigenProfiles = allProfiles.filter((p) =>
    overleg.aanwezigen.includes(p.id)
  )

  const bespreekpunten = (overleg.bespreekpunten ?? []) as Bespreekpunt[]

  const handleBespreekpuntAdded = () => {
    onUpdate()
  }

  const handleSaveNotities = async () => {
    setSavingNotities(true)
    await supabase
      .from('overleggen')
      .update({ notities: notities.trim() || null })
      .eq('id', overleg.id)
    setSavingNotities(false)
    onUpdate()
  }

  const handleDriveLink = async (file: import('@/types').DriveFile) => {
    const field =
      drivePickerMode === 'verslag' ? 'drive_verslag_id' : 'drive_opname_id'
    await supabase
      .from('overleggen')
      .update({ [field]: file.id })
      .eq('id', overleg.id)
    setShowDrivePicker(false)
    onUpdate()
  }

  const openDrivePicker = (mode: 'verslag' | 'opname') => {
    setDrivePickerMode(mode)
    setShowDrivePicker(true)
  }

  const handleStartEdit = () => {
    setEditTitel(overleg.titel)
    // Format datetime for input
    const dt = new Date(overleg.datum_tijd)
    const formatted = dt.toISOString().slice(0, 16)
    setEditDatumTijd(formatted)
    setEditAanwezigen(overleg.aanwezigen ?? [])
    setEditNotities(overleg.notities ?? '')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setConfirmDeleteIndex(null)
  }

  const handleSaveEdit = async () => {
    if (!editTitel.trim()) return

    setSavingEdit(true)
    try {
      await supabase
        .from('overleggen')
        .update({
          titel: editTitel.trim(),
          datum_tijd: new Date(editDatumTijd).toISOString(),
          aanwezigen: editAanwezigen,
          notities: editNotities.trim() || null,
        })
        .eq('id', overleg.id)

      setIsEditing(false)
      logAudit({
        gebruikerId: currentUserId,
        actie: 'gewijzigd',
        module: 'overleggen',
        omschrijving: `Overleg gewijzigd: "${editTitel.trim()}"`,
      })
      onUpdate()
    } finally {
      setSavingEdit(false)
    }
  }

  const toggleEditAanwezige = (profileId: string) => {
    setEditAanwezigen((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    )
  }

  const handleDeleteBespreekpunt = async (index: number) => {
    const updated = bespreekpunten.filter((_, i) => i !== index)
    await supabase
      .from('overleggen')
      .update({ bespreekpunten: updated })
      .eq('id', overleg.id)
    setConfirmDeleteIndex(null)
    logAudit({
      gebruikerId: currentUserId,
      actie: 'gewijzigd',
      module: 'overleggen',
      omschrijving: `Bespreekpunt verwijderd uit overleg "${overleg.titel}"`,
    })
    onUpdate()
  }

  const handleEditBespreekpunt = async (index: number, newTekst: string) => {
    const updated = bespreekpunten.map((punt, i) =>
      i === index ? { ...punt, tekst: newTekst } : punt
    )
    await supabase
      .from('overleggen')
      .update({ bespreekpunten: updated })
      .eq('id', overleg.id)
    onUpdate()
  }

  const handleArchive = async () => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) return
    setArchiving(true)
    await supabase
      .from('overleggen')
      .update({ gearchiveerd: true })
      .eq('id', overleg.id)
    setArchiving(false)
    logAudit({
      gebruikerId: currentUserId,
      actie: 'gearchiveerd',
      module: 'overleggen',
      omschrijving: `Overleg gearchiveerd: "${overleg.titel}"`,
    })
    onUpdate()
  }

  return (
    <>
      <Card>
        {/* Main row */}
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-left min-w-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {overleg.titel}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Calendar size={12} />
                    {formatDateTime(overleg.datum_tijd)}
                  </span>
                  {isPast ? (
                    <Badge className="bg-gray-100 text-gray-600">Afgerond</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">
                      Aankomend
                    </Badge>
                  )}
                  {isGearchiveerd && (
                    <Badge className="bg-gray-100 text-gray-500">
                      Gearchiveerd
                    </Badge>
                  )}
                  {bespreekpunten.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <ListChecks size={12} />
                      {bespreekpunten.length} punt
                      {bespreekpunten.length !== 1 && 'en'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {/* Edit button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStartEdit()
                if (!expanded) setExpanded(true)
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Bewerken"
            >
              <Pencil size={16} />
            </button>
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {aanwezigenProfiles.slice(0, 4).map((p) => (
                <Avatar
                  key={p.id}
                  naam={p.naam}
                  kleur={p.kleur}
                  size="sm"
                />
              ))}
              {aanwezigenProfiles.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
                  +{aanwezigenProfiles.length - 4}
                </div>
              )}
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <button onClick={() => setExpanded(!expanded)}>
                <ChevronDown size={18} className="text-gray-400" />
              </button>
            </motion.div>
          </div>
        </div>

        {/* Expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-4">
                {/* Edit mode */}
                {isEditing ? (
                  <div className="space-y-4 p-3 bg-gray-50 rounded-xl">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Titel</label>
                      <input
                        type="text"
                        value={editTitel}
                        onChange={(e) => setEditTitel(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Datum en tijd</label>
                      <input
                        type="datetime-local"
                        value={editDatumTijd}
                        onChange={(e) => setEditDatumTijd(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Aanwezigen</label>
                      <div className="flex flex-wrap gap-2">
                        {allProfiles.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => toggleEditAanwezige(profile.id)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                              editAanwezigen.includes(profile.id)
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: profile.kleur }}
                            >
                              {profile.naam.charAt(0).toUpperCase()}
                            </div>
                            {profile.naam}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Notities</label>
                      <textarea
                        value={editNotities}
                        onChange={(e) => setEditNotities(e.target.value)}
                        placeholder="Voeg notities toe..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                        <span className="flex items-center gap-1.5">
                          <Save size={14} />
                          {savingEdit ? 'Opslaan...' : 'Opslaan'}
                        </span>
                      </Button>
                      <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                        <span className="flex items-center gap-1.5">
                          <X size={14} />
                          Annuleren
                        </span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Aanwezigen */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Aanwezigen
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {aanwezigenProfiles.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1"
                          >
                            <Avatar naam={p.naam} kleur={p.kleur} size="sm" />
                            <span className="text-sm text-gray-700">{p.naam}</span>
                          </div>
                        ))}
                        {aanwezigenProfiles.length === 0 && (
                          <span className="text-sm text-muted">
                            Geen aanwezigen opgegeven
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notities (read-only with save) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Notities
                      </label>
                      <textarea
                        value={notities}
                        onChange={(e) => setNotities(e.target.value)}
                        placeholder="Voeg notities toe..."
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
                      />
                      {notities !== (overleg.notities ?? '') && (
                        <button
                          onClick={handleSaveNotities}
                          disabled={savingNotities}
                          className="mt-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                          {savingNotities ? 'Opslaan...' : 'Notities opslaan'}
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Bespreekpunten (always visible, editable) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Bespreekpunten
                  </label>
                  {bespreekpunten.length > 0 ? (
                    <ul className="space-y-2">
                      {bespreekpunten.map((punt, i) => {
                        const addedBy = allProfiles.find(
                          (p) => p.id === punt.toegevoegd_door
                        )
                        return (
                          <BespreekpuntItem
                            key={i}
                            index={i}
                            punt={punt}
                            addedBy={addedBy}
                            trelloKaartLink={(punt as any).trello_kaart_link}
                            confirmDeleteIndex={confirmDeleteIndex}
                            onConfirmDelete={setConfirmDeleteIndex}
                            onDelete={handleDeleteBespreekpunt}
                            onEdit={handleEditBespreekpunt}
                            onTrelloLinkChange={async (index, link) => {
                              const updated = bespreekpunten.map((p, idx) =>
                                idx === index ? { ...p, trello_kaart_link: link } : p
                              )
                              await supabase
                                .from('overleggen')
                                .update({ bespreekpunten: updated })
                                .eq('id', overleg.id)
                              onUpdate()
                            }}
                          />
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">
                      Nog geen bespreekpunten.
                    </p>
                  )}
                  <div className="mt-2">
                    <BespreekpuntForm
                      overlegId={overleg.id}
                      currentBespreekpunten={bespreekpunten}
                      currentUserId={currentUserId}
                      onAdded={handleBespreekpuntAdded}
                    />
                  </div>
                </div>

                {/* Google Drive links */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Google Drive
                  </label>
                  <div className="space-y-2">
                    {overleg.drive_verslag_id ? (
                      <a
                        href={`https://drive.google.com/file/d/${overleg.drive_verslag_id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <FileText size={16} />
                        <span>Verslag openen in Drive</span>
                        <ExternalLink size={14} className="ml-auto" />
                      </a>
                    ) : isBeheerder ? (
                      <button
                        onClick={() => openDrivePicker('verslag')}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors w-full"
                      >
                        <FileText size={16} />
                        <span>Koppel verslag uit Drive</span>
                      </button>
                    ) : null}

                    {overleg.drive_opname_id ? (
                      <a
                        href={`https://drive.google.com/file/d/${overleg.drive_opname_id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        <Video size={16} />
                        <span>Opname openen in Drive</span>
                        <ExternalLink size={14} className="ml-auto" />
                      </a>
                    ) : isBeheerder ? (
                      <button
                        onClick={() => openDrivePicker('opname')}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors w-full"
                      >
                        <Video size={16} />
                        <span>Koppel opname uit Drive</span>
                      </button>
                    ) : null}

                    {!overleg.drive_verslag_id &&
                      !overleg.drive_opname_id &&
                      !isBeheerder && (
                        <p className="text-sm text-muted">
                          Geen Drive-bestanden gekoppeld.
                        </p>
                      )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href="/taken"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <ListChecks size={14} />
                    Maak taak
                  </Link>
                  {!isGearchiveerd && (
                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-[#C4704F] hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
                    >
                      <Archive size={14} />
                      {archiving ? 'Bezig...' : 'Verwijderen'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Drive file picker modal */}
      {showDrivePicker && (
        <DriveFilePicker
          mode={drivePickerMode}
          folderId={drivePickerMode === 'verslag' ? verslagenFolderId : opnameFolderId}
          onSelect={handleDriveLink}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </>
  )
}

// Sub-component for individual bespreekpunt with edit/delete
function BespreekpuntItem({
  index,
  punt,
  addedBy,
  trelloKaartLink,
  confirmDeleteIndex,
  onConfirmDelete,
  onDelete,
  onEdit,
  onTrelloLinkChange,
}: {
  index: number
  punt: Bespreekpunt
  addedBy: Profile | undefined
  trelloKaartLink?: string
  confirmDeleteIndex: number | null
  onConfirmDelete: (index: number | null) => void
  onDelete: (index: number) => void
  onEdit: (index: number, text: string) => void
  onTrelloLinkChange: (index: number, link: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(punt.tekst)
  const [showTrelloInput, setShowTrelloInput] = useState(false)
  const [trelloLink, setTrelloLink] = useState(trelloKaartLink ?? '')

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(index, editText.trim())
      setIsEditing(false)
    }
  }

  const handleSaveTrelloLink = () => {
    onTrelloLinkChange(index, trelloLink.trim())
    setShowTrelloInput(false)
  }

  return (
    <li className="flex items-start gap-2 text-sm group">
      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
        {index + 1}
      </span>
      <div className="flex-1">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit()
                if (e.key === 'Escape') setIsEditing(false)
              }}
              className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="text-primary hover:text-primary-dark"
            >
              <Save size={14} />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-1">
              <p className="text-gray-900 flex-1">{punt.tekst}</p>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-400 hover:text-primary rounded"
                  title="Bewerken"
                >
                  <Pencil size={12} />
                </button>
                {confirmDeleteIndex === index ? (
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => onDelete(index)}
                      className="text-red-600 hover:text-red-700 font-medium px-1"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => onConfirmDelete(null)}
                      className="text-gray-500 hover:text-gray-700 px-1"
                    >
                      Nee
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onConfirmDelete(index)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                    title="Verwijderen"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <button
                  onClick={() => setShowTrelloInput(!showTrelloInput)}
                  className={cn(
                    'p-1 rounded',
                    trelloKaartLink
                      ? 'text-blue-500'
                      : 'text-gray-400 hover:text-blue-500'
                  )}
                  title="Trello-kaart koppelen"
                >
                  <LinkIcon size={12} />
                </button>
              </div>
            </div>
            {addedBy && (
              <p className="text-xs text-muted mt-0.5">
                Toegevoegd door {addedBy.naam} &middot;{' '}
                {formatRelative(punt.created_at)}
              </p>
            )}
            {trelloKaartLink && !showTrelloInput && (
              <a
                href={trelloKaartLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-0.5"
              >
                <ExternalLink size={10} />
                Trello-kaart
              </a>
            )}
            {showTrelloInput && (
              <div className="flex gap-2 mt-1">
                <input
                  type="url"
                  value={trelloLink}
                  onChange={(e) => setTrelloLink(e.target.value)}
                  placeholder="https://trello.com/c/..."
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={handleSaveTrelloLink}
                  className="text-xs text-primary hover:text-primary-dark font-medium"
                >
                  Opslaan
                </button>
                <button
                  onClick={() => setShowTrelloInput(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Annuleren
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  )
}

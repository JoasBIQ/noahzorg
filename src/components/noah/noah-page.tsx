'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pencil,
  Save,
  X,
  User,
  Stethoscope,
  Building2,
  ChevronDown,
  ExternalLink,
  Shield,
  AlertTriangle,
  Pill,
} from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import type { Profile, NoahProfiel } from '@/types'

interface NoahPageProps {
  noahProfiel: NoahProfiel | null
  currentProfile: Profile
  updatedByProfile: Profile | null
}

interface FormData {
  volledige_naam: string
  geboortedatum: string
  diagnose: string
  huisarts: string
  zorgkantoor: string
  zorgkantoor_nummer: string
  notities: string
  karakter: string
  wat_fijn: string
  wat_onrustig: string
  communicatie: string
  reanimatie_beleid: string
  reanimatie_toelichting: string
  reanimatie_gesprek_gevoerd: boolean
  reanimatie_gesprek_datum: string
  reanimatie_gesprek_met: string
  medicatielijst_apotheek_link: string
}

function getFormData(profiel: NoahProfiel | null): FormData {
  return {
    volledige_naam: profiel?.volledige_naam ?? '',
    geboortedatum: profiel?.geboortedatum ?? '',
    diagnose: profiel?.diagnose ?? '',
    huisarts: profiel?.huisarts ?? '',
    zorgkantoor: profiel?.zorgkantoor ?? '',
    zorgkantoor_nummer: profiel?.zorgkantoor_nummer ?? '',
    notities: profiel?.notities ?? '',
    karakter: profiel?.karakter ?? '',
    wat_fijn: profiel?.wat_fijn ?? '',
    wat_onrustig: profiel?.wat_onrustig ?? '',
    communicatie: profiel?.communicatie ?? '',
    reanimatie_beleid: profiel?.reanimatie_beleid ?? '',
    reanimatie_toelichting: profiel?.reanimatie_toelichting ?? '',
    reanimatie_gesprek_gevoerd: profiel?.reanimatie_gesprek_gevoerd ?? false,
    reanimatie_gesprek_datum: profiel?.reanimatie_gesprek_datum ?? '',
    reanimatie_gesprek_met: profiel?.reanimatie_gesprek_met ?? '',
    medicatielijst_apotheek_link: profiel?.medicatielijst_apotheek_link ?? '',
  }
}

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export function NoahPage({ noahProfiel, currentProfile, updatedByProfile }: NoahPageProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<FormData>(getFormData(noahProfiel))
  const [profiel, setProfiel] = useState(noahProfiel)
  const [updatedBy, setUpdatedBy] = useState(updatedByProfile)
  const [isSaving, setIsSaving] = useState(false)
  const [showMedisch, setShowMedisch] = useState(false)
  const [keeperUrl, setKeeperUrl] = useState('https://keepersecurity.com')
  const supabase = createClient()

  useEffect(() => {
    const fetchKeeperUrl = async () => {
      const { data } = await supabase
        .from('app_instellingen')
        .select('value')
        .eq('key', 'keeper_url')
        .single()
      if (data) {
        setKeeperUrl(data.value)
      }
    }
    fetchKeeperUrl()
  }, [supabase])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updateData = {
        volledige_naam: formData.volledige_naam || null,
        geboortedatum: formData.geboortedatum || null,
        diagnose: formData.diagnose || null,
        huisarts: formData.huisarts || null,
        zorgkantoor: formData.zorgkantoor || null,
        zorgkantoor_nummer: formData.zorgkantoor_nummer || null,
        notities: formData.notities || null,
        karakter: formData.karakter || null,
        wat_fijn: formData.wat_fijn || null,
        wat_onrustig: formData.wat_onrustig || null,
        communicatie: formData.communicatie || null,
        reanimatie_beleid: formData.reanimatie_beleid || null,
        reanimatie_toelichting: formData.reanimatie_toelichting || null,
        reanimatie_gesprek_gevoerd: formData.reanimatie_gesprek_gevoerd,
        reanimatie_gesprek_datum: formData.reanimatie_gesprek_datum || null,
        reanimatie_gesprek_met: formData.reanimatie_gesprek_met || null,
        medicatielijst_apotheek_link: formData.medicatielijst_apotheek_link || null,
        updated_by: currentProfile.id,
      }

      if (profiel) {
        const { data, error } = await supabase
          .from('noah_profiel')
          .update(updateData as never)
          .eq('id', profiel.id)
          .select()
          .single()

        if (error) throw error
        setProfiel(data as unknown as NoahProfiel)
      } else {
        const { data, error } = await supabase
          .from('noah_profiel')
          .insert(updateData as never)
          .select()
          .single()

        if (error) throw error
        setProfiel(data as unknown as NoahProfiel)
      }

      setUpdatedBy(currentProfile)
      const gewijzigdeVelden = Object.keys(formData).filter(k => formData[k as keyof FormData] !== getFormData(profiel)[k as keyof FormData])
      logAudit({
        gebruikerId: currentProfile.id,
        actie: 'gewijzigd',
        module: 'noah_profiel',
        omschrijving: gewijzigdeVelden.length > 0
          ? `Noah profiel bijgewerkt: ${gewijzigdeVelden.join(', ')}`
          : 'Noah profiel bijgewerkt',
        metadata: {
          gewijzigde_velden: gewijzigdeVelden,
          oude_waarden: Object.fromEntries(gewijzigdeVelden.map(k => [k, getFormData(profiel)[k as keyof FormData]])),
          nieuwe_waarden: Object.fromEntries(gewijzigdeVelden.map(k => [k, formData[k as keyof FormData]])),
        },
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving noah profiel:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(getFormData(profiel))
    setIsEditing(false)
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 space-y-6">
        {/* Bewerk knoppen */}
        <div className="flex justify-end">
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleCancel}>
                <span className="flex items-center gap-1.5">
                  <X size={16} />
                  Annuleren
                </span>
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <span className="flex items-center gap-1.5">
                  <Save size={16} />
                  {isSaving ? 'Opslaan...' : 'Opslaan'}
                </span>
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
              <span className="flex items-center gap-1.5">
                <Pencil size={16} />
                Bewerken
              </span>
            </Button>
          )}
        </div>
        {/* Wie is Noah */}
        <motion.div variants={sectionVariants} initial="hidden" animate="visible">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Image src="/icons/icon-192x192.png" alt="" width={18} height={18} className="flex-shrink-0" />
              <h2 className="text-base font-semibold text-gray-900">Wie is Noah</h2>
            </div>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <Textarea
                    label="Karakter"
                    value={formData.karakter}
                    onChange={(e) => updateField('karakter', e.target.value)}
                    placeholder="Hoe zou je Noah omschrijven?"
                    rows={3}
                  />
                  <Textarea
                    label="Wat vindt hij fijn"
                    value={formData.wat_fijn}
                    onChange={(e) => updateField('wat_fijn', e.target.value)}
                    placeholder="Waar wordt Noah blij van?"
                    rows={3}
                  />
                  <Textarea
                    label="Wat maakt hem onrustig"
                    value={formData.wat_onrustig}
                    onChange={(e) => updateField('wat_onrustig', e.target.value)}
                    placeholder="Waar kan Noah onrustig van worden?"
                    rows={3}
                  />
                  <Textarea
                    label="Hoe communiceert hij"
                    value={formData.communicatie}
                    onChange={(e) => updateField('communicatie', e.target.value)}
                    placeholder="Hoe laat Noah zien wat hij wil of voelt?"
                    rows={3}
                  />
                </>
              ) : (
                <>
                  <TextBlock label="Karakter" value={profiel?.karakter} />
                  <TextBlock label="Wat vindt hij fijn" value={profiel?.wat_fijn} />
                  <TextBlock label="Wat maakt hem onrustig" value={profiel?.wat_onrustig} />
                  <TextBlock label="Hoe communiceert hij" value={profiel?.communicatie} />
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Persoonlijke gegevens */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.05 }}
        >
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-gray-900">Persoonlijke gegevens</h2>
            </div>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <Input
                    label="Volledige naam"
                    value={formData.volledige_naam}
                    onChange={(e) => updateField('volledige_naam', e.target.value)}
                  />
                  <Input
                    label="Geboortedatum"
                    type="date"
                    value={formData.geboortedatum}
                    onChange={(e) => updateField('geboortedatum', e.target.value)}
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Volledige naam" value={profiel?.volledige_naam} />
                  <InfoRow
                    label="Geboortedatum"
                    value={profiel?.geboortedatum ? formatDate(profiel.geboortedatum) : null}
                  />
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Notities */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
        >
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Notities</h2>
            {isEditing ? (
              <Textarea
                label="Notities"
                value={formData.notities}
                onChange={(e) => updateField('notities', e.target.value)}
                placeholder="Voeg hier eventuele notities toe..."
                rows={4}
              />
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">
                {profiel?.notities || <span className="text-gray-400">Geen notities</span>}
              </p>
            )}
          </Card>
        </motion.div>

        {/* Medisch en administratief (inklapbaar) */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
        >
          <Card>
            <button
              onClick={() => setShowMedisch(!showMedisch)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Stethoscope size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-gray-900">Medisch en administratief</h2>
              </div>
              <motion.div
                animate={{ rotate: showMedisch ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={18} className="text-gray-400" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showMedisch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-4 mt-4 border-t border-gray-100">
                    {isEditing ? (
                      <>
                        <Input
                          label="Huisarts"
                          value={formData.huisarts}
                          onChange={(e) => updateField('huisarts', e.target.value)}
                        />
                        <Input
                          label="Diagnose"
                          value={formData.diagnose}
                          onChange={(e) => updateField('diagnose', e.target.value)}
                        />
                        <Input
                          label="Zorgkantoor"
                          value={formData.zorgkantoor}
                          onChange={(e) => updateField('zorgkantoor', e.target.value)}
                        />
                        <Input
                          label="Zorgkantoor nummer"
                          value={formData.zorgkantoor_nummer}
                          onChange={(e) => updateField('zorgkantoor_nummer', e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <InfoRow label="Huisarts" value={profiel?.huisarts} />
                        <InfoRow label="Diagnose" value={profiel?.diagnose} />
                        <InfoRow label="Zorgkantoor" value={profiel?.zorgkantoor} />
                        <InfoRow label="Zorgkantoor nummer" value={profiel?.zorgkantoor_nummer} />
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Medicatielijst apotheek */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
        >
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Pill size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-gray-900">Medicatielijst apotheek</h2>
            </div>
            {isEditing ? (
              <Input
                label="Link naar actuele medicatielijst (bijv. Google Drive)"
                value={formData.medicatielijst_apotheek_link}
                onChange={(e) => updateField('medicatielijst_apotheek_link', e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            ) : profiel?.medicatielijst_apotheek_link ? (
              <a
                href={profiel.medicatielijst_apotheek_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <ExternalLink size={16} />
                Bekijk actuele medicatielijst
              </a>
            ) : (
              <p className="text-sm text-gray-400">Nog geen medicatielijst gekoppeld. Voeg een link toe via Bewerken.</p>
            )}
          </Card>
        </motion.div>

        {/* Reanimatie-beleid */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-[#C4704F]" />
              <h2 className="text-base font-semibold text-gray-900">Reanimatie-beleid</h2>
            </div>
            <p className="text-xs text-[#6B7280] mb-4">
              Dit is een belangrijk gesprek om als familie samen te voeren. Neem de tijd en betrek iedereen.
            </p>

            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  label="Beleid"
                  value={formData.reanimatie_beleid}
                  onChange={(e) => updateField('reanimatie_beleid', e.target.value)}
                  placeholder="Wat is het huidige beleid rondom reanimatie?"
                  rows={3}
                />
                <Textarea
                  label="Toelichting"
                  value={formData.reanimatie_toelichting}
                  onChange={(e) => updateField('reanimatie_toelichting', e.target.value)}
                  placeholder="Toelichting, afwegingen en achtergrond..."
                  rows={3}
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.reanimatie_gesprek_gevoerd}
                      onChange={(e) => setFormData(prev => ({ ...prev, reanimatie_gesprek_gevoerd: e.target.checked }))}
                      className="rounded border-gray-300 text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm text-gray-700">Gesprek hierover is gevoerd</span>
                  </label>
                </div>
                {formData.reanimatie_gesprek_gevoerd && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Datum gesprek"
                      type="date"
                      value={formData.reanimatie_gesprek_datum}
                      onChange={(e) => updateField('reanimatie_gesprek_datum', e.target.value)}
                    />
                    <Input
                      label="Gesprek gevoerd met"
                      value={formData.reanimatie_gesprek_met}
                      onChange={(e) => updateField('reanimatie_gesprek_met', e.target.value)}
                      placeholder="Namen van de aanwezigen"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {profiel?.reanimatie_beleid ? (
                  <>
                    <div>
                      <span className="text-sm text-gray-500">Beleid</span>
                      <p className="text-gray-900 whitespace-pre-wrap">{profiel.reanimatie_beleid}</p>
                    </div>
                    {profiel.reanimatie_toelichting && (
                      <div>
                        <span className="text-sm text-gray-500">Toelichting</span>
                        <p className="text-gray-900 whitespace-pre-wrap">{profiel.reanimatie_toelichting}</p>
                      </div>
                    )}
                    {profiel.reanimatie_gesprek_gevoerd && (
                      <div className="flex items-center gap-2 text-sm text-[#4A7C59]">
                        <span>Gesprek gevoerd</span>
                        {profiel.reanimatie_gesprek_datum && (
                          <span>op {formatDate(profiel.reanimatie_gesprek_datum)}</span>
                        )}
                        {profiel.reanimatie_gesprek_met && (
                          <span>met {profiel.reanimatie_gesprek_met}</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[#C4704F]/5 border border-[#C4704F]/20 rounded-lg p-4">
                    <p className="text-sm text-[#C4704F] font-medium mb-1">Nog niet vastgelegd</p>
                    <p className="text-sm text-[#6B7280]">
                      Het is belangrijk om als familie het gesprek te voeren over reanimatie-beleid.
                      Klik op Bewerken om het beleid vast te leggen.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Toegang & accounts */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-gray-900">Toegang en accounts</h2>
            </div>
            <p className="text-sm text-[#6B7280] mb-4">
              Wachtwoorden en toegangsgegevens van Noah worden beheerd in Keeper. Vraag Joas om toegang.
            </p>
            <a
              href={keeperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <ExternalLink size={16} />
              Open Keeper
            </a>
          </Card>
        </motion.div>

        {/* Laatst bijgewerkt */}
        {profiel?.updated_at && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.25 }}
          >
            <p className="text-sm text-gray-400 text-center">
              Laatst bijgewerkt
              {updatedBy ? ` door ${updatedBy.naam}` : ''} op{' '}
              {formatDate(profiel.updated_at)}
            </p>
          </motion.div>
        )}
      </div>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <span className="text-sm text-gray-500">{label}</span>
      <p className="text-gray-900">{value || '\u2014'}</p>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <p className="text-gray-900 whitespace-pre-wrap">
        {value || <span className="text-gray-400">Nog niet ingevuld</span>}
      </p>
    </div>
  )
}

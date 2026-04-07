'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, AlertTriangle, Pill, Users, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NoodinformatieModalProps {
  open: boolean
  onClose: () => void
}

interface ProfielData {
  reanimatie_beleid: string | null
  reanimatie_toelichting: string | null
  medicatielijst_tekst: string | null
  medicatielijst_afbeelding_url: string | null
}

interface NoodcontactData {
  id: string
  naam: string
  functie: string | null
  telefoon: string | null
  nood_volgorde: number
}

function NoodinformatieModalContent({ open, onClose }: NoodinformatieModalProps) {
  const [profiel, setProfiel] = useState<ProfielData | null>(null)
  const [noodcontacten, setNoodcontacten] = useState<NoodcontactData[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      fetchData()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [profielResult, contactenResult] = await Promise.all([
        supabase
          .from('noah_profiel')
          .select('reanimatie_beleid, reanimatie_toelichting, medicatielijst_tekst, medicatielijst_afbeelding_url')
          .single(),
        supabase
          .from('contacten')
          .select('id, naam, functie, telefoon, nood_volgorde')
          .eq('is_noodcontact', true)
          .order('nood_volgorde', { ascending: true }),
      ])

      if (profielResult.data) {
        setProfiel(profielResult.data as unknown as ProfielData)
      }
      if (contactenResult.data) {
        setNoodcontacten(contactenResult.data as unknown as NoodcontactData[])
      }
    } catch (err) {
      console.error('Fout bij laden noodinformatie:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl"
            >
              {/* Red emergency header */}
              <div className="bg-[#DC2626] rounded-t-2xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={22} className="text-white" />
                  <h2 className="text-lg font-bold text-white">Noodinformatie Noah</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-6">
                {loading ? (
                  <div className="py-8 text-center text-[#6B7280] text-lg">
                    Laden...
                  </div>
                ) : (
                  <>
                    {/* Reanimatiebeleid */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={20} className="text-[#DC2626]" />
                        <h3 className="text-lg font-semibold text-gray-900">Reanimatiebeleid</h3>
                      </div>
                      {profiel?.reanimatie_beleid ? (
                        <div className="space-y-2">
                          <p className="text-base text-gray-900 font-medium">
                            {profiel.reanimatie_beleid}
                          </p>
                          {profiel.reanimatie_toelichting && (
                            <p className="text-base text-[#6B7280]">
                              {profiel.reanimatie_toelichting}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-base text-[#6B7280] italic">
                          Nog niet ingesteld — stel in via het Medisch tabblad op de Noah-pagina
                        </p>
                      )}
                    </section>

                    <hr className="border-gray-200" />

                    {/* Medicatielijst */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Pill size={20} className="text-[#4A7C59]" />
                        <h3 className="text-lg font-semibold text-gray-900">Medicatielijst</h3>
                      </div>
                      {profiel?.medicatielijst_tekst || profiel?.medicatielijst_afbeelding_url ? (
                        <div className="space-y-3">
                          {profiel.medicatielijst_tekst && (
                            <p className="text-base text-gray-900 whitespace-pre-wrap">
                              {profiel.medicatielijst_tekst}
                            </p>
                          )}
                          {profiel.medicatielijst_afbeelding_url && (
                            <a
                              href={profiel.medicatielijst_afbeelding_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-base text-[#4A7C59] font-medium hover:underline"
                            >
                              <ExternalLink size={18} />
                              Bekijk medicatielijst apotheek
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-base text-[#6B7280] italic">
                          Nog niet toegevoegd
                        </p>
                      )}
                    </section>

                    <hr className="border-gray-200" />

                    {/* Noodcontacten */}
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={20} className="text-[#C4704F]" />
                        <h3 className="text-lg font-semibold text-gray-900">Noodcontacten</h3>
                      </div>
                      {noodcontacten.length > 0 ? (
                        <div className="space-y-3">
                          {noodcontacten.map((contact, index) => (
                            <div
                              key={contact.id}
                              className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl p-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[#6B7280]">
                                    {index + 1}.
                                  </span>
                                  <p className="text-base font-semibold text-gray-900">
                                    {contact.naam}
                                  </p>
                                </div>
                                {contact.functie && (
                                  <p className="text-base text-[#6B7280] ml-5">
                                    {contact.functie}
                                  </p>
                                )}
                              </div>
                              {contact.telefoon && (
                                <a
                                  href={`tel:${contact.telefoon}`}
                                  className="flex items-center gap-1.5 bg-[#4A7C59] text-white px-3 py-2 rounded-xl text-base font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                                >
                                  <Phone size={18} />
                                  {contact.telefoon}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base text-[#6B7280] italic">
                          Nog niet toegevoegd — stel in via het Contacten tabblad
                        </p>
                      )}
                    </section>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function NoodinformatieModal(props: NoodinformatieModalProps) {
  if (typeof window === 'undefined') return null
  return createPortal(<NoodinformatieModalContent {...props} />, document.body)
}

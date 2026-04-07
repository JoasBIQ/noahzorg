'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface TrelloPageProps {
  currentUserId: string
  isBeheerder: boolean
}

export function TrelloPage({ currentUserId, isBeheerder }: TrelloPageProps) {
  const [trelloUrl, setTrelloUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchUrl = async () => {
      const { data } = await supabase
        .from('app_instellingen')
        .select('value')
        .eq('key', 'trello_board_url')
        .single()
      if (data) {
        setTrelloUrl(data.value)
      }
      setLoading(false)
    }
    fetchUrl()
  }, [supabase])

  const handleOpenTrello = () => {
    if (trelloUrl) {
      window.open(trelloUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted">Laden...</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center py-16 lg:py-24"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4A7C59]/10 mb-6">
          <CheckSquare className="h-8 w-8 text-[#4A7C59]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Taken
        </h1>

        <p className="text-[#6B7280] max-w-md mb-8">
          Taken worden beheerd in Trello. Klik op de knop hieronder om het Trello-bord van Noah te openen.
        </p>

        {trelloUrl ? (
          <Button onClick={handleOpenTrello} className="gap-2 px-8 py-3 text-base">
            <ExternalLink size={20} />
            Open Trello-bord
          </Button>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-sm text-[#C4704F]">
              Er is nog geen Trello-bord URL ingesteld.
            </p>
            {isBeheerder && (
              <p className="text-sm text-[#6B7280]">
                Ga naar Beheer om de Trello-bord URL in te stellen.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

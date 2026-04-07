import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Phase2PlaceholderProps {
  titel: string
  beschrijving?: string
}

export function Phase2Placeholder({ titel, beschrijving }: Phase2PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Clock size={28} className="text-muted" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{titel}</h2>
      <p className="text-sm text-muted max-w-sm">
        {beschrijving || 'Deze functie komt binnenkort beschikbaar. We werken er hard aan om dit voor je klaar te maken!'}
      </p>
    </div>
  )
}

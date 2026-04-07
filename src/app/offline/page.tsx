import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
          <WifiOff className="w-8 h-8 text-muted" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Geen verbinding</h1>
        <p className="text-muted max-w-xs mx-auto">
          Je bent offline. Controleer je internetverbinding en probeer het opnieuw.
        </p>
      </div>
    </div>
  )
}

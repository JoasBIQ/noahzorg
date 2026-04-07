'use client'

import { useState, useEffect } from 'react'
import { Search, FileText, Video, File, X, AlertCircle, FolderOpen } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatRelative } from '@/lib/utils'
import type { DriveFile } from '@/types'

interface DriveFilePickerProps {
  mode: 'verslag' | 'opname' | 'bestand' | 'afbeelding'
  /** Drive folder-ID om direct in te openen (optioneel — valt terug op root) */
  folderId?: string | null
  onSelect: (file: DriveFile) => void
  onClose: () => void
}

function getMimeIcon(mimeType: string) {
  if (mimeType.includes('video') || mimeType.includes('audio')) {
    return <Video size={16} className="text-purple-500" />
  }
  if (
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('pdf') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    return <FileText size={16} className="text-blue-500" />
  }
  if (mimeType === 'application/vnd.google-apps.folder') {
    return <FolderOpen size={16} className="text-yellow-500" />
  }
  return <File size={16} className="text-gray-400" />
}

const MODE_TITLES: Record<DriveFilePickerProps['mode'], string> = {
  verslag: 'Koppel verslag uit Drive',
  opname: 'Koppel opname uit Drive',
  bestand: 'Kies bestand uit Drive',
  afbeelding: 'Kies afbeelding uit Drive',
}

export function DriveFilePicker({ mode, folderId, onSelect, onClose }: DriveFilePickerProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const buildUrl = (query?: string) => {
    if (query) {
      // Globale zoekopdracht — negeer folderId
      return `/api/drive?search=${encodeURIComponent(query)}`
    }
    if (folderId) {
      return `/api/drive?folderId=${encodeURIComponent(folderId)}`
    }
    return '/api/drive'
  }

  const fetchFiles = async (query?: string) => {
    try {
      const response = await fetch(buildUrl(query))
      const data = await response.json()

      if (data.error === 'not_connected' || data.error === 'token_expired') {
        setError(data.error === 'token_expired' ? 'Drive koppeling verlopen. Koppel opnieuw via Beheer.' : 'Drive-koppeling niet geconfigureerd')
        setFiles([])
      } else if (data.files) {
        setFiles(data.files as DriveFile[])
        setError('')
      } else {
        setFiles([])
        setError('')
      }
    } catch {
      setError('Drive-koppeling niet geconfigureerd')
      setFiles([])
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchFiles().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId])

  const handleSearch = async () => {
    setSearching(true)
    await fetchFiles(searchQuery.trim() || undefined)
    setSearching(false)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <Modal open onClose={onClose} title={MODE_TITLES[mode]}>
      {loading ? (
        <div className="py-8 text-center text-sm text-[#6B7280]">Laden...</div>
      ) : error ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} className="text-orange-500" />
          </div>
          <p className="text-sm text-[#6B7280]">{error}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Zoekbalk */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Zoek in Drive..."
                className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20 focus:border-[#4A7C59] transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="rounded-lg bg-[#4A7C59]/10 px-3 py-1.5 text-sm font-medium text-[#4A7C59] hover:bg-[#4A7C59]/20 transition-colors disabled:opacity-50"
            >
              {searching ? 'Zoeken...' : 'Zoek'}
            </button>
          </div>

          {/* Bestandenlijst */}
          {files.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#6B7280]">
              Geen bestanden gevonden.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onSelect(file)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  {getMimeIcon(file.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-[#6B7280]">
                      {formatRelative(file.modifiedTime)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Annuleren */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

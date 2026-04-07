'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FileText,
  Image,
  Film,
  Music,
  File,
  ChevronRight,
  Home,
  Search,
  FolderPlus,
  ExternalLink,
  Loader2,
  HardDrive,
  Settings,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/types'

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size: string | null
  webViewLink: string | null
  iconLink: string | null
  parents: string[] | null
}

interface BreadcrumbItem {
  id: string
  name: string
}

interface Props {
  currentProfile: Profile
  rootFolderId: string | null
}

const MIME_FOLDER = 'application/vnd.google-apps.folder'

function getFileIcon(mimeType: string) {
  if (mimeType === MIME_FOLDER) return <Folder className="h-5 w-5 text-[#4A7C59]" />
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-pink-500" />
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('text')
  ) {
    return <FileText className="h-5 w-5 text-orange-500" />
  }
  return <File className="h-5 w-5 text-gray-400" />
}

function formatSize(bytes: string | null): string {
  if (!bytes) return '—'
  const n = parseInt(bytes, 10)
  if (isNaN(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SuggestedStructure() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
      <p className="mb-2 font-medium text-gray-700">Aanbevolen mappenstructuur:</p>
      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-500">
{`📁 Noahs Zorg
├── 📁 Medisch
│   ├── 📁 Brieven & rapporten
│   ├── 📁 Uitslagen
│   └── 📁 Recepten
├── 📁 Juridisch & financieel
│   ├── 📁 Indicaties
│   └── 📁 Facturen
├── 📁 Zorgplan
└── 📁 Foto's & video's`}
      </pre>
    </div>
  )
}

export function DriveContent({ currentProfile, rootFolderId }: Props) {
  const isAdmin = currentProfile?.rol === 'beheerder'

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(rootFolderId)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [files, setFiles] = useState<GoogleDriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [notConnected, setNotConnected] = useState(false)
  const [showNewFolderForm, setShowNewFolderForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchFiles = useCallback(
    async (folderId: string | null, searchTerm?: string) => {
      setLoading(true)
      setNotConnected(false)
      try {
        const params = new URLSearchParams()
        if (searchTerm) {
          params.set('search', searchTerm)
        } else if (folderId) {
          params.set('folderId', folderId)
        }

        const res = await fetch(`/api/drive?${params.toString()}`)
        const data = await res.json()

        if (data.error === 'not_connected' || data.error === 'token_expired') {
          setNotConnected(true)
          setFiles([])
          return
        }

        setFiles(data.files ?? [])
      } catch {
        setNotConnected(true)
        setFiles([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Initial load
  useEffect(() => {
    if (rootFolderId) {
      fetchFiles(rootFolderId)
    }
  }, [rootFolderId, fetchFiles])

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (search.trim()) {
      searchDebounceRef.current = setTimeout(() => {
        fetchFiles(null, search.trim())
      }, 300)
    } else {
      fetchFiles(currentFolderId)
    }

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function navigateIntoFolder(folder: GoogleDriveFile) {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
    setSearch('')
    fetchFiles(folder.id)
  }

  function navigateToBreadcrumb(index: number) {
    const crumb = breadcrumbs[index]
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
    setBreadcrumbs(newBreadcrumbs)
    setCurrentFolderId(crumb.id)
    setSearch('')
    fetchFiles(crumb.id)
  }

  function navigateToRoot() {
    setBreadcrumbs([])
    setCurrentFolderId(rootFolderId)
    setSearch('')
    if (rootFolderId) fetchFiles(rootFolderId)
  }

  function handleFileClick(file: GoogleDriveFile) {
    if (file.mimeType === MIME_FOLDER) {
      navigateIntoFolder(file)
    } else if (file.webViewLink) {
      window.open(file.webViewLink, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim() || !currentFolderId) return
    setCreatingFolder(true)
    setFolderError(null)
    try {
      const res = await fetch('/api/drive/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFolderError(data.error ?? 'Map aanmaken mislukt.')
        return
      }
      setNewFolderName('')
      setShowNewFolderForm(false)
      fetchFiles(currentFolderId)
    } catch {
      setFolderError('Netwerkfout bij aanmaken map.')
    } finally {
      setCreatingFolder(false)
    }
  }

  // Sort: folders first, then files
  const sorted = [...files].sort((a, b) => {
    const aIsFolder = a.mimeType === MIME_FOLDER ? 0 : 1
    const bIsFolder = b.mimeType === MIME_FOLDER ? 0 : 1
    if (aIsFolder !== bIsFolder) return aIsFolder - bIsFolder
    return a.name.localeCompare(b.name, 'nl')
  })

  // --- Not connected state ---
  if (notConnected && !loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Drive</h1>
        </div>
        <Card className="max-w-xl">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-gray-100 p-4">
              <HardDrive className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Verbind Gmail om Google Drive te gebruiken
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Drive gebruikt dezelfde Google-verbinding als Gmail. Koppel het account eenmalig in Beheer.
              </p>
            </div>
            <a
              href="/beheer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#4A7C59] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3d6849] transition-colors"
            >
              <Settings className="h-4 w-4" />
              Ga naar Beheer
            </a>
            <SuggestedStructure />
          </div>
        </Card>
      </div>
    )
  }

  // --- No root folder configured ---
  if (!rootFolderId && !loading && !notConnected) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Drive</h1>
        </div>
        <Card className="max-w-xl">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-amber-50 p-4">
              <Folder className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Root map nog niet ingesteld</p>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin
                  ? 'Stel de Google Drive root map ID in via Beheer → Instellingen (drive_root_folder_id).'
                  : 'De beheerder heeft nog geen root map ingesteld voor Drive.'}
              </p>
            </div>
            {isAdmin && (
              <a
                href="/beheer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4A7C59] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3d6849] transition-colors"
              >
                <Settings className="h-4 w-4" />
                Ga naar Beheer
              </a>
            )}
            <SuggestedStructure />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Drive</h1>
        {isAdmin && currentFolderId && !search && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowNewFolderForm((v) => !v)
              setFolderError(null)
              setNewFolderName('')
            }}
          >
            <FolderPlus className="mr-1.5 h-4 w-4" />
            Nieuwe map
          </Button>
        )}
      </div>

      {/* Breadcrumbs */}
      {!search && (
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-500">
          <button
            onClick={navigateToRoot}
            className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors ${
                  i === breadcrumbs.length - 1
                    ? 'font-medium text-[#4A7C59]'
                    : ''
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek bestanden..."
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-9 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20 focus:border-[#4A7C59] transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* New folder form */}
      <AnimatePresence>
        {showNewFolderForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <Card className="border border-[#4A7C59]/20">
              <div className="flex items-center gap-3">
                <FolderPlus className="h-5 w-5 flex-shrink-0 text-[#4A7C59]" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') {
                      setShowNewFolderForm(false)
                      setNewFolderName('')
                    }
                  }}
                  placeholder="Naam van de nieuwe map"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20 focus:border-[#4A7C59]"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || creatingFolder}
                >
                  {creatingFolder ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Aanmaken'
                  )}
                </Button>
                <button
                  onClick={() => {
                    setShowNewFolderForm(false)
                    setNewFolderName('')
                    setFolderError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {folderError && (
                <p className="mt-2 text-sm text-red-600">{folderError}</p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-16"
        >
          <Loader2 className="h-6 w-6 animate-spin text-[#4A7C59]" />
        </motion.div>
      )}

      {/* File list */}
      {!loading && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFolderId ?? 'root'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {sorted.length === 0 ? (
              <Card>
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-gray-100 p-3">
                    <Folder className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">
                    {search
                      ? `Geen bestanden gevonden voor "${search}"`
                      : 'Deze map is leeg'}
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Desktop: tabel */}
                <div className="hidden md:block">
                  <Card className="overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-4 py-3 text-left font-medium text-gray-500">
                            Naam
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">
                            Gewijzigd
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">
                            Grootte
                          </th>
                          <th className="w-10 px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((file, i) => {
                          const isFolder = file.mimeType === MIME_FOLDER
                          return (
                            <motion.tr
                              key={file.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              onClick={() => handleFileClick(file)}
                              className={`border-b border-gray-50 last:border-0 transition-colors ${
                                isFolder
                                  ? 'cursor-pointer hover:bg-[#4A7C59]/5'
                                  : file.webViewLink
                                  ? 'cursor-pointer hover:bg-gray-50'
                                  : 'cursor-default'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(file.mimeType)}
                                  <span
                                    className={`font-medium ${
                                      isFolder
                                        ? 'text-gray-900'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {file.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {formatDate(file.modifiedTime)}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {isFolder ? '—' : formatSize(file.size)}
                              </td>
                              <td className="px-4 py-3">
                                {!isFolder && file.webViewLink && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(
                                        file.webViewLink!,
                                        '_blank',
                                        'noopener,noreferrer'
                                      )
                                    }}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#4A7C59] transition-colors"
                                    title="Openen in Google Drive"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </Card>
                </div>

                {/* Mobiel: kaartjes */}
                <div className="grid gap-2 md:hidden">
                  {sorted.map((file, i) => {
                    const isFolder = file.mimeType === MIME_FOLDER
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Card
                          className={`cursor-pointer transition-colors active:bg-gray-50 ${
                            isFolder ? 'hover:border-[#4A7C59]/30' : ''
                          }`}
                        >
                          <button
                            className="flex w-full items-center gap-3 text-left"
                            onClick={() => handleFileClick(file)}
                          >
                            <div className="flex-shrink-0">
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-gray-900">
                                {file.name}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {formatDate(file.modifiedTime)}
                                {!isFolder && file.size && (
                                  <> · {formatSize(file.size)}</>
                                )}
                              </p>
                            </div>
                            {!isFolder && file.webViewLink && (
                              <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            )}
                            {isFolder && (
                              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            )}
                          </button>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FolderPlus,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  File,
  ChevronRight,
  Home,
  Search,
  Loader2,
  HardDrive,
  Settings,
  X,
  Upload,
  LayoutGrid,
  List,
  MoreVertical,
  Trash2,
  FolderInput,
  Download,
  Check,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/types'
import { DriveContextMenu } from './drive-context-menu'
import { DriveRenameDialog } from './drive-rename-dialog'
import { DriveMoveDialog } from './drive-move-dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size: string | null
  webViewLink: string | null
  iconLink: string | null
  parents: string[] | null
  thumbnailLink: string | null
}

interface BreadcrumbItem {
  id: string
  name: string
}

interface UploadItem {
  name: string
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface Props {
  currentProfile: Profile
  rootFolderId: string | null
}

type SortKey = 'name' | 'modified' | 'size'
type ViewMode = 'list' | 'grid'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MIME_FOLDER = 'application/vnd.google-apps.folder'

function getFileIcon(mimeType: string, cls = 'h-5 w-5') {
  if (mimeType === MIME_FOLDER)
    return <Folder className={`${cls} text-[#4A7C59]`} />
  if (mimeType.startsWith('image/'))
    return <ImageIcon className={`${cls} text-blue-500`} />
  if (mimeType.startsWith('video/'))
    return <Film className={`${cls} text-purple-500`} />
  if (mimeType.startsWith('audio/'))
    return <Music className={`${cls} text-pink-500`} />
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('text') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  )
    return <FileText className={`${cls} text-orange-500`} />
  return <File className={`${cls} text-gray-400`} />
}

function formatSize(bytes: string | null): string {
  if (!bytes) return '—'
  const n = parseInt(bytes, 10)
  if (isNaN(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
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
        {`📁 Noahs Zorg\n├── 📁 Medisch\n│   ├── 📁 Brieven & rapporten\n│   ├── 📁 Uitslagen\n│   └── 📁 Recepten\n├── 📁 Juridisch & financieel\n│   ├── 📁 Indicaties\n│   └── 📁 Facturen\n├── 📁 Zorgplan\n└── 📁 Foto's & video's`}
      </pre>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DriveContent({ currentProfile, rootFolderId }: Props) {
  const isAdmin = currentProfile?.rol === 'beheerder'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Core
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(rootFolderId)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [files, setFiles] = useState<GoogleDriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [notConnected, setNotConnected] = useState(false)

  // Folder creation
  const [showNewFolderForm, setShowNewFolderForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

  // View & sort
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    file: GoogleDriveFile
    x: number
    y: number
  } | null>(null)

  // Dialogs
  const [renameFile, setRenameFile] = useState<GoogleDriveFile | null>(null)
  const [moveFiles, setMoveFiles] = useState<GoogleDriveFile[] | null>(null)

  // Upload
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])

  // Feedback
  const [shareToast, setShareToast] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sluit contextmenu bij scrollen
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [contextMenu])

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchFiles = useCallback(
    async (folderId: string | null, searchTerm?: string) => {
      setLoading(true)
      setNotConnected(false)
      setSelectedIds(new Set())
      try {
        const params = new URLSearchParams()
        if (searchTerm) params.set('search', searchTerm)
        else if (folderId) params.set('folderId', folderId)

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

  useEffect(() => {
    if (rootFolderId) fetchFiles(rootFolderId)
  }, [rootFolderId, fetchFiles])

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (search.trim()) {
      searchDebounceRef.current = setTimeout(
        () => fetchFiles(null, search.trim()),
        300
      )
    } else {
      fetchFiles(currentFolderId)
    }
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // ── Sort ──────────────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    return [...files].sort((a, b) => {
      const af = a.mimeType === MIME_FOLDER ? 0 : 1
      const bf = b.mimeType === MIME_FOLDER ? 0 : 1
      if (af !== bf) return af - bf
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'nl')
      else if (sortBy === 'modified')
        cmp = a.modifiedTime.localeCompare(b.modifiedTime)
      else if (sortBy === 'size')
        cmp = (parseInt(a.size ?? '0') || 0) - (parseInt(b.size ?? '0') || 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [files, sortBy, sortDir])

  const selectedFiles = useMemo(
    () => sorted.filter((f) => selectedIds.has(f.id)),
    [sorted, selectedIds]
  )

  function toggleSort(by: SortKey) {
    if (sortBy === by) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(by)
      setSortDir('asc')
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortBy !== column)
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#4A7C59]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#4A7C59]" />
    )
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function navigateIntoFolder(folder: GoogleDriveFile) {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
    setSearch('')
    fetchFiles(folder.id)
  }

  function navigateToBreadcrumb(index: number) {
    const crumb = breadcrumbs[index]
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
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

  // ── File click ────────────────────────────────────────────────────────────

  function handleFileClick(file: GoogleDriveFile, e?: React.MouseEvent) {
    if (e && (e.metaKey || e.ctrlKey)) {
      toggleSelect(file.id)
      return
    }
    if (file.mimeType === MIME_FOLDER) navigateIntoFolder(file)
    else if (file.webViewLink)
      window.open(file.webViewLink, '_blank', 'noopener,noreferrer')
  }

  // ── Folder creation ───────────────────────────────────────────────────────

  async function handleCreateFolder() {
    if (!newFolderName.trim() || !currentFolderId) return
    setCreatingFolder(true)
    setFolderError(null)
    try {
      const res = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
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

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleUpload(fileList: FileList | File[]) {
    const filesToUpload = Array.from(fileList)
    if (!filesToUpload.length) return
    setUploadItems(
      filesToUpload.map((f) => ({ name: f.name, status: 'uploading' as const }))
    )
    setActionError(null)
    try {
      const formData = new FormData()
      filesToUpload.forEach((f) => formData.append('files', f))
      if (currentFolderId) formData.append('parentId', currentFolderId)

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setUploadItems((prev) =>
          prev.map((i) => ({
            ...i,
            status: 'error' as const,
            error: data.error ?? 'Upload mislukt',
          }))
        )
        return
      }

      setUploadItems((prev) =>
        prev.map((i) => ({ ...i, status: 'done' as const }))
      )
      fetchFiles(currentFolderId)
      setTimeout(() => setUploadItems([]), 3000)
    } catch {
      setUploadItems((prev) =>
        prev.map((i) => ({ ...i, status: 'error' as const, error: 'Netwerkfout' }))
      )
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Download ──────────────────────────────────────────────────────────────

  function handleDownload(file: GoogleDriveFile) {
    const a = document.createElement('a')
    a.href = `/api/drive/${file.id}/download`
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  async function handleCopy(file: GoogleDriveFile) {
    setActionError(null)
    try {
      const res = await fetch(`/api/drive/${file.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: file.parents?.[0] ?? currentFolderId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Kopiëren mislukt.')
      fetchFiles(currentFolderId)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Kopiëren mislukt.')
    }
  }

  // ── Share ─────────────────────────────────────────────────────────────────

  async function handleShare(file: GoogleDriveFile) {
    if (!file.webViewLink) return
    try {
      await navigator.clipboard.writeText(file.webViewLink)
      setShareToast(file.name)
      setTimeout(() => setShareToast(null), 2500)
    } catch {
      setActionError('Clipboard niet beschikbaar.')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(file: GoogleDriveFile) {
    if (!isAdmin) return
    setActionError(null)
    try {
      const res = await fetch(`/api/drive/${file.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verwijderen mislukt.')
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      setSelectedIds((prev) => {
        const n = new Set(prev)
        n.delete(file.id)
        return n
      })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Verwijderen mislukt.')
    }
  }

  // ── Rename callback ───────────────────────────────────────────────────────

  function handleRenamed(updated: GoogleDriveFile) {
    setFiles((prev) =>
      prev.map((f) => (f.id === updated.id ? { ...f, name: updated.name } : f))
    )
    setRenameFile(null)
  }

  // ── Move callback ─────────────────────────────────────────────────────────

  function handleMoved() {
    setMoveFiles(null)
    setSelectedIds(new Set())
    fetchFiles(currentFolderId)
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function selectAll() {
    setSelectedIds(new Set(sorted.map((f) => f.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  async function handleBulkDelete() {
    if (!isAdmin) return
    for (const file of selectedFiles) {
      await handleDelete(file)
    }
  }

  function handleBulkDownload() {
    selectedFiles
      .filter((f) => f.mimeType !== MIME_FOLDER)
      .forEach(handleDownload)
  }

  // ── Context menu helpers ──────────────────────────────────────────────────

  function openContextMenu(e: React.MouseEvent, file: GoogleDriveFile) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ file, x: e.clientX, y: e.clientY })
  }

  function openContextMenuAtButton(e: React.MouseEvent, file: GoogleDriveFile) {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setContextMenu({ file, x: rect.left, y: rect.bottom + 4 })
  }

  // ── Drag & drop (OS → upload) ─────────────────────────────────────────────

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragOver(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragOver(false)
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // State: Not connected
  // ─────────────────────────────────────────────────────────────────────────

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
                Drive gebruikt dezelfde Google-verbinding als Gmail. Koppel het
                account eenmalig in Beheer.
              </p>
            </div>
            <a
              href="/beheer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#4A7C59] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3d6849]"
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

  // ─────────────────────────────────────────────────────────────────────────
  // State: No root folder
  // ─────────────────────────────────────────────────────────────────────────

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
              <p className="font-semibold text-gray-900">
                Root map nog niet ingesteld
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin
                  ? 'Stel de Google Drive root map ID in via Beheer → Instellingen (drive_root_folder_id).'
                  : 'De beheerder heeft nog geen root map ingesteld voor Drive.'}
              </p>
            </div>
            {isAdmin && (
              <a
                href="/beheer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4A7C59] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3d6849]"
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

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative min-h-screen p-4 lg:p-6"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Drag-over overlay ── */}
      <AnimatePresence>
        {isDragOver && currentFolderId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#4A7C59]/10 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#4A7C59] bg-white/90 px-14 py-10 shadow-xl">
              <Upload className="h-10 w-10 text-[#4A7C59]" />
              <p className="text-lg font-semibold text-[#4A7C59]">
                Bestanden uploaden
              </p>
              <p className="text-sm text-gray-500">
                Laat los om te uploaden naar de huidige map
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Share toast ── */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg"
          >
            <Check className="h-4 w-4 text-green-400" />
            Link gekopieerd!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUpload(e.target.files)
        }}
      />

      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Drive</h1>
        <div className="flex items-center gap-2">
          {/* Upload — iedereen */}
          {currentFolderId && !search && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload
            </Button>
          )}
          {/* Nieuwe map — alleen beheerder */}
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
          {/* Vernieuwen */}
          <button
            onClick={() => fetchFiles(currentFolderId)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Vernieuwen"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {/* Weergave toggle */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#4A7C59] text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Lijstweergave"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#4A7C59] text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Rasterweergave"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Breadcrumbs ── */}
      {!search && (
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-500">
          <button
            onClick={navigateToRoot}
            className="flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`rounded-lg px-2 py-1 transition-colors hover:bg-gray-100 ${
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

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek bestanden…"
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-9 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20"
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

      {/* ── Nieuwe map formulier ── */}
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
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20"
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

      {/* ── Bulk toolbar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#4A7C59]/20 bg-[#4A7C59]/10 px-4 py-2.5">
              <span className="mr-1 text-sm font-medium text-[#4A7C59]">
                {selectedIds.size} geselecteerd
              </span>
              <button
                onClick={handleBulkDownload}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <Download className="h-3.5 w-3.5" />
                Downloaden
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => setMoveFiles(selectedFiles)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <FolderInput className="h-3.5 w-3.5" />
                    Verplaatsen
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Verwijderen
                  </button>
                </>
              )}
              <button
                onClick={clearSelection}
                className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
                Deselecteren
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload progress ── */}
      <AnimatePresence>
        {uploadItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-4 py-2.5">
              <p className="text-xs font-medium text-gray-600">
                Bestand uploaden…
              </p>
            </div>
            <ul className="divide-y divide-gray-50 px-4">
              {uploadItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  {item.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#4A7C59]" />
                  )}
                  {item.status === 'done' && (
                    <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                  )}
                  {item.status === 'error' && (
                    <X className="h-4 w-4 flex-shrink-0 text-red-500" />
                  )}
                  <span className="flex-1 truncate text-gray-700">
                    {item.name}
                  </span>
                  {item.error && (
                    <span className="text-xs text-red-500">{item.error}</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actiefout ── */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="flex-1 text-sm text-red-700">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading ── */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-16"
        >
          <Loader2 className="h-6 w-6 animate-spin text-[#4A7C59]" />
        </motion.div>
      )}

      {/* ── Bestandenlijst ── */}
      {!loading && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentFolderId ?? 'root'}-${viewMode}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {sorted.length === 0 ? (
              /* Leeg */
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
                  {!search && currentFolderId && (
                    <p className="text-xs text-gray-400">
                      Sleep bestanden hierheen of gebruik de Upload-knop
                    </p>
                  )}
                </div>
              </Card>
            ) : viewMode === 'list' ? (
              /* ══════ LIJSTWEERGAVE ══════ */
              <>
                {/* Desktop: tabel */}
                <div className="hidden md:block">
                  <Card className="overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate =
                                    selectedIds.size > 0 &&
                                    selectedIds.size < sorted.length
                                }
                              }}
                              checked={
                                sorted.length > 0 &&
                                selectedIds.size === sorted.length
                              }
                              onChange={(e) =>
                                e.target.checked ? selectAll() : clearSelection()
                              }
                              className="h-4 w-4 cursor-pointer rounded accent-[#4A7C59]"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">
                            <button
                              onClick={() => toggleSort('name')}
                              className="flex items-center gap-1.5 hover:text-gray-700"
                            >
                              Naam
                              <SortIcon column="name" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">
                            <button
                              onClick={() => toggleSort('modified')}
                              className="flex items-center gap-1.5 hover:text-gray-700"
                            >
                              Gewijzigd
                              <SortIcon column="modified" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">
                            <button
                              onClick={() => toggleSort('size')}
                              className="flex items-center gap-1.5 hover:text-gray-700"
                            >
                              Grootte
                              <SortIcon column="size" />
                            </button>
                          </th>
                          <th className="w-10 px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((file, i) => {
                          const isFolder = file.mimeType === MIME_FOLDER
                          const isSelected = selectedIds.has(file.id)
                          return (
                            <motion.tr
                              key={file.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.02 }}
                              onClick={(e) => handleFileClick(file, e)}
                              onContextMenu={(e) => openContextMenu(e, file)}
                              className={`group cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                                isSelected
                                  ? 'bg-[#4A7C59]/5'
                                  : isFolder
                                    ? 'hover:bg-[#4A7C59]/5'
                                    : 'hover:bg-gray-50'
                              }`}
                            >
                              <td
                                className="px-4 py-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(file.id)}
                                  className="h-4 w-4 cursor-pointer rounded accent-[#4A7C59]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(file.mimeType)}
                                  <span
                                    className={`font-medium ${isFolder ? 'text-gray-900' : 'text-gray-700'}`}
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
                              <td
                                className="px-4 py-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) =>
                                    openContextMenuAtButton(e, file)
                                  }
                                  className="rounded p-1 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
                                  title="Meer opties"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
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
                    const isSelected = selectedIds.has(file.id)
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onContextMenu={(e) => openContextMenu(e, file)}
                      >
                        <Card
                          className={`transition-colors ${isSelected ? 'border-[#4A7C59]/30 bg-[#4A7C59]/5' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSelect(file.id)
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(file.id)}
                                className="h-4 w-4 cursor-pointer rounded accent-[#4A7C59]"
                              />
                            </div>
                            <button
                              className="flex flex-1 items-center gap-3 text-left"
                              onClick={(e) =>
                                handleFileClick(
                                  file,
                                  e as unknown as React.MouseEvent
                                )
                              }
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
                            </button>
                            <button
                              onClick={(e) => openContextMenuAtButton(e, file)}
                              className="flex-shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </>
            ) : (
              /* ══════ RASTERWEERGAVE ══════ */
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {sorted.map((file, i) => {
                  const isSelected = selectedIds.has(file.id)
                  const hasThumb =
                    !!file.thumbnailLink && file.mimeType.startsWith('image/')
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={(e) => handleFileClick(file, e)}
                      onContextMenu={(e) => openContextMenu(e, file)}
                      className={`group relative cursor-pointer rounded-xl border p-3 transition-all ${
                        isSelected
                          ? 'border-[#4A7C59] bg-[#4A7C59]/5 shadow-sm'
                          : 'border-gray-200 hover:border-[#4A7C59]/30 hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`absolute left-2 top-2 transition-opacity ${
                          isSelected || selectedIds.size > 0
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(file.id)
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(file.id)}
                          className="h-4 w-4 cursor-pointer rounded accent-[#4A7C59]"
                        />
                      </div>
                      {/* Drie puntjes */}
                      <div
                        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => openContextMenuAtButton(e, file)}
                          className="rounded-md p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Icoon of miniatuur */}
                      <div className="mb-2 flex justify-center pb-1 pt-3">
                        {hasThumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.thumbnailLink!}
                            alt={file.name}
                            className="h-16 w-16 rounded-lg object-cover shadow-sm"
                          />
                        ) : (
                          getFileIcon(file.mimeType, 'h-12 w-12')
                        )}
                      </div>
                      {/* Naam */}
                      <p className="line-clamp-2 text-center text-xs font-medium leading-tight text-gray-700">
                        {file.name}
                      </p>
                      {/* Datum bij hover */}
                      <p className="mt-1 text-center text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                        {formatDate(file.modifiedTime)}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Context menu ── */}
      {contextMenu && (
        <DriveContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          isAdmin={isAdmin}
          onClose={() => setContextMenu(null)}
          onOpen={() => handleFileClick(contextMenu.file)}
          onDownload={() => handleDownload(contextMenu.file)}
          onRename={() => setRenameFile(contextMenu.file)}
          onMove={() => setMoveFiles([contextMenu.file])}
          onCopy={() => handleCopy(contextMenu.file)}
          onDelete={() => handleDelete(contextMenu.file)}
          onShare={() => handleShare(contextMenu.file)}
        />
      )}

      {/* ── Hernoemen dialoog ── */}
      {renameFile && (
        <DriveRenameDialog
          file={renameFile}
          onClose={() => setRenameFile(null)}
          onRenamed={handleRenamed}
        />
      )}

      {/* ── Verplaatsen dialoog ── */}
      {moveFiles && (
        <DriveMoveDialog
          files={moveFiles}
          rootFolderId={rootFolderId}
          onClose={() => setMoveFiles(null)}
          onMoved={handleMoved}
        />
      )}
    </div>
  )
}

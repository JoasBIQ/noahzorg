'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Folder,
  ChevronRight,
  Home,
  Loader2,
  X,
  FolderInput,
} from 'lucide-react'
import type { GoogleDriveFile } from './drive-content'

const MIME_FOLDER = 'application/vnd.google-apps.folder'

interface BreadcrumbItem {
  id: string
  name: string
}

interface Props {
  files: GoogleDriveFile[]
  rootFolderId: string | null
  onClose: () => void
  onMoved: () => void
}

export function DriveMoveDialog({ files, rootFolderId, onClose, onMoved }: Props) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    rootFolderId
  )
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [folders, setFolders] = useState<GoogleDriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileIds = new Set(files.map((f) => f.id))

  const fetchFolders = useCallback(
    async (folderId: string | null) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (folderId) params.set('folderId', folderId)
        const res = await fetch(`/api/drive?${params.toString()}`)
        const data = await res.json()
        const onlyFolders = ((data.files ?? []) as GoogleDriveFile[])
          .filter((f) => f.mimeType === MIME_FOLDER && !fileIds.has(f.id))
        setFolders(onlyFolders)
      } catch {
        setError('Mappen laden mislukt.')
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files]
  )

  useEffect(() => {
    fetchFolders(rootFolderId)
  }, [rootFolderId, fetchFolders])

  function navigateInto(folder: GoogleDriveFile) {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
    fetchFolders(folder.id)
  }

  function navigateToBreadcrumb(index: number) {
    const crumb = breadcrumbs[index]
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    setCurrentFolderId(crumb.id)
    fetchFolders(crumb.id)
  }

  function navigateToRoot() {
    setBreadcrumbs([])
    setCurrentFolderId(rootFolderId)
    fetchFolders(rootFolderId)
  }

  async function handleMove() {
    if (!currentFolderId) return
    setMoving(true)
    setError(null)
    try {
      for (const file of files) {
        const removeParentId = file.parents?.[0]
        const body: Record<string, string> = { parentId: currentFolderId }
        if (removeParentId && removeParentId !== currentFolderId) {
          body.removeParentId = removeParentId
        }
        const res = await fetch(`/api/drive/${file.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Verplaatsen mislukt.')
        }
      }
      onMoved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verplaatsen mislukt.')
    } finally {
      setMoving(false)
    }
  }

  const currentLabel =
    breadcrumbs.length > 0
      ? breadcrumbs[breadcrumbs.length - 1].name
      : 'Home'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-[#4A7C59]" />
            <h3 className="font-semibold text-gray-900">
              Verplaatsen naar
              {files.length > 1 && (
                <span className="ml-1 text-sm font-normal text-gray-400">
                  ({files.length} items)
                </span>
              )}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
            <button
              onClick={navigateToRoot}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-200 transition-colors"
            >
              <Home className="h-3 w-3" />
              <span>Home</span>
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-300" />
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`rounded px-1.5 py-0.5 hover:bg-gray-200 transition-colors ${
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
        </div>

        {/* Mappenlijst */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#4A7C59]" />
            </div>
          ) : folders.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Geen submappen
            </p>
          ) : (
            <ul className="divide-y divide-gray-50 py-1">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <button
                    onClick={() => navigateInto(folder)}
                    className="flex w-full items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-3">
                      <Folder className="h-4 w-4 text-[#4A7C59]" />
                      <span className="text-gray-700">{folder.name}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="mx-5 mt-1 text-sm text-red-600">{error}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500">
            Verplaatsen naar:{' '}
            <span className="font-medium text-gray-700">{currentLabel}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              Annuleren
            </button>
            <button
              onClick={handleMove}
              disabled={moving || !currentFolderId}
              className="flex items-center gap-2 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3d6849] disabled:opacity-50"
            >
              {moving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Verplaatsen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

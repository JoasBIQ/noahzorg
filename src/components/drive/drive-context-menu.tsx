'use client'

import { useEffect, useRef } from 'react'
import {
  ExternalLink,
  Download,
  Pencil,
  FolderInput,
  Copy,
  Trash2,
  Share2,
  Folder,
} from 'lucide-react'
import type { GoogleDriveFile } from './drive-content'

const MIME_FOLDER = 'application/vnd.google-apps.folder'

interface Props {
  x: number
  y: number
  file: GoogleDriveFile
  isAdmin: boolean
  onClose: () => void
  onOpen: () => void
  onDownload: () => void
  onRename: () => void
  onMove: () => void
  onCopy: () => void
  onDelete: () => void
  onShare: () => void
}

interface MenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

type MenuRow = MenuItem | { separator: true }

export function DriveContextMenu({
  x,
  y,
  file,
  isAdmin,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onDelete,
  onShare,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const isFolder = file.mimeType === MIME_FOLDER

  // Sluiten bij klik buiten menu of Escape
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Positie bijstellen zodat het menu binnen het scherm blijft
  const menuWidth = 200
  const menuHeight = 280
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8)

  const rows: MenuRow[] = [
    {
      label: isFolder ? 'Openen' : 'Openen in Drive',
      icon: isFolder ? (
        <Folder className="h-4 w-4" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      ),
      onClick: () => {
        onOpen()
        onClose()
      },
    },
    ...(!isFolder
      ? [
          {
            label: 'Downloaden',
            icon: <Download className="h-4 w-4" />,
            onClick: () => {
              onDownload()
              onClose()
            },
          } as MenuItem,
        ]
      : []),
    { separator: true as const },
    ...(isAdmin
      ? [
          {
            label: 'Hernoemen',
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              onRename()
              onClose()
            },
          } as MenuItem,
          {
            label: 'Verplaatsen naar',
            icon: <FolderInput className="h-4 w-4" />,
            onClick: () => {
              onMove()
              onClose()
            },
          } as MenuItem,
        ]
      : []),
    {
      label: 'Kopiëren',
      icon: <Copy className="h-4 w-4" />,
      onClick: () => {
        onCopy()
        onClose()
      },
      disabled: isFolder,
    },
    { separator: true as const },
    {
      label: 'Delen (kopieer link)',
      icon: <Share2 className="h-4 w-4" />,
      onClick: () => {
        onShare()
        onClose()
      },
      disabled: !file.webViewLink,
    },
    ...(isAdmin
      ? [
          { separator: true as const },
          {
            label: 'Verwijderen',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => {
              onDelete()
              onClose()
            },
            danger: true,
          } as MenuItem,
        ]
      : []),
  ]

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: adjustedY,
        left: adjustedX,
      }}
      className="min-w-[190px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
    >
      {rows.map((row, i) => {
        if ('separator' in row) {
          return <div key={`sep-${i}`} className="my-1 border-t border-gray-100" />
        }
        return (
          <button
            key={row.label}
            onClick={row.onClick}
            disabled={row.disabled}
            className={`flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors disabled:cursor-default disabled:opacity-40 ${
              row.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className={row.danger ? 'text-red-500' : 'text-gray-400'}>
              {row.icon}
            </span>
            {row.label}
          </button>
        )
      })}
    </div>
  )
}

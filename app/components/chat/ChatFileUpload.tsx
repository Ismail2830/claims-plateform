'use client'

import { useState, useRef } from 'react'
import { Paperclip, Upload, X, FileText } from 'lucide-react'

interface Props {
  docType: string
  required: boolean
  onUpload: (file: File, docType: string) => Promise<void>
  onSkip?: () => void
  disabled?: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024

export default function ChatFileUpload({ docType, required, onUpload, onSkip, disabled }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(selected: File | null) {
    setError(null)
    if (!selected) return
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Format non accepté. Utilisez JPG, PNG, WEBP ou PDF.')
      return
    }
    if (selected.size > MAX_BYTES) {
      setError('Fichier trop volumineux (max 10 MB).')
      return
    }
    setFile(selected)
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  async function handleSend() {
    if (!file || uploading || done) return
    setUploading(true)
    setError(null)
    try {
      await onUpload(file, docType)
      setDone(true)
    } catch {
      setError('Erreur lors de l\'envoi. Veuillez réessayer.')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="ml-10 mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
        <span>✅</span>
        <span>Document envoyé avec succès</span>
      </div>
    )
  }

  return (
    <div className="ml-10 mt-2 space-y-2">
      {/* Drop zone */}
      <div
        onClick={() => !file && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          file
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center justify-between gap-3">
            {preview ? (
              <img src={preview} alt="preview" className="h-16 w-16 object-cover rounded-lg" />
            ) : (
              <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} Ko</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-2">
            <Paperclip className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">📎 Cliquez ou glissez votre fichier ici</p>
            <p className="text-xs text-gray-400 mt-1">Formats acceptés: JPG, PNG, PDF — Max 10 Mo</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Progress bar while uploading */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-2/3" />
        </div>
      )}

      <div className="flex gap-2">
        {file && (
          <button
            onClick={handleSend}
            disabled={uploading || disabled}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Envoi...' : '📤 Envoyer ce document'}
          </button>
        )}

        {!required && onSkip && (
          <button
            onClick={onSkip}
            disabled={uploading || disabled}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Passer (optionnel)
          </button>
        )}
      </div>
    </div>
  )
}

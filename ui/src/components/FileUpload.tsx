'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileUp, ShieldCheck, Sparkles } from 'lucide-react'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  isUploading: boolean
  compact?: boolean
}

export default function FileUpload({
  onFileUpload,
  isUploading,
  compact = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0])
      }
    },
    [onFileUpload],
  )

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false),
  })

  return (
    <div
      {...getRootProps()}
      className={`group relative cursor-pointer overflow-hidden transition-all duration-300 ${
        compact
          ? `flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-2.5 ${
              dragActive
                ? 'border-primary bg-primary/10'
                : 'border-foreground/20 bg-white/45 hover:border-primary/60 hover:bg-white/75'
            }`
          : `rounded-2xl border-2 border-dashed p-7 text-center sm:p-9 ${
              dragActive
                ? 'scale-[1.01] border-primary bg-primary/10 shadow-[0_24px_60px_-30px_rgba(124,92,252,0.8)]'
                : 'border-foreground/20 bg-white/55 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-white/80 hover:shadow-[0_24px_50px_-34px_rgba(45,27,61,0.6)]'
            }`
      } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
    >
      <input {...getInputProps()} aria-label="Choose a file to share" />

      {compact ? (
        <>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-white/80 text-primary">
            <FileUp className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">
              Drop another file to replace
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">
              or click to browse
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-foreground/10 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Replace
          </span>
        </>
      ) : (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-pink/20 blur-2xl transition-opacity group-hover:opacity-100"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-secondary/25 blur-2xl"
          />

          <div className="relative flex flex-col items-center">
            <div
              className={`relative mb-4 flex h-20 w-20 items-center justify-center rounded-[1.6rem] border-2 border-foreground/15 bg-gradient-to-br from-white via-primary/10 to-pink/20 shadow-[0_18px_35px_-22px_rgba(45,27,61,0.65)] transition-transform duration-300 ${
                dragActive ? 'scale-110 rotate-3' : 'group-hover:-translate-y-1 group-hover:rotate-2'
              }`}
            >
              <span className="absolute inset-0 rounded-[1.6rem] bg-white/40" />
              <FileUp
                className={`relative h-8 w-8 text-primary transition-transform duration-300 ${
                  dragActive ? 'scale-110' : ''
                }`}
              />
              <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-yellow-foreground/70" />
            </div>

            <p className="text-2xl font-bold tracking-tight text-foreground">
              {dragActive ? 'Drop it right here' : 'Drag & drop your file'}
            </p>
            <p className="mt-1.5 text-sm font-medium text-muted-foreground">
              or{' '}
              <span className="font-bold text-primary underline decoration-2 underline-offset-4">
                browse
              </span>{' '}
              from your device
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Badge icon={<Sparkles className="h-3 w-3" />} label="Any file type" />
              <Badge
                icon={<ShieldCheck className="h-3 w-3" />}
                label="Ephemeral storage"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Badge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  )
}

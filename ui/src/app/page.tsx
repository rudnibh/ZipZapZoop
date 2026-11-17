'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CloudOff,
  FileText,
  HardDrive,
  Info,
  KeyRound,
  Layers,
  Loader2,
  Radio,
  Server,
  Sparkles,
  Terminal,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import FileDownload from '@/components/FileDownload'
import FileUpload from '@/components/FileUpload'
import InviteCode from '@/components/InviteCode'
import SessionHistory from '@/components/SessionHistory'
import TransferMonitor, {
  type TransferDirection,
  type TransferStatus,
} from '@/components/TransferMonitor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatBytes } from '@/lib/format'
import {
  createHistoryEntry,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from '@/lib/history'
import {
  downloadFile,
  getTransferStatus,
  saveBlob,
  uploadFile,
  type TransferProgress,
} from '@/lib/transfer'

type Mode = 'send' | 'receive'
type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; title: string; message?: string } | null

const EMPTY_PROGRESS: TransferProgress = {
  loaded: 0,
  total: 0,
  elapsed: 0,
  speed: 0,
  samples: [],
}

const NAV_LINKS = [
  { href: '#transfer', label: 'Console' },
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
]

const STEPS = [
  {
    title: 'Pick a file',
    body: 'Choose anything from your disk. The bytes stay on your machine until a receiver asks for them.',
    icon: HardDrive,
  },
  {
    title: 'Get a code',
    body: 'The service opens a ServerSocket on a random dynamic port and hands you a five-digit invite code.',
    icon: KeyRound,
  },
  {
    title: 'Share the code',
    body: 'Send the code — or the invite link — to whoever needs the file. No account or upload step.',
    icon: Sparkles,
  },
  {
    title: 'Stream it',
    body: 'The receiver connects over TCP, bytes fly across the socket, and the session closes when it is done.',
    icon: ArrowDownToLine,
  },
]

const FEATURES: Array<{
  title: string
  body: string
  icon: LucideIcon
  accent: string
}> = [
  {
    title: 'Direct TCP stream',
    body: 'A real socket-to-socket byte stream. No third-party cloud sits in the middle of the transfer.',
    icon: Zap,
    accent: 'from-primary/20 to-primary/5 text-primary',
  },
  {
    title: 'Five-digit handshake',
    body: 'A random dynamic port doubles as the invite code. Short enough to say out loud.',
    icon: KeyRound,
    accent: 'from-pink/30 to-pink/5 text-pink-foreground',
  },
  {
    title: 'Ephemeral by design',
    body: 'Files live in the OS temp directory for the session instead of a permanent storage bucket.',
    icon: CloudOff,
    accent: 'from-secondary/40 to-secondary/5 text-secondary-foreground',
  },
  {
    title: 'Live telemetry',
    body: 'Throughput, bytes transferred, elapsed time and ETA are measured in the browser as data arrives.',
    icon: Activity,
    accent: 'from-[#a0e7e5]/50 to-[#a0e7e5]/5 text-success-foreground',
  },
  {
    title: 'Drag, drop, done',
    body: 'No forms, no sign-ups, no setup wizard. Drop a file and the code is ready to share.',
    icon: Layers,
    accent: 'from-[#fff4a3]/60 to-[#fff4a3]/10 text-yellow-foreground',
  },
  {
    title: 'Plain sockets underneath',
    body: 'Java 17 ServerSocket and Socket APIs under a Next.js interface. Networking you can point at.',
    icon: Terminal,
    accent: 'from-foreground/10 to-foreground/5 text-foreground',
  },
]

const TERMINAL_LINES = [
  { prompt: '$', text: 'java -jar target/p2p-1.0-SNAPSHOT.jar', tone: 'default' },
  { prompt: '', text: 'API server started on port 8080', tone: 'muted' },
  { prompt: '', text: "Serving file 'report.pdf' on port 54321", tone: 'accent' },
  { prompt: '', text: 'Client connected: /127.0.0.1', tone: 'muted' },
  { prompt: '', text: "File 'report.pdf' sent to /127.0.0.1", tone: 'success' },
] as const

const CONFETTI = [
  { x: -150, y: -110, rotate: 160, color: '#a78bfa' },
  { x: -110, y: -150, rotate: -120, color: '#ff9ec7' },
  { x: -70, y: -180, rotate: 90, color: '#7de2c3' },
  { x: -30, y: -140, rotate: -200, color: '#ffe28a' },
  { x: 10, y: -190, rotate: 140, color: '#a0e7e5' },
  { x: 55, y: -150, rotate: -80, color: '#a78bfa' },
  { x: 95, y: -120, rotate: 220, color: '#ff9ec7' },
  { x: 140, y: -90, rotate: -140, color: '#7de2c3' },
  { x: -140, y: -40, rotate: 120, color: '#ffe28a' },
  { x: -90, y: -20, rotate: -60, color: '#a0e7e5' },
  { x: 100, y: -30, rotate: 180, color: '#a78bfa' },
  { x: 150, y: -50, rotate: -160, color: '#ff9ec7' },
  { x: -40, y: -100, rotate: 60, color: '#7de2c3' },
  { x: 40, y: -110, rotate: -220, color: '#ffe28a' },
]

export default function Home() {
  const [mode, setMode] = useState<Mode>('send')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [port, setPort] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [prefillCode, setPrefillCode] = useState('')

  const [status, setStatus] = useState<TransferStatus>('idle')
  const [direction, setDirection] = useState<TransferDirection>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [progress, setProgress] = useState<TransferProgress>(EMPTY_PROGRESS)

  const [toast, setToast] = useState<Toast>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const startedAt = useRef<number | null>(null)

  const pushToast = useCallback((kind: ToastKind, title: string, message?: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), kind, title, message })
    toastTimer.current = window.setTimeout(() => setToast(null), 5200)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = (params.get('code') ?? '').replace(/\D/g, '')
    if (code.length !== 5) return

    setMode('receive')
    setPrefillCode(code)

    const timer = window.setTimeout(() => {
      document
        .getElementById('console')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 600)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isUploading && !isDownloading) return

    const timer = window.setInterval(() => {
      if (startedAt.current === null) return
      const elapsed = (performance.now() - startedAt.current) / 1000
      setProgress((previous) => ({ ...previous, elapsed }))
    }, 250)

    return () => window.clearInterval(timer)
  }, [isUploading, isDownloading])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    if (!uploadedFile || !uploadedFile.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(uploadedFile)
    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [uploadedFile])

  useEffect(() => {
    if (status !== 'complete' && status !== 'delivered') return

    setCelebrate(true)
    const confettiTimer = window.setTimeout(() => setCelebrate(false), 1500)
    const scrollTimer =
      window.innerWidth < 1024
        ? window.setTimeout(() => {
            document
              .getElementById('live-session')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 450)
        : undefined

    return () => {
      window.clearTimeout(confettiTimer)
      if (scrollTimer) window.clearTimeout(scrollTimer)
    }
  }, [status])

  const recordHistory = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'at'>) => {
      setHistory((previous) => {
        const next = [createHistoryEntry(entry), ...previous].slice(0, 6)
        saveHistory(next)
        return next
      })
    },
    [],
  )

  const markSendDelivered = useCallback((code: number) => {
    setHistory((previous) => {
      let changed = false
      const next = previous.map((entry) => {
        if (
          entry.direction === 'send' &&
          entry.code === code &&
          entry.status !== 'delivered'
        ) {
          changed = true
          return { ...entry, status: 'delivered' as const }
        }
        return entry
      })

      if (!changed) return previous
      saveHistory(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (status !== 'ready' || direction !== 'send' || !port) return

    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        const result = await getTransferStatus(port)
        if (cancelled) return

        if (result === null) {
          setStatus('error')
          pushToast(
            'error',
            'Transfer session expired',
            'Upload the file again to create a new code.',
          )
          return
        }

        if (result.status === 'sent') {
          setStatus('delivered')
          markSendDelivered(port)
          pushToast(
            'success',
            'Delivered to receiver',
            `${fileName || 'The file'} was downloaded. This session is complete.`,
          )
          return
        }

        if (result.status === 'error') {
          setStatus('error')
          pushToast(
            'error',
            'Delivery failed',
            'The receiver could not complete the transfer.',
          )
          return
        }
      } catch {
        // Network hiccups should not kill the live session; retry.
      }

      if (!cancelled) {
        timer = window.setTimeout(poll, 1500)
      }
    }

    timer = window.setTimeout(poll, 1200)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [
    status,
    direction,
    port,
    fileName,
    pushToast,
    markSendDelivered,
  ])

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadedFile(file)
      setPort(null)
      setDirection('send')
      setStatus('uploading')
      setFileName(file.name)
      setFileSize(file.size)
      setProgress({ ...EMPTY_PROGRESS, total: file.size })
      setIsUploading(true)
      setToast(null)
      startedAt.current = performance.now()

      try {
        const result = await uploadFile(file, (next) => setProgress(next))
        setPort(result.port)
        setStatus('ready')
        recordHistory({
          direction: 'send',
          status: 'shared',
          fileName: file.name,
          fileSize: file.size,
          code: result.port,
        })
        setProgress((previous) => {
          const elapsed = previous.elapsed || 0
          const finalSpeed =
            elapsed > 0 ? file.size / elapsed : previous.speed
          return {
            ...previous,
            loaded: file.size,
            total: file.size,
            speed: finalSpeed,
            samples:
              previous.samples.length > 1
                ? previous.samples
                : finalSpeed > 0
                  ? [finalSpeed, finalSpeed]
                  : previous.samples,
          }
        })
        pushToast(
          'success',
          'File staged — code ready',
          `Code ${result.port} is live. Waiting for the receiver to download ${file.name}.`,
        )
      } catch (error) {
        setStatus('error')
        pushToast(
          'error',
          'Could not stage the file',
          error instanceof Error ? error.message : 'Try again in a moment.',
        )
      } finally {
        setIsUploading(false)
      }
    },
    [pushToast, recordHistory],
  )

  const handleDownload = useCallback(
    async (portNumber: number) => {
      setMode('receive')
      setDirection('receive')
      setStatus('downloading')
      setFileName('')
      setFileSize(0)
      setProgress({ ...EMPTY_PROGRESS })
      setIsDownloading(true)
      setToast(null)
      startedAt.current = performance.now()

      try {
        const result = await downloadFile(portNumber, (next) => {
          setProgress(next)
          if (next.total > 0) setFileSize(next.total)
        })

        saveBlob(result.blob, result.filename)
        setFileName(result.filename)
        setFileSize(result.blob.size)
        setProgress((previous) => {
          const elapsed = previous.elapsed || 0
          const finalSpeed =
            elapsed > 0 ? result.blob.size / elapsed : previous.speed
          return {
            ...previous,
            loaded: result.blob.size,
            total: result.blob.size,
            speed: finalSpeed,
            samples:
              previous.samples.length > 1
                ? previous.samples
                : finalSpeed > 0
                  ? [finalSpeed, finalSpeed]
                  : previous.samples,
          }
        })
        setStatus('complete')
        recordHistory({
          direction: 'receive',
          status: 'received',
          fileName: result.filename,
          fileSize: result.blob.size,
          code: portNumber,
        })
        pushToast('success', 'Download complete', result.filename)
      } catch (error) {
        setStatus('error')
        pushToast(
          'error',
          'Transfer failed',
          error instanceof Error ? error.message : 'Check the code and try again.',
        )
        throw error
      } finally {
        setIsDownloading(false)
      }
    },
    [pushToast, recordHistory],
  )

  const resetSendSession = () => {
    if (isUploading) return
    setUploadedFile(null)
    setPort(null)
    setStatus('idle')
    setDirection(null)
    setFileName('')
    setFileSize(0)
    setProgress(EMPTY_PROGRESS)
  }

  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : status === 'ready' || status === 'complete' || status === 'delivered'
        ? 100
        : 0

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <Backdrop />

      <header className="sticky top-0 z-40 px-4 pt-4">
        <nav className="nav-shell mx-auto flex max-w-6xl items-center gap-3 rounded-2xl px-3.5 py-2.5">
          <a href="#" className="flex shrink-0 items-center" aria-label="ZipZapZoop home">
            <Image
              src="/logo-trimmed.png"
              alt="ZipZapZoop"
              width={148}
              height={43}
              priority
              className="h-9 w-auto"
            />
          </a>

          <div className="ml-auto hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <a
            href="#transfer"
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-foreground/15 bg-foreground px-3.5 text-xs font-bold text-background shadow-[0_8px_18px_-12px_rgba(45,27,61,0.9)] transition-transform hover:-translate-y-0.5 sm:text-sm md:ml-2"
          >
            Start transfer
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative mx-auto max-w-6xl px-4 pb-8 pt-14 text-center sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/65 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground shadow-[0_10px_24px_-20px_rgba(45,27,61,0.8)] backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="status-ping relative inline-flex h-1.5 w-1.5 rounded-full text-primary" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Peer-to-peer transfer
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-[2.75rem] font-bold leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Send a file.
            <br />
            Share a code.
            <br />
            <span className="text-gradient">That&apos;s it.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
            ZipZapZoop turns any file into a five-digit handoff. Drop it in,
            pass the code along, and the bytes stream over a direct TCP socket
            — no accounts, no cloud middleman.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#transfer"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-foreground/15 bg-gradient-to-r from-primary via-[#b18cff] to-pink px-6 text-sm font-bold text-primary-foreground shadow-[0_18px_35px_-18px_rgba(124,92,252,0.9)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-18px_rgba(124,92,252,0.9)]"
            >
              Open the console
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-foreground/15 bg-white/70 px-6 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_-20px_rgba(45,27,61,0.8)]"
            >
              See how it works
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-foreground/10 rounded-2xl border border-foreground/10 bg-white/45 py-3 backdrop-blur">
            {[
              { value: '5-digit', label: 'invite code' },
              { value: 'TCP', label: 'socket stream' },
              { value: '0', label: 'accounts needed' },
            ].map((item) => (
              <div key={item.label} className="px-2">
                <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {item.value}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="transfer"
          className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-10 sm:py-14"
        >
          <SectionHeading
            eyebrow="Transfer console"
            title="One console. Two directions."
            subtitle="Share a file on the left, receive one on the right, and watch the live session track every byte in real time."
          />

          <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.12fr_0.88fr]">
            <div id="console" className="soft-card scroll-mt-24 p-4 sm:p-6">
              <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <TabsList className="grid h-12 w-full grid-cols-2 gap-1 rounded-xl border border-foreground/10 bg-foreground/[0.04] p-1 shadow-none">
                  <TabsTrigger
                    value="send"
                    className="gap-1.5 rounded-lg border-0 px-3 text-xs data-[state=active]:border-0 data-[state=active]:shadow-none sm:text-sm"
                  >
                    <Zap className="h-4 w-4" />
                    Share a file
                  </TabsTrigger>
                  <TabsTrigger
                    value="receive"
                    className="gap-1.5 rounded-lg border-0 px-3 text-xs data-[state=active]:border-0 data-[state=active]:shadow-none sm:text-sm"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Receive a file
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="send" className="mt-5 space-y-4">
                  <FileUpload
                    onFileUpload={handleFileUpload}
                    isUploading={isUploading}
                    compact={Boolean(uploadedFile)}
                  />

                  <AnimatePresence initial={false}>
                    {uploadedFile && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-white/65 p-3"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-foreground/10 bg-gradient-to-br from-primary/15 to-pink/20 text-primary">
                          {previewUrl ? (
                            <Image
                              src={previewUrl}
                              alt={uploadedFile.name}
                              width={44}
                              height={44}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">
                            {uploadedFile.name}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                            {formatBytes(uploadedFile.size)} ·{' '}
                            {status === 'delivered'
                              ? 'Delivered to receiver'
                              : isUploading
                                ? 'Staging file…'
                                : port
                                  ? 'Ready to share'
                                  : 'Selected'}
                          </p>
                        </div>
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : status === 'delivered' ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-secondary-foreground/15 bg-secondary/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
                            <Check className="h-3 w-3" />
                            Delivered
                          </span>
                        ) : port ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-secondary-foreground/15 bg-secondary/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
                            <Check className="h-3 w-3" />
                            Staged
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={resetSendSession}
                            aria-label="Remove selected file"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isUploading && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                        <span>Staging file for transfer…</span>
                        <span className="tabular-nums">{percent}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary via-[#b18cff] to-pink transition-[width] duration-200"
                          style={{ width: `${Math.max(percent, 3)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {port && (
                      <InviteCode
                        port={port}
                        fileName={uploadedFile?.name}
                        fileSize={uploadedFile?.size}
                        delivered={status === 'delivered'}
                        expired={status === 'error' && direction === 'send'}
                      />
                    )}
                  </AnimatePresence>

                  {!port && !uploadedFile && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-foreground/10 bg-white/40 px-3.5 py-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                        Files are staged in the OS temp directory and served
                        from a random dynamic TCP port. Your invite code is
                        issued the moment staging completes.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="receive" className="mt-5 space-y-4">
                  <FileDownload
                    onDownload={handleDownload}
                    isDownloading={isDownloading}
                    prefillCode={prefillCode}
                  />

                  <div className="rounded-2xl border border-foreground/10 bg-white/40 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      What happens when you connect
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {[
                        'Your browser asks the Java service for /download/{code}.',
                        'The service opens a TCP socket to the sender.',
                        'Bytes stream back and the file lands in Downloads.',
                      ].map((item, index) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary/50 text-[9px] font-bold text-secondary-foreground">
                            {index + 1}
                          </span>
                          <span className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div id="live-session" className="relative scroll-mt-24">
              <TransferMonitor
                status={status}
                direction={direction}
                fileName={fileName}
                fileSize={fileSize || (uploadedFile?.size ?? 0)}
                loaded={progress.loaded}
                total={progress.total || (uploadedFile?.size ?? 0)}
                elapsed={progress.elapsed}
                speed={progress.speed}
                samples={progress.samples}
                port={port}
              />
              {celebrate && <Confetti />}
            </div>
          </div>

          <div className="mt-5">
            <SessionHistory
              entries={history}
              onClear={() => {
                setHistory([])
                saveHistory([])
              }}
            />
          </div>
        </section>

        <section
          id="how"
          className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:py-14"
        >
          <SectionHeading
            eyebrow="How it works"
            title="From your disk to theirs in four moves."
            subtitle="No hidden upload step. Just a socket, a code, and the bytes in between."
          />

          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="hard-card group relative p-5 pt-7"
                >
                  <span className="absolute -top-3 left-5 inline-flex h-7 min-w-7 items-center justify-center rounded-lg border-2 border-foreground/15 bg-white px-1.5 text-[11px] font-bold text-foreground shadow-[0_4px_0_0_rgba(45,27,61,0.08)]">
                    0{index + 1}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-foreground/10 bg-gradient-to-br from-primary/15 via-white to-pink/20 text-primary transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45 }}
              className="overflow-hidden rounded-2xl border-2 border-foreground/15 bg-[#1b1230] shadow-[0_28px_60px_-38px_rgba(27,18,48,0.9)] lg:flex lg:flex-col"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-2 w-2 rounded-full bg-[#ff8fa3]" />
                  <span className="h-2 w-2 rounded-full bg-[#ffe08a]" />
                  <span className="h-2 w-2 rounded-full bg-[#7de2c3]" />
                </span>
                <span className="ml-1 font-mono text-[10px] font-semibold text-white/40">
                  zipzapzoop — java -jar p2p.jar
                </span>
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white/50">
                  example session
                </span>
              </div>
              <div className="space-y-1.5 p-4 font-mono text-[11px] leading-relaxed sm:text-xs lg:flex-1">
                {TERMINAL_LINES.map((line, index) => (
                  <div key={index} className="terminal-line flex gap-2">
                    {line.prompt && (
                      <span className="select-none text-white/35">{line.prompt}</span>
                    )}
                    <span
                      className={
                        line.tone === 'success'
                          ? 'text-[#7de2c3]'
                          : line.tone === 'accent'
                            ? 'text-[#c9b5ff]'
                            : line.tone === 'muted'
                              ? 'text-white/55'
                              : 'text-white/85'
                      }
                    >
                      {line.text}
                    </span>
                  </div>
                ))}
                <div className="terminal-line flex gap-2 pt-1">
                  <span className="select-none text-white/35">$</span>
                  <span className="inline-block h-3.5 w-1.5 animate-pulse bg-white/60" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 px-4 py-2.5">
                {['1 file', 'port 54321', 'TCP stream', '1 receiver'].map(
                  (chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-white/[0.07] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-white/45"
                    >
                      {chip}
                    </span>
                  ),
                )}
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#7de2c3]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7de2c3]" />
                  closed
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="soft-card flex flex-col justify-between p-5 sm:p-6"
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Network path
                </p>
                <div className="mt-5 flex items-center justify-between gap-1.5">
                  {[
                    { icon: HardDrive, label: 'Your disk' },
                    { icon: Server, label: 'Java service' },
                    { icon: Radio, label: 'TCP socket' },
                    { icon: ArrowDownToLine, label: 'Receiver' },
                  ].map((node, index, all) => {
                    const Icon = node.icon
                    return (
                      <div key={node.label} className="contents">
                        <div className="flex min-w-0 flex-col items-center gap-1.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-white/80 text-primary shadow-[0_6px_14px_-12px_rgba(45,27,61,0.8)]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="max-w-[4.5rem] text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {node.label}
                          </span>
                        </div>
                        {index < all.length - 1 && (
                          <div className="relative mb-5 h-px flex-1 bg-foreground/15">
                            <span className="packet absolute left-0 top-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="packet absolute left-0 top-1/2 h-1.5 w-1.5 rounded-full bg-pink" />
                            <span className="packet absolute left-0 top-1/2 h-1.5 w-1.5 rounded-full bg-secondary-foreground/60" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {[
                  ['Transport', 'TCP · ServerSocket + Socket'],
                  ['Framing', 'Filename header + raw bytes'],
                  ['Buffer', '4 KB stream buffer'],
                  ['Lifecycle', 'Socket closes after one transfer'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 bg-white/55 px-3 py-2"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-right font-mono text-[10px] font-semibold text-foreground/80">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section
          id="features"
          className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:py-14"
        >
          <SectionHeading
            eyebrow="Why it stands out"
            title="Small system. Real networking."
            subtitle="Everything you see here maps back to a concept from the course — sockets, ports, streams and timing."
          />

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="hard-card group p-5"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-foreground/10 bg-gradient-to-br transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3 ${feature.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-4 sm:pb-20">
          <div className="relative overflow-hidden rounded-3xl border-2 border-foreground/15 bg-gradient-to-br from-primary/25 via-pink/20 to-secondary/30 px-6 py-10 text-center shadow-[0_30px_70px_-45px_rgba(45,27,61,0.9)] sm:px-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/40 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl"
            />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Ready when you are
              </p>
              <h2 className="mx-auto mt-2 max-w-xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Put a file in someone else&apos;s hands.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-relaxed text-muted-foreground">
                One drop, one code, one TCP stream. The whole handoff takes
                less time than explaining it.
              </p>
              <a
                href="#transfer"
                className="group mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-foreground/15 bg-foreground px-6 text-sm font-bold text-background shadow-[0_16px_30px_-18px_rgba(45,27,61,0.9)] transition-transform hover:-translate-y-0.5"
              >
                Start a transfer
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10 bg-white/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-7 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-trimmed.png"
              alt="ZipZapZoop"
              width={120}
              height={35}
              className="h-7 w-auto opacity-80"
            />
            <span className="h-5 w-px bg-foreground/10" aria-hidden />
            <p className="text-[11px] font-semibold text-muted-foreground">
              Peer-to-peer file transfer
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {['Java 17', 'TCP sockets', 'Next.js 15'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-foreground/10 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>


        </div>
      </footer>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 left-4 z-50 w-[min(92vw,22rem)] rounded-2xl border-2 border-foreground/15 bg-white/95 p-4 shadow-[0_24px_50px_-24px_rgba(45,27,61,0.6)] backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  toast.kind === 'success'
                    ? 'bg-secondary text-secondary-foreground'
                    : toast.kind === 'error'
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-primary/15 text-primary'
                }`}
              >
                {toast.kind === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : toast.kind === 'error' ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-muted-foreground">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </div>
  )
}

function Confetti() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {CONFETTI.map((piece, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: piece.x,
            y: piece.y,
            rotate: piece.rotate,
            scale: 0.7,
          }}
          transition={{ duration: 1.15, ease: 'easeOut' }}
          className="absolute left-1/2 top-1/2 h-2 w-1.5 rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </div>
  )
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="dot-grid absolute inset-0 opacity-40" />
      <div className="animate-blob absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-[120px]" />
      <div className="animate-blob-slow absolute -right-48 top-1/4 h-[32rem] w-[32rem] rounded-full bg-pink/25 blur-[120px]" />
      <div className="animate-blob absolute -bottom-56 left-1/3 h-[30rem] w-[30rem] rounded-full bg-secondary/25 blur-[120px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  )
}

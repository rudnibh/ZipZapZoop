'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Copy,
  Expand,
  Link2,
  Radio,
  Share2,
  Smartphone,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { formatBytes } from '@/lib/format'

interface InviteCodeProps {
  port: number
  fileName?: string
  fileSize?: number
  delivered?: boolean
  expired?: boolean
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = value
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

export default function InviteCode({
  port,
  fileName,
  fileSize,
  delivered = false,
  expired = false,
}: InviteCodeProps) {
  const [copied, setCopied] = useState<'code' | 'link' | 'share' | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const copyTimer = useRef<number | undefined>(undefined)

  const digits = port.toString().split('')
  const ended = delivered || expired

  useEffect(() => {
    setInviteLink(`${window.location.origin}/?code=${port}`)
  }, [port])

  useEffect(() => {
    if (!qrOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQrOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [qrOpen])

  useEffect(() => {
    if (ended) setQrOpen(false)
  }, [ended])

  const isLocalhost =
    inviteLink.includes('://localhost') || inviteLink.includes('://127.0.0.1')

  const remember = (kind: 'code' | 'link' | 'share') => {
    setCopied(kind)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(null), 1800)
  }

  const handleCopy = async (kind: 'code' | 'link') => {
    const value = kind === 'code' ? port.toString() : inviteLink
    if (await copyText(value)) remember(kind)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'ZipZapZoop file transfer',
      text: `Open ZipZapZoop and enter invite code ${port} to receive the file.`,
      url: inviteLink,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        remember('share')
        return
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') return
      }
    }

    if (await copyText(inviteLink)) remember('share')
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl border-2 border-secondary-foreground/15 bg-gradient-to-br from-secondary/35 via-white/80 to-primary/10 p-5 sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-secondary/40 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-primary/20 blur-2xl"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {ended ? (
                <span className="inline-flex h-2 w-2 rounded-full bg-secondary-foreground/60" />
              ) : (
                <span className="relative flex h-2 w-2">
                  <span className="status-ping relative inline-flex h-2 w-2 rounded-full text-secondary-foreground/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary-foreground/80" />
                </span>
              )}
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/80">
                {delivered
                  ? 'Session complete'
                  : expired
                    ? 'Session expired'
                    : 'Session live'}
              </span>
            </div>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              {delivered
                ? 'Code delivered'
                : expired
                  ? 'Code expired'
                  : 'Your invite code'}
            </h3>
            {fileName && (
              <p className="mt-1 max-w-[16rem] truncate text-xs font-semibold text-muted-foreground">
                {fileName}
                {fileSize ? ` · ${formatBytes(fileSize)}` : ''}
              </p>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            {delivered ? (
              <Check className="h-3 w-3 text-secondary-foreground" />
            ) : expired ? (
              <X className="h-3 w-3 text-destructive" />
            ) : (
              <Radio className="h-3 w-3 text-secondary-foreground" />
            )}
            {delivered
              ? 'TCP socket closed'
              : expired
                ? 'No active socket'
                : 'TCP socket open'}
          </span>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-2">
          {digits.map((digit, index) => (
            <motion.span
              key={`${digit}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index, duration: 0.25 }}
              className="code-tile flex h-16 w-full min-w-0 items-center justify-center rounded-xl text-3xl font-bold tabular-nums text-foreground transition-opacity sm:h-20 sm:text-4xl"
              style={{ opacity: ended ? 0.55 : 1 }}
            >
              {digit}
            </motion.span>
          ))}
        </div>

        {delivered && (
          <div className="relative mt-4 rounded-xl border border-secondary-foreground/20 bg-secondary/25 px-3.5 py-3 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary-foreground">
              <Check className="h-3.5 w-3.5" />
              Delivered · code used
            </p>
            <p className="mt-1 text-[10px] font-medium leading-relaxed text-secondary-foreground/75">
              This session accepted its one download. Upload another file to
              create a fresh code.
            </p>
          </div>
        )}

        {expired && (
          <div className="relative mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive">
              <X className="h-3.5 w-3.5" />
              Session expired
            </p>
            <p className="mt-1 text-[10px] font-medium leading-relaxed text-muted-foreground">
              The backend no longer knows this code. Upload the file again to
              create a new session.
            </p>
          </div>
        )}

        {!ended && (
          <>
        <div className="relative mt-4 flex items-center gap-3.5 rounded-xl border border-foreground/10 bg-white/60 p-3">
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            aria-label="Enlarge QR code"
            className="group relative shrink-0 rounded-lg border border-foreground/10 bg-white p-1.5 shadow-[0_6px_16px_-12px_rgba(45,27,61,0.8)] transition-transform hover:-translate-y-0.5"
          >
            {inviteLink ? (
              <QRCodeSVG
                value={inviteLink}
                size={88}
                level="M"
                bgColor="#ffffff"
                fgColor="#2D1B3D"
                title={`Invite link for code ${port}`}
              />
            ) : (
              <div className="h-[88px] w-[88px] animate-pulse rounded bg-foreground/5" />
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Expand className="h-5 w-5 text-white" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Scan to open on your phone
            </p>
            <p className="mt-1 text-[10px] font-medium leading-relaxed text-muted-foreground">
              Point your camera at the code. The invite link opens with the code
              already filled in. Tap the code to enlarge it.
            </p>
            <p
              className="mt-1.5 truncate font-mono text-[9px] font-semibold text-foreground/55"
              title={inviteLink}
            >
              {inviteLink.replace(/^https?:\/\//, '')}
            </p>
            {inviteLink && isLocalhost && (
              <p className="mt-1.5 rounded-md border border-yellow/60 bg-yellow/25 px-2 py-1 text-[9px] font-semibold leading-relaxed text-yellow-foreground">
                You are on localhost. Open this page through your PC&apos;s LAN IP
                for the QR code to work on a phone.
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => handleCopy('code')}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-foreground/15 bg-white/80 text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_18px_-12px_rgba(45,27,61,0.7)] sm:text-sm"
          >
            {copied === 'code' ? (
              <>
                <Check className="h-4 w-4 text-secondary-foreground" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-primary" />
                Copy code
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleCopy('link')}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-primary/30 bg-primary/10 text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/15 hover:shadow-[0_8px_18px_-12px_rgba(124,92,252,0.8)] sm:text-sm"
          >
            {copied === 'link' ? (
              <>
                <Check className="h-4 w-4 text-secondary-foreground" />
                Copied
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 text-primary" />
                Copy link
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-foreground/15 bg-white/80 text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_18px_-12px_rgba(45,27,61,0.7)] sm:col-span-1 sm:text-sm"
          >
            {copied === 'share' ? (
              <>
                <Check className="h-4 w-4 text-secondary-foreground" />
                Shared
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-primary" />
                Share
              </>
            )}
          </button>
        </div>

        <p className="relative mt-4 rounded-xl border border-foreground/10 bg-white/50 px-3 py-2 text-[11px] font-medium leading-relaxed text-muted-foreground">
          Keep this tab open while the file is being received. The code stays
          active for the life of this session.
        </p>
          </>
        )}
      </motion.div>

      {!ended &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {qrOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-label="Invite QR code"
              >
                <button
                  type="button"
                  aria-label="Close QR code"
                  onClick={() => setQrOpen(false)}
                  className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border-2 border-foreground/15 bg-[#fffdf8] p-6 text-center shadow-[0_36px_90px_-32px_rgba(45,27,61,0.65)]"
                >
                  <button
                    type="button"
                    onClick={() => setQrOpen(false)}
                    aria-label="Close"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-foreground/10 bg-white/70 text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                    Phone handoff
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                    Scan to receive
                  </h3>
                  <p className="mx-auto mt-1 max-w-[17rem] text-[11px] font-medium leading-relaxed text-muted-foreground">
                    Open the camera on your phone and point it at the code. The
                    invite link opens with the code filled in.
                  </p>

                  <div className="mx-auto mt-4 w-fit rounded-2xl border-2 border-foreground/10 bg-white p-3">
                    {inviteLink ? (
                      <QRCodeSVG
                        value={inviteLink}
                        size={232}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#2D1B3D"
                        title={`Invite link for code ${port}`}
                      />
                    ) : (
                      <div className="h-[232px] w-[232px] animate-pulse rounded bg-foreground/5" />
                    )}
                  </div>

                  <p className="mt-4 font-mono text-3xl font-bold tracking-[0.22em] text-foreground">
                    {port}
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] font-semibold text-foreground/55">
                    {inviteLink.replace(/^https?:\/\//, '')}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy('code')}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-foreground/15 bg-white/80 text-xs font-bold text-foreground transition-colors hover:bg-white"
                    >
                      {copied === 'code' ? (
                        <>
                          <Check className="h-4 w-4 text-secondary-foreground" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-primary" />
                          Copy code
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy('link')}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-primary/30 bg-primary/10 text-xs font-bold text-foreground transition-colors hover:bg-primary/15"
                    >
                      {copied === 'link' ? (
                        <>
                          <Check className="h-4 w-4 text-secondary-foreground" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 text-primary" />
                          Copy link
                        </>
                      )}
                    </button>
                  </div>

                  {inviteLink && isLocalhost && (
                    <p className="mt-3 rounded-lg border border-yellow/60 bg-yellow/25 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-yellow-foreground">
                      This QR points at localhost. Open the app through your
                      PC&apos;s LAN IP first so your phone can reach it.
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}

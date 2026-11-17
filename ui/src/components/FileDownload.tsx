'use client'

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  ArrowRight,
  ClipboardPaste,
  Download,
  KeyRound,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileDownloadProps {
  onDownload: (port: number) => Promise<void>
  isDownloading: boolean
  prefillCode?: string
}

const CODE_LENGTH = 5

export default function FileDownload({
  onDownload,
  isDownloading,
  prefillCode,
}: FileDownloadProps) {
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => ''),
  )
  const [error, setError] = useState('')
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (!prefillCode) return
    const clean = prefillCode.replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!clean) return
    setDigits(
      Array.from({ length: CODE_LENGTH }, (_, index) => clean[index] ?? ''),
    )
    setError('')
  }, [prefillCode])

  const code = digits.join('')
  const complete = code.length === CODE_LENGTH

  const updateDigits = (next: string[]) => {
    setDigits(next)
    setError('')
  }

  const writeDigits = (start: number, raw: string) => {
    const clean = raw.replace(/\D/g, '')
    if (!clean) {
      const next = [...digits]
      next[start] = ''
      updateDigits(next)
      return
    }

    const next = [...digits]
    clean
      .slice(0, CODE_LENGTH - start)
      .split('')
      .forEach((char, offset) => {
        next[start + offset] = char
      })
    updateDigits(next)

    const focusAt = Math.min(start + clean.length, CODE_LENGTH - 1)
    inputs.current[focusAt]?.focus()
  }

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ''
      updateDigits(next)
      inputs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return

    event.preventDefault()
    const next = Array.from({ length: CODE_LENGTH }, (_, index) => pasted[index] ?? '')
    updateDigits(next)
    const focusAt = Math.min(pasted.length, CODE_LENGTH - 1)
    inputs.current[focusAt]?.focus()
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const clean = text.replace(/\D/g, '').slice(0, CODE_LENGTH)
      if (!clean) {
        setError('Your clipboard does not contain a five-digit code.')
        return
      }
      const next = Array.from(
        { length: CODE_LENGTH },
        (_, index) => clean[index] ?? '',
      )
      updateDigits(next)
      inputs.current[Math.min(clean.length, CODE_LENGTH - 1)]?.focus()
    } catch {
      setError('Clipboard access was blocked. Type the code instead.')
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!complete) {
      setError('Enter the full five-digit invite code.')
      return
    }

    const port = Number(code)
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      setError('That is not a valid transfer code (1–65535).')
      return
    }

    try {
      await onDownload(port)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Download failed. Check the code and try again.',
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-foreground/10 bg-gradient-to-br from-accent/20 via-white/60 to-secondary/15 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-white/80 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            Have an invite code?
          </p>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-muted-foreground">
            Enter the five digits from the sender. The transfer starts
            immediately.
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Invite code
          </label>
          <button
            type="button"
            onClick={pasteFromClipboard}
            disabled={isDownloading}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary underline decoration-2 underline-offset-4 disabled:opacity-50"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste
          </button>
        </div>

        <div
          className="flex items-center justify-between gap-2"
          onPaste={handlePaste}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputs.current[index] = element
              }}
              value={digit}
              onChange={(event) => writeDigits(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onFocus={(event) => event.target.select()}
              disabled={isDownloading}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Invite code digit ${index + 1}`}
              className={`h-14 w-full min-w-0 rounded-xl border-2 text-center text-2xl font-bold tabular-nums text-foreground outline-none transition-all duration-150 disabled:opacity-60 sm:h-16 sm:text-3xl ${
                digit
                  ? 'border-primary/45 bg-primary/[0.07] shadow-[0_4px_0_0_rgba(124,92,252,0.14)]'
                  : 'border-foreground/15 bg-white/70'
              } focus:-translate-y-0.5 focus:border-primary focus:bg-white focus:shadow-[0_6px_0_0_rgba(124,92,252,0.18)]`}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>Five digits, no spaces</span>
          <span className={complete ? 'font-bold text-secondary-foreground' : ''}>
            {code.length}/{CODE_LENGTH}
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
          >
            {error}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isDownloading}
        className="group h-14 w-full rounded-xl border-2 border-foreground/15 bg-gradient-to-r from-primary via-[#b18cff] to-pink text-base text-primary-foreground shadow-[0_14px_30px_-16px_rgba(124,92,252,0.9)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-16px_rgba(124,92,252,0.9)] disabled:opacity-80"
      >
        {isDownloading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Receiving bytes…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download file
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </Button>
    </form>
  )
}

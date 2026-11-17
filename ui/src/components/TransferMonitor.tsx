'use client'

import type { ReactNode } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock3,
  Gauge,
  Radio,
  Timer,
  Waves,
} from 'lucide-react'

import { formatBytes, formatDuration, formatEta, formatSpeed } from '@/lib/format'

export type TransferStatus =
  | 'idle'
  | 'uploading'
  | 'ready'
  | 'delivered'
  | 'downloading'
  | 'complete'
  | 'error'

export type TransferDirection = 'send' | 'receive' | null

interface TransferMonitorProps {
  status: TransferStatus
  direction: TransferDirection
  fileName: string
  fileSize: number
  loaded: number
  total: number
  elapsed: number
  speed: number
  samples: number[]
  port: number | null
}

const RADIUS = 64
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const statusCopy: Record<
  TransferStatus,
  { label: string; detail: string; dot: string }
> = {
  idle: {
    label: 'Waiting for a session',
    detail: 'Pick a file or enter a code to begin.',
    dot: 'bg-foreground/30',
  },
  uploading: {
    label: 'Sending to the transfer service',
    detail: 'The invite code appears the moment the file is staged.',
    dot: 'bg-primary',
  },
  ready: {
    label: 'File staged · waiting for receiver',
    detail: 'The code is live. Nothing is delivered until they connect.',
    dot: 'bg-secondary',
  },
  delivered: {
    label: 'Delivered to receiver',
    detail: 'The receiver downloaded the file. This session is complete.',
    dot: 'bg-secondary',
  },
  downloading: {
    label: 'Receiving bytes',
    detail: 'Streaming over a TCP socket right now.',
    dot: 'bg-primary',
  },
  complete: {
    label: 'Transfer complete',
    detail: 'The file has been saved to your downloads.',
    dot: 'bg-secondary',
  },
  error: {
    label: 'Session interrupted',
    detail: 'Check the connection and try again.',
    dot: 'bg-destructive',
  },
}

export default function TransferMonitor({
  status,
  direction,
  fileName,
  fileSize,
  loaded,
  total,
  elapsed,
  speed,
  samples,
  port,
}: TransferMonitorProps) {
  const active = status === 'uploading' || status === 'downloading'
  const staged = status === 'ready'
  const senderDelivered = status === 'delivered'
  const receiverComplete = status === 'complete'
  const finished = staged || senderDelivered || receiverComplete
  const copy = statusCopy[status]

  const percent =
    total > 0
      ? Math.max(0, Math.min(100, (loaded / total) * 100))
      : finished
        ? 100
        : 0

  const dashOffset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE

  const safeSamples = samples.filter(
    (value) => Number.isFinite(value) && value >= 0,
  )

  const chartPoints = safeSamples.map((value, index) => {
    const x =
      safeSamples.length === 1 ? 0 : (index / (safeSamples.length - 1)) * 100
    return { x, value }
  })
  const maxSample = Math.max(...safeSamples, 1)
  const linePath = chartPoints
    .map(({ x, value }, index) => {
      const y = 36 - (value / maxSample) * 30
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const transferLabel =
    direction === 'send'
      ? 'Outbound · sender'
      : direction === 'receive'
        ? 'Inbound · receiver'
        : 'No active transfer'

  const steps = [
    {
      label: 'Session opened',
      state: status !== 'idle' ? 'done' : 'idle',
    },
    {
      label:
        status === 'ready'
          ? 'File staged'
          : active
            ? 'Streaming bytes'
            : 'Byte stream',
      state:
        status === 'ready'
          ? 'done'
          : active
            ? 'active'
            : senderDelivered || receiverComplete
              ? 'done'
              : 'idle',
    },
    {
      label:
        status === 'ready'
          ? 'Waiting for receiver'
          : senderDelivered
            ? 'Delivered to receiver'
            : status === 'error'
              ? 'Session interrupted'
              : 'Transfer complete',
      state:
        status === 'ready'
          ? 'waiting'
          : senderDelivered || receiverComplete
            ? 'done'
            : status === 'error'
              ? 'error'
              : 'idle',
    },
  ] as const

  return (
    <aside className="soft-card relative overflow-hidden p-6 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-secondary/20 blur-3xl"
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`status-ping relative inline-flex h-2.5 w-2.5 rounded-full text-current ${copy.dot}`}
            />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${copy.dot}`} />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Live session
          </h2>
        </div>
        <span className="rounded-full border border-foreground/10 bg-white/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {transferLabel}
        </span>
      </div>

      <div className="relative mt-6 flex flex-col items-center">
        <div className="relative h-44 w-44">
          <div
            aria-hidden
            className={`absolute inset-6 rounded-full blur-2xl transition-opacity ${
              active ? 'bg-primary/30 opacity-100' : 'bg-primary/10 opacity-60'
            }`}
          />
          <svg viewBox="0 0 160 160" className="relative h-full w-full -rotate-90">
            <defs>
              <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c5cfc" />
                <stop offset="55%" stopColor="#e465ad" />
                <stop offset="100%" stopColor="#2fbf9b" />
              </linearGradient>
            </defs>
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke="rgba(45,27,61,0.08)"
              strokeWidth="11"
            />
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-300 ease-out"
              opacity={status === 'idle' ? 0.35 : 1}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {Math.round(percent)}
              <span className="ml-0.5 text-lg font-semibold text-muted-foreground">
                %
              </span>
            </span>
            <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {status === 'idle'
                ? 'standby'
                : staged
                  ? 'staged'
                  : senderDelivered
                    ? 'delivered'
                    : receiverComplete
                      ? 'delivered'
                      : status === 'error'
                        ? 'stopped'
                        : 'in flight'}
            </span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-base font-bold text-foreground">{copy.label}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
            {fileName ? `${fileName} · ${formatBytes(fileSize)}` : copy.detail}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Stat
          icon={<Gauge className="h-4 w-4" />}
          label={direction === 'send' ? 'Upload speed' : 'Throughput'}
          value={active || finished ? formatSpeed(speed) : '—'}
        />
        <Stat
          icon={
            direction === 'receive' ? (
              <ArrowDownToLine className="h-4 w-4" />
            ) : (
              <ArrowUpFromLine className="h-4 w-4" />
            )
          }
          label={direction === 'send' ? 'Uploaded' : 'Transferred'}
          value={
            loaded > 0 || total > 0
              ? `${formatBytes(loaded)}${total > 0 ? ` / ${formatBytes(total)}` : ''}`
              : '—'
          }
          small
        />
        <Stat
          icon={<Clock3 className="h-4 w-4" />}
          label="Elapsed"
          value={elapsed > 0 ? formatDuration(elapsed) : '—'}
        />
        <Stat
          icon={<Timer className="h-4 w-4" />}
          label="ETA"
          value={
            active
              ? formatEta(loaded, total, speed)
              : staged
                ? 'Waiting'
                : senderDelivered || receiverComplete
                  ? 'Done'
                  : '—'
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-foreground/10 bg-white/60 p-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Waves className="h-3.5 w-3.5" />
            {direction === 'send' ? 'Upload trace' : 'Throughput trace'}
          </span>
          <span className="font-mono text-[11px] font-semibold text-muted-foreground">
            {safeSamples.length > 0 ? formatSpeed(speed) : 'no samples yet'}
          </span>
        </div>

        <div className="relative mt-2 h-16 w-full overflow-hidden">
          {safeSamples.length > 1 ? (
            <svg
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              {[10, 20, 30].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="rgba(45,27,61,0.06)"
                  strokeWidth="0.4"
                />
              ))}
              <path
                d={linePath}
                fill="none"
                stroke="#7c5cfc"
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {chartPoints.length > 0 && (
                <circle
                  cx={chartPoints[chartPoints.length - 1].x}
                  cy={36 - (chartPoints[chartPoints.length - 1].value / maxSample) * 30}
                  r="1.6"
                  fill="#e465ad"
                />
              )}
            </svg>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-foreground/15 bg-foreground/[0.02]">
              <div className="flex items-end gap-1" aria-hidden>
                {[5, 9, 6, 11, 7].map((height, index) => (
                  <span
                    key={index}
                    className="w-1.5 rounded-full bg-primary/25"
                    style={{ height }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Live samples appear during transfer
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                step.state === 'done'
                  ? 'border-secondary-foreground/20 bg-secondary text-secondary-foreground'
                  : step.state === 'active'
                    ? 'border-primary/30 bg-primary text-primary-foreground'
                    : step.state === 'waiting'
                      ? 'border-primary/25 bg-primary/10 text-primary'
                      : step.state === 'error'
                        ? 'border-destructive/30 bg-destructive/80 text-white'
                        : 'border-foreground/15 bg-white text-foreground/30'
              }`}
            >
              {step.state === 'done' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : step.state === 'active' ? (
                <Radio className="h-3 w-3 animate-pulse" />
              ) : step.state === 'waiting' ? (
                <Clock3 className="h-3 w-3" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            <span
              className={`text-xs font-semibold ${
                step.state === 'idle' ? 'text-muted-foreground/60' : 'text-foreground/80'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-foreground/10 pt-3.5 text-[11px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-primary" />
          TCP · socket stream
        </span>
        <span className="font-mono">
          {port ? `port ${port}` : 'port —'}
        </span>
      </div>
    </aside>
  )
}

function Stat({
  icon,
  label,
  value,
  small = false,
}: {
  icon: ReactNode
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-white/55 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 truncate font-bold tabular-nums text-foreground ${
          small ? 'text-xs' : 'text-base'
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

'use client'

import { ArrowDownToLine, ArrowUpFromLine, History, Trash2 } from 'lucide-react'

import { formatBytes } from '@/lib/format'
import type { HistoryEntry } from '@/lib/history'

interface SessionHistoryProps {
  entries: HistoryEntry[]
  onClear: () => void
}

export default function SessionHistory({
  entries,
  onClear,
}: SessionHistoryProps) {
  return (
    <div className="soft-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Session log
          </p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
            Recent handoffs
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            Kept locally in this browser. Nothing is sent to a server.
          </p>
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-white/60 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-white/35 px-4 py-7 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-white/70 text-primary">
            <History className="h-5 w-5" />
          </span>
          <p className="mt-3 text-xs font-bold text-foreground">
            No handoffs yet
          </p>
          <p className="mt-1 max-w-xs text-[11px] font-medium leading-relaxed text-muted-foreground">
            Share or receive a file and the session will be recorded here for
            your demo.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {entries.map((entry) => {
            const isSend = entry.direction === 'send'
            const isDelivered = isSend && entry.status === 'delivered'
            const Icon = isSend ? ArrowUpFromLine : ArrowDownToLine
            const chipLabel = isSend
              ? isDelivered
                ? 'Delivered'
                : 'Staged'
              : entry.status

            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-white/55 px-3 py-2.5 transition-colors hover:bg-white/80"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    isDelivered
                      ? 'border-secondary-foreground/15 bg-secondary/30 text-secondary-foreground'
                      : isSend
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-secondary-foreground/15 bg-secondary/30 text-secondary-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    {entry.fileName}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                    {formatBytes(entry.fileSize)}
                    {entry.code ? ` · code ${entry.code}` : ''}
                    {' · '}
                    {new Date(entry.at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                    isDelivered
                      ? 'bg-secondary/40 text-secondary-foreground'
                      : isSend
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/40 text-secondary-foreground'
                  }`}
                >
                  {chipLabel}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

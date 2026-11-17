export type HistoryDirection = 'send' | 'receive'
export type HistoryStatus = 'shared' | 'delivered' | 'received'

export interface HistoryEntry {
  id: string
  direction: HistoryDirection
  status: HistoryStatus
  fileName: string
  fileSize: number
  code: number | null
  at: number
}

const STORAGE_KEY = 'zipzapzoop.history.v1'
const MAX_ENTRIES = 6

export function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (entry): entry is HistoryEntry =>
          !!entry &&
          typeof entry.id === 'string' &&
          (entry.direction === 'send' || entry.direction === 'receive') &&
          typeof entry.fileName === 'string' &&
          typeof entry.fileSize === 'number' &&
          typeof entry.at === 'number',
      )
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES)),
    )
  } catch {
    /* storage may be unavailable; history is a nice-to-have */
  }
}

export function createHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'at'>,
): HistoryEntry {
  return {
    ...entry,
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: Date.now(),
  }
}

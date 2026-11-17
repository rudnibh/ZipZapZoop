export interface TransferProgress {
  loaded: number
  total: number
  elapsed: number
  speed: number
  samples: number[]
}

type ProgressHandler = (progress: TransferProgress) => void

const MAX_SAMPLES = 48

/**
 * Turns raw XHR progress events into elapsed time, a rolling speed estimate
 * and a small history that the UI can draw as a sparkline.
 */
function createReporter(onProgress: ProgressHandler) {
  const startedAt = performance.now()
  let lastSampleAt = startedAt
  let lastLoaded = 0
  let lastSpeed = 0
  const samples: number[] = []

  return (loaded: number, total: number) => {
    const now = performance.now()
    const secondsSinceSample = (now - lastSampleAt) / 1000

    if (secondsSinceSample >= 0.15) {
      lastSpeed = Math.max(0, (loaded - lastLoaded) / secondsSinceSample)
      samples.push(lastSpeed)
      if (samples.length > MAX_SAMPLES) samples.shift()
      lastSampleAt = now
      lastLoaded = loaded
    }

    onProgress({
      loaded,
      total,
      elapsed: (now - startedAt) / 1000,
      speed: lastSpeed,
      samples: [...samples],
    })
  }
}

function requestError(xhr: XMLHttpRequest, fallback: string): Error {
  if (xhr.status === 0) {
    return new Error('Could not reach the transfer server. Is the Java backend running?')
  }
  return new Error(`${fallback} (HTTP ${xhr.status})`)
}

export function uploadFile(
  file: File,
  onProgress: ProgressHandler,
): Promise<{ port: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const report = createReporter(onProgress)

    xhr.open('POST', '/api/upload')
    xhr.responseType = 'text'

    xhr.upload.onprogress = (event) => {
      report(event.loaded, event.total || file.size)
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(requestError(xhr, 'Upload failed'))
        return
      }

      try {
        const data = JSON.parse(xhr.responseText)
        if (typeof data?.port === 'number') {
          resolve({ port: data.port })
        } else {
          reject(new Error('The server did not return an invite code.'))
        }
      } catch {
        reject(new Error('The server returned an unreadable response.'))
      }
    }

    xhr.onerror = () => reject(requestError(xhr, 'Upload failed'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))

    const formData = new FormData()
    formData.append('file', file)
    xhr.send(formData)
  })
}

export interface DownloadResult {
  blob: Blob
  filename: string
}

export function downloadFile(
  port: number,
  onProgress: ProgressHandler,
): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const report = createReporter(onProgress)

    xhr.open('GET', `/api/download/${port}`)
    xhr.responseType = 'blob'

    xhr.onprogress = (event) => {
      report(event.loaded, event.lengthComputable ? event.total : 0)
    }

    xhr.onload = async () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let detail = ''
        try {
          detail = await xhr.response.text()
        } catch {
          /* ignore */
        }
        reject(
          new Error(
            detail?.trim() ||
              `No file answered on port ${port}. Check the code and try again.`,
          ),
        )
        return
      }

      const disposition = xhr.getResponseHeader('Content-Disposition') ?? ''
      const match = /filename="?([^";]+)"?/i.exec(disposition)
      const rawName = match?.[1] || `zipzapzoop-${port}`
      // The backend stores uploads as "<uuid>_<original name>"; show the
      // original name to the person downloading the file.
      const filename = rawName.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i,
        '',
      )

      resolve({
        blob: xhr.response as Blob,
        filename: filename || `zipzapzoop-${port}`,
      })
    }

    xhr.onerror = () => reject(requestError(xhr, 'Download failed'))
    xhr.onabort = () => reject(new Error('Download cancelled.'))

    xhr.send()
  })
}

export type TransferState = 'staged' | 'sending' | 'sent' | 'error'

export interface TransferStatus {
  port: number
  status: TransferState
}

const TRANSFER_STATES: TransferState[] = [
  'staged',
  'sending',
  'sent',
  'error',
]

/**
 * Reads the sender-side lifecycle state for a staged transfer. Returns null
 * when the backend no longer knows the code (for example, after a restart).
 */
export async function getTransferStatus(
  port: number,
): Promise<TransferStatus | null> {
  const response = await fetch(`/api/status/${port}`, { cache: 'no-store' })

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(
      `Could not read the transfer status (HTTP ${response.status}).`,
    )
  }

  const data = await response.json()
  if (
    typeof data?.port !== 'number' ||
    typeof data?.status !== 'string' ||
    !TRANSFER_STATES.includes(data.status as TransferState)
  ) {
    throw new Error('The server returned an unreadable status response.')
  }

  return { port: data.port, status: data.status as TransferState }
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

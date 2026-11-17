import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Quicksand } from 'next/font/google'

const quicksand = Quicksand({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ZipZapZoop — Send a file. Share a code.',
  description:
    'A peer-to-peer file handoff in five digits. Drop a file, share the code, and stream it over a direct TCP socket.',
  applicationName: 'ZipZapZoop',
  keywords: ['P2P', 'file transfer', 'TCP', 'sockets', 'computer networks'],
}

export const viewport: Viewport = {
  themeColor: '#FFF5F7',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={quicksand.className}>
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  )
}
import type { Metadata } from 'next'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'UniClear',
  description: 'University Clearance Management Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  )
}


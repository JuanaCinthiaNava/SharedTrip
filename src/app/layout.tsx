import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'SharedTrip',
  description: 'Tu bóveda de viaje compartida — boletos, itinerario y más.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-bg text-fg antialiased min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  )
}

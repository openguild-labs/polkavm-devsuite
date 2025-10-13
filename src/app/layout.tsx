import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/sonner'
import { ChainInitNotification } from '@/components/features/ChainInitNotification'
import './globals.css'

export const metadata: Metadata = {
  title: 'PolkaVM DevTool',
  description: 'Bridge Your Tokens to PolkaVM Asset Hub',
  generator: 'polkavm-tool',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
          <ChainInitNotification />
          {children}
          <Toaster />
      </body>
    </html>
  )
}

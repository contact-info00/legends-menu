import type { Metadata, Viewport } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { BrandColorsProvider } from '@/components/brand-colors-provider'

const inter = Inter({ subsets: ['latin'] })
const bebasNeue = Bebas_Neue({ 
  subsets: ['latin'],
  variable: '--font-bebas',
  weight: '400'
})

export const metadata: Metadata = {
  title: 'QR Restaurant Menu',
  description: 'Digital restaurant menu system',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${bebasNeue.variable}`}>
        <BrandColorsProvider />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}


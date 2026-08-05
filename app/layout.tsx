import type { Metadata, Viewport } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { BrandColorsProvider } from '@/components/brand-colors-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { getThemeLocalStorageBootstrapScript } from '@/lib/theme-bootstrap-script'
import { getUiSettings } from './layout-ui-settings'

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch UI settings server-side
  const uiSettings = await getUiSettings()
  
  // Create blocking script to set CSS variables immediately
  const uiSettingsScript = `
    (function() {
      const root = document.documentElement;
      root.style.setProperty('--menu-section-size', '${uiSettings.sectionTitleSize}px');
      root.style.setProperty('--menu-category-size', '${uiSettings.categoryTitleSize}px');
      root.style.setProperty('--menu-item-name-size', '${uiSettings.itemNameSize}px');
      root.style.setProperty('--menu-item-desc-size', '${uiSettings.itemDescriptionSize}px');
      root.style.setProperty('--menu-item-price-size', '${uiSettings.itemPriceSize}px');
      root.style.setProperty('--header-logo-size', '${uiSettings.headerLogoSize}px');
      root.style.setProperty('--bottom-nav-section-size', '${uiSettings.bottomNavSectionSize}px');
      root.style.setProperty('--bottom-nav-category-size', '${uiSettings.bottomNavCategorySize}px');
    })();
  `
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: uiSettingsScript }}
          suppressHydrationWarning
        />
        <script
          dangerouslySetInnerHTML={{ __html: getThemeLocalStorageBootstrapScript() }}
          suppressHydrationWarning
        />
      </head>
      <body className={`${inter.className} ${bebasNeue.variable}`}>
        <ThemeProvider />
        <BrandColorsProvider />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}


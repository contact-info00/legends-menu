import type { Metadata, Viewport } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { BrandColorsProvider } from '@/components/brand-colors-provider'
import { ThemeProvider } from '@/components/theme-provider'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Helper functions
                function hexToRgb(hex) {
                  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
                  return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                  } : null;
                }
                
                function getLuminance(hex) {
                  const rgb = hexToRgb(hex);
                  if (!rgb) return 0.5;
                  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
                    val = val / 255;
                    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
                  });
                  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
                }
                
                function adjustBrightness(hex, amount) {
                  const rgb = hexToRgb(hex);
                  if (!rgb) return hex;
                  const r = Math.max(0, Math.min(255, rgb.r + amount));
                  const g = Math.max(0, Math.min(255, rgb.g + amount));
                  const b = Math.max(0, Math.min(255, rgb.b + amount));
                  return '#' + [r, g, b].map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                  }).join('');
                }
                
                // Helper function to apply theme colors
                function applyThemeColors(bgColor) {
                  document.documentElement.style.setProperty('--app-bg', bgColor);
                  
                  const isLight = getLuminance(bgColor) > 0.5;
                  const rgb = hexToRgb(bgColor);
                  
                  if (rgb) {
                    if (isLight) {
                      document.documentElement.style.setProperty('--auto-text-primary', '#1a1a1a');
                      document.documentElement.style.setProperty('--auto-text-secondary', 'rgba(0, 0, 0, 0.7)');
                      document.documentElement.style.setProperty('--auto-surface-bg', 'rgba(0, 0, 0, 0.05)');
                      document.documentElement.style.setProperty('--auto-surface-bg-2', 'rgba(0, 0, 0, 0.02)');
                      document.documentElement.style.setProperty('--auto-border', 'rgba(0, 0, 0, 0.15)');
                      document.documentElement.style.setProperty('--auto-primary', adjustBrightness(bgColor, -40));
                      document.documentElement.style.setProperty('--auto-primary-hover', adjustBrightness(bgColor, -60));
                      const shadowR = Math.max(0, rgb.r - 50);
                      const shadowG = Math.max(0, rgb.g - 50);
                      const shadowB = Math.max(0, rgb.b - 50);
                      document.documentElement.style.setProperty('--auto-shadow-color', 'rgba(' + shadowR + ', ' + shadowG + ', ' + shadowB + ', 0.4)');
                      document.documentElement.style.setProperty('--auto-shadow-color-light', 'rgba(' + shadowR + ', ' + shadowG + ', ' + shadowB + ', 0.2)');
                    } else {
                      const lightness = getLuminance(bgColor);
                      document.documentElement.style.setProperty('--auto-text-primary', '#FFFFFF');
                      document.documentElement.style.setProperty('--auto-text-secondary', 'rgba(255, 255, 255, 0.9)');
                      document.documentElement.style.setProperty('--auto-surface-bg', 'rgba(255, 255, 255, ' + Math.min(0.2, 0.1 + (1 - lightness) * 0.1) + ')');
                      document.documentElement.style.setProperty('--auto-surface-bg-2', 'rgba(255, 255, 255, ' + Math.min(0.15, 0.05 + (1 - lightness) * 0.05) + ')');
                      document.documentElement.style.setProperty('--auto-border', 'rgba(255, 255, 255, ' + Math.min(0.3, 0.2 + (1 - lightness) * 0.1) + ')');
                      const primaryColor = adjustBrightness(bgColor, Math.min(60, 30 + (1 - lightness) * 30));
                      document.documentElement.style.setProperty('--auto-primary', primaryColor);
                      document.documentElement.style.setProperty('--auto-primary-hover', adjustBrightness(bgColor, Math.min(80, 50 + (1 - lightness) * 30)));
                      const shadowR = Math.max(0, rgb.r - 30);
                      const shadowG = Math.max(0, rgb.g - 30);
                      const shadowB = Math.max(0, rgb.b - 30);
                      document.documentElement.style.setProperty('--auto-shadow-color', 'rgba(' + shadowR + ', ' + shadowG + ', ' + shadowB + ', 0.5)');
                      document.documentElement.style.setProperty('--auto-shadow-color-light', 'rgba(' + shadowR + ', ' + shadowG + ', ' + shadowB + ', 0.3)');
                    }
                    document.documentElement.style.setProperty('--auto-primary-text', '#FFFFFF');
                    document.documentElement.style.setProperty('--auto-accent', '#FBBF24');
                    
                    // Generate glow colors from background color (not primary)
                    const glowOpacity = isLight ? 0.3 : 0.35;
                    document.documentElement.style.setProperty('--auto-primary-glow', 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + glowOpacity + ')');
                    document.documentElement.style.setProperty('--auto-primary-glow-strong', 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + (glowOpacity + 0.1) + ')');
                    document.documentElement.style.setProperty('--auto-primary-glow-subtle', 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + (glowOpacity - 0.1) + ')');
                    // Edge accent for left/right triangular accents
                    document.documentElement.style.setProperty('--auto-edge-accent', 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.4)');
                    // Lighter surface for buttons (slightly lighter than background)
                    const lighterR = Math.min(255, rgb.r + 20);
                    const lighterG = Math.min(255, rgb.g + 20);
                    const lighterB = Math.min(255, rgb.b + 20);
                    document.documentElement.style.setProperty('--auto-lighter-surface', 'rgba(' + lighterR + ', ' + lighterG + ', ' + lighterB + ', 0.9)');
                  }
                }
                
                // First, try to apply theme from localStorage immediately (no flash)
                try {
                  const cachedTheme = localStorage.getItem('theme-appBg');
                  if (cachedTheme) {
                    applyThemeColors(cachedTheme);
                  }
                } catch (e) {
                  // localStorage might not be available, continue
                }
                
                // Then fetch from API and update if different
                fetch('/api/theme')
                  .then(response => response.json())
                  .then(data => {
                    if (data.theme && data.theme.appBg) {
                      const bgColor = data.theme.appBg;
                      applyThemeColors(bgColor);
                      // Cache in localStorage for next page load
                      try {
                        localStorage.setItem('theme-appBg', bgColor);
                      } catch (e) {
                        // localStorage might not be available
                      }
                    }
                  })
                  .catch(e => {
                    console.error('Error applying theme:', e);
                  });
              })();
            `,
          }}
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


import localFont from 'next/font/local'

export const kurdishMenuFont = localFont({
  src: [
    {
      path: '../public/fonts/rudaw/rudawregular2.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/rudaw/rudawbold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-kurdish-menu',
  display: 'swap',
  preload: false,
  fallback: ['Tahoma', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: false,
})

/** Apply on Kurdish menu text nodes so the loaded Rudaw face is always used. */
export const kurdishMenuFontClassName = kurdishMenuFont.className

import localFont from 'next/font/local'

export const kurdishMenuFont = localFont({
  src: [
    {
      path: '../public/fonts/rudaw/rudawregular2.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/rudaw/rudawbold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-kurdish-menu',
  display: 'swap',
  fallback: ['Tahoma', 'Segoe UI', 'sans-serif'],
})

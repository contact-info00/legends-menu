import { type Language } from '@/lib/i18n'
import { kurdishMenuFontClassName } from '@/lib/kurdish-menu-font'
import { cn } from '@/lib/utils'

/** Typography helper for customer menu localized script text. */
export function menuScriptTextClassName(lang: Language, className?: string): string {
  return cn(className, lang === 'ku' && 'menu-kurdish-text', lang === 'ku' && kurdishMenuFontClassName)
}

export function menuScriptTextAttributes(lang: Language): {
  lang?: string
  dir?: 'rtl' | 'ltr'
} {
  if (lang === 'ku') {
    return { lang: 'ckb', dir: 'rtl' }
  }

  return {}
}

export function menuLocalizedTextProps(lang: Language, className?: string) {
  return {
    className: menuScriptTextClassName(lang, className),
    ...menuScriptTextAttributes(lang),
  }
}

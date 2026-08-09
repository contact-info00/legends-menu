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

type ItemNameWeight = 'semibold' | 'bold' | 'medium'

/**
 * Item titles only. Kurdish names use Regular (400) + line-clamp truncation so
 * Arabic-script shaping matches descriptions. English/Arabic keep bold weights.
 */
export function menuItemNameLocalizedTextProps(
  lang: Language,
  className?: string,
  enArWeight: ItemNameWeight = 'semibold'
) {
  const weightClass = lang === 'ku' ? 'font-normal' : `font-${enArWeight}`
  const truncationClass =
    lang === 'ku' ? 'menu-item-name-truncate min-w-0 w-full' : 'truncate min-w-0 w-full'

  return menuLocalizedTextProps(
    lang,
    cn('menu-item-name-text', weightClass, truncationClass, className)
  )
}

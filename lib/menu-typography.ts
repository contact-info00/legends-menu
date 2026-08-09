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

function menuShapedLabelClassName(
  lang: Language,
  className: string | undefined,
  enArWeight: ItemNameWeight,
  options: { truncate?: boolean } = {}
): string {
  const weightClass = lang === 'ku' ? 'font-normal' : `font-${enArWeight}`
  const truncationClass = options.truncate
    ? lang === 'ku'
      ? 'menu-item-name-truncate min-w-0 w-full'
      : 'truncate min-w-0 w-full'
    : ''

  let extra = className ?? ''
  if (lang === 'ku') {
    extra = extra
      .replace(/\bfont-(semibold|bold|medium|normal)\b/g, '')
      .replace(/\bwhitespace-nowrap\b/g, '')
      .replace(/\btruncate\b/g, '')
      .trim()
  }

  return cn('menu-item-name-text', weightClass, truncationClass, extra)
}

/**
 * Item titles only. Kurdish names use Regular (400) + line-clamp truncation so
 * Arabic-script shaping matches descriptions. English/Arabic keep bold weights.
 */
export function menuItemNameLocalizedTextProps(
  lang: Language,
  className?: string,
  enArWeight: ItemNameWeight = 'semibold'
) {
  return menuLocalizedTextProps(
    lang,
    menuShapedLabelClassName(lang, className, enArWeight, { truncate: true })
  )
}

/**
 * Category titles on the menu page. Same Kurdish shaping rules as item names.
 */
export function menuCategoryNameLocalizedTextProps(
  lang: Language,
  className?: string,
  enArWeight: ItemNameWeight = 'semibold'
) {
  return menuLocalizedTextProps(lang, menuShapedLabelClassName(lang, className, enArWeight))
}

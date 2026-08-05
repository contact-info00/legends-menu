import { generateColorScheme, normalizeToHex } from '@/lib/color-utils'
import type { MenuTheme, MenuUiSettings } from '@/lib/menu-types'

function cssVar(name: string, value: string | number): string {
  return `${name}:${value};`
}

function buildAutoColorVars(appBg: string): string {
  const hexColor = normalizeToHex(appBg)
  const scheme = generateColorScheme(hexColor)
  const lines: string[] = [cssVar('--app-bg', appBg)]

  Object.entries(scheme).forEach(([key, value]) => {
    let varName = `--auto-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    if (key === 'edgeAccent') varName = '--auto-edge-accent'
    if (key === 'lighterSurface') varName = '--auto-lighter-surface'
    lines.push(cssVar(varName, value))
  })

  return lines.join('')
}

export function buildMenuThemeStyleTag(
  theme: MenuTheme | null | undefined,
  uiSettings: MenuUiSettings
): string {
  const appBg = theme?.appBg || '#400810'
  const rules: string[] = [
    buildAutoColorVars(appBg),
    cssVar('--menu-section-size', `${uiSettings.sectionTitleSize}px`),
    cssVar('--menu-category-size', `${uiSettings.categoryTitleSize}px`),
    cssVar('--menu-item-name-size', `${uiSettings.itemNameSize}px`),
    cssVar('--menu-item-description-size', `${uiSettings.itemDescriptionSize}px`),
    cssVar('--menu-item-price-size', `${uiSettings.itemPriceSize}px`),
    cssVar('--header-logo-size', `${uiSettings.headerLogoSize}px`),
    cssVar('--bottom-nav-section-size', `${uiSettings.bottomNavSectionSize}px`),
    cssVar('--bottom-nav-category-size', `${uiSettings.bottomNavCategorySize}px`),
  ]

  if (theme?.itemNameTextColor) {
    rules.push(cssVar('--item-name-text-color', theme.itemNameTextColor))
  }
  if (theme?.itemPriceTextColor) {
    rules.push(cssVar('--item-price-text-color', theme.itemPriceTextColor))
  }
  if (theme?.itemDescriptionTextColor) {
    rules.push(cssVar('--item-description-text-color', theme.itemDescriptionTextColor))
  }
  if (theme?.bottomNavSectionNameColor) {
    rules.push(cssVar('--bottom-nav-section-name-color', theme.bottomNavSectionNameColor))
  }
  if (theme?.categoryNameColor) {
    rules.push(cssVar('--category-name-color', theme.categoryNameColor))
  }
  if (theme?.headerFooterBgColor) {
    rules.push(cssVar('--header-footer-bg-color', theme.headerFooterBgColor))
  }
  if (theme?.glassTintColor) {
    rules.push(cssVar('--glass-tint-color', theme.glassTintColor))
  }

  return `:root{${rules.join('')}}`
}

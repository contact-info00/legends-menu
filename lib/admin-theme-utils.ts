/**
 * Utility function to get admin panel styling that adapts to theme
 */
export function getAdminPanelStyles() {
  return {
    headerBg: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
    headerBorder: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
    headerText: 'var(--auto-text-primary, #FFFFFF)',
    cardBg: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
    cardBorder: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
    cardShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
    buttonBg: 'var(--auto-primary, #800020)',
    buttonHover: 'var(--auto-primary-hover, #A00028)',
    buttonText: 'var(--auto-primary-text, #FFFFFF)',
  }
}


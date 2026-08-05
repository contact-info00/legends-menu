interface PoweredByFooterProps {
  footerLogoUrl?: string | null
}

const PLATFORM_URL = 'https://www.menuzin.com'

export function PoweredByFooter({ footerLogoUrl }: PoweredByFooterProps) {
  // Don't render if no logo is provided
  if (!footerLogoUrl) {
    return null
  }

  return (
    <footer
      className="fixed left-0 right-0 z-10 w-full"
      style={{
        bottom: 0,
        backgroundColor: 'transparent',
        borderTop: 'none',
        paddingTop: 'calc(4px + env(safe-area-inset-bottom, 0))',
        paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0))',
      }}
    >
      <a
        href={PLATFORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-1 px-4 w-full"
        style={{
          color: 'var(--auto-text-primary, #FFFFFF)',
          textDecoration: 'none',
        }}
      >
        <span className="text-sm font-medium">Powered by</span>
        {footerLogoUrl && (
          <img
            src={footerLogoUrl}
            alt="Menuzin"
            className="h-4 w-auto object-contain"
            style={{ 
              maxHeight: '18px',
              width: 'auto',
              height: '18px',
              aspectRatio: '60/18'
            }}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        )}
      </a>
    </footer>
  )
}


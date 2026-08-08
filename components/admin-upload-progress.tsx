'use client'

interface AdminUploadProgressProps {
  label?: string
  progress: number | null
  className?: string
}

export function AdminUploadProgress({
  label = 'Uploading...',
  progress,
  className = '',
}: AdminUploadProgressProps) {
  const showBar = typeof progress === 'number'

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-sm font-medium" style={{ color: '#0F172A' }}>
        <span>{label}</span>
        {showBar ? <span>{progress}%</span> : null}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: '#E2E8F0' }}
      >
        {showBar ? (
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              backgroundColor: '#27C499',
            }}
          />
        ) : (
          <div
            className="h-full w-1/3 rounded-full animate-pulse"
            style={{ backgroundColor: '#27C499' }}
          />
        )}
      </div>
    </div>
  )
}

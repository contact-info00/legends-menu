export default function NotFound() {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
      <div className="text-center px-6">
        <h1 className="text-2xl font-semibold text-white mb-4">Restaurant not found</h1>
        <p className="text-white/80">The restaurant you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    </div>
  )
}


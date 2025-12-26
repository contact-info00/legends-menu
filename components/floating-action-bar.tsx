'use client'

import { Search, MessageSquare } from 'lucide-react'

interface FloatingActionBarProps {
  onSearchClick: () => void
  onFeedbackClick: () => void
}

export function FloatingActionBar({
  onSearchClick,
  onFeedbackClick,
}: FloatingActionBarProps) {
  return (
    <div className="relative z-20 px-2 sm:px-4 py-4 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="relative inline-block w-full max-w-full">
          {/* Triangular background shape with rounded edges */}
          <div className="relative px-3 sm:px-6 py-3 bg-gradient-to-r from-[#800020]/30 to-[#5C0015]/30 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg w-full overflow-hidden">
            {/* Left triangular accent */}
            <div 
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: '1.125rem',
                background: 'linear-gradient(to right, rgba(128, 0, 32, 0.4), transparent)',
                clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                borderRadius: '0.75rem 0 0 0.75rem'
              }}
            ></div>
            {/* Right triangular accent */}
            <div 
              className="absolute right-0 top-0 bottom-0"
              style={{
                width: '1.125rem',
                background: 'linear-gradient(to left, rgba(92, 0, 21, 0.4), transparent)',
                clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                borderRadius: '0 0.75rem 0.75rem 0'
              }}
            ></div>
            
            {/* Buttons - Horizontal layout */}
            <div className="flex gap-1.5 sm:gap-2 items-center relative justify-between w-full">
              {/* Search icon - larger box, icon on left with text */}
              <button
                onClick={onSearchClick}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-sm h-8 flex items-center justify-start pl-1.5 gap-1.5 sm:gap-2 px-2 sm:px-3 flex-1 min-w-0"
                aria-label="Search"
              >
                <Search className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white text-xs sm:text-sm font-medium truncate">Search</span>
              </button>
              
              {/* Other icons on the right */}
              <div className="flex gap-1.5 sm:gap-2 items-center flex-shrink-0">
                <button
                  onClick={onFeedbackClick}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-sm w-10 h-10 flex items-center justify-center"
                  aria-label="Feedback"
                >
                  <MessageSquare className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


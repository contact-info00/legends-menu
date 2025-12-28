'use client'

import { useState, useEffect } from 'react'
import { ShoppingBasket } from 'lucide-react'

interface AnimatedBasketIconProps {
  itemCount: number
  onBasketClick: () => void
  shouldAnimate: boolean
  onAnimationComplete: () => void
  isFirstAdd: boolean
}

export function AnimatedBasketIcon({
  itemCount,
  onBasketClick,
  shouldAnimate,
  onAnimationComplete,
  isFirstAdd,
}: AnimatedBasketIconProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (itemCount > 0) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [itemCount])

  useEffect(() => {
    // Only animate on first add
    if (shouldAnimate && isFirstAdd && itemCount > 0) {
      setIsAnimating(true)
      
      // Complete animation after duration
      const timer = setTimeout(() => {
        setIsAnimating(false)
        onAnimationComplete()
      }, 800) // Animation duration
      
      return () => clearTimeout(timer)
    }
  }, [shouldAnimate, isFirstAdd, itemCount, onAnimationComplete])

  if (!isVisible || itemCount === 0) return null

  return (
    <button
      onClick={onBasketClick}
      className={`fixed right-2 sm:right-6 top-1/2 z-40 p-2 sm:p-3 rounded-xl transition-all backdrop-blur-sm border relative ${
        isAnimating ? 'basket-rise-animation' : '-translate-y-1/2'
      }`}
      style={{
        position: 'fixed',
        right: 'clamp(0.5rem, 2vw, 1.5rem)',
        top: '50%',
        transform: isAnimating ? undefined : 'translateY(-50%)',
        zIndex: 40,
        maxWidth: 'calc(100vw - 1rem)',
        backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
        borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
        boxShadow: `0 4px 6px -1px var(--auto-shadow-color, rgba(0, 0, 0, 0.3))`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.15))'
        e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.3))'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))'
        e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.2))'
      }}
      aria-label="Basket"
    >
      <ShoppingBasket 
        className="w-5 h-5" 
        style={{ color: 'var(--auto-text-primary, #FFFFFF)' }} 
      />
      {itemCount > 0 && (
        <span 
          className="absolute -top-2 -right-2 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2"
          style={{
            backgroundColor: 'var(--app-bg, #400810)',
            color: 'var(--auto-text-primary, #FFFFFF)',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            boxShadow: `0 4px 6px -1px var(--auto-shadow-color, rgba(0, 0, 0, 0.3))`,
          }}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  )
}


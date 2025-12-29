'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Login successful!')
        router.push(`/${slug}/admin-portal`)
      } else {
        toast.error(data.error || 'Invalid PIN')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Failed to login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
      <div 
        className="backdrop-blur-xl rounded-3xl border p-8 w-full max-w-md"
        style={{
          backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          boxShadow: `0 20px 50px -12px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 8px 16px -4px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
        }}
      >
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg border border-white/20"
            style={{
              backgroundColor: 'var(--app-bg, #400810)',
            }}
          >
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Admin Login
          </h1>
          <p className="text-white/70">Enter your 4-digit PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              if (value.length <= 4) {
                setPin(value)
              }
            }}
            placeholder="0000"
            className="text-center text-2xl tracking-widest"
            autoFocus
            required
          />

          <Button
            type="submit"
            variant="ghost"
            disabled={isLoading || pin.length !== 4}
            className="w-full"
            size="lg"
            style={{
              backgroundColor: 'var(--app-bg, #400810)',
              color: 'var(--auto-text-primary, #FFFFFF)',
            }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(`/${slug}/menu`)}
            className="text-white/70 hover:text-white transition-colors text-sm"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}


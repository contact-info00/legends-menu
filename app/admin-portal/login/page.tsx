'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const router = useRouter()
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
        router.push('/admin-portal')
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#400810' }}>
      <div className="backdrop-blur-xl bg-[#400810]/95 rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#800020] to-[#5C0015] mb-4 shadow-lg border border-white/20">
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
            disabled={isLoading || pin.length !== 4}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/menu')}
            className="text-white/70 hover:text-white transition-colors text-sm"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}


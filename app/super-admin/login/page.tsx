'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/super-admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Login successful!')
        router.push('/super-admin')
        router.refresh()
      } else {
        toast.error(data.error || 'Login failed')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="bg-[#0b0b0b] rounded-3xl border border-[#222] p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg border border-[#222] bg-[#111]">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Super Admin Login
          </h1>
          <p className="text-gray-400">Enter your super admin PIN</p>
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
            className="text-center text-2xl tracking-widest bg-[#111] border-[#222] text-white placeholder:text-gray-500"
            autoFocus
            required
          />

          <Button
            type="submit"
            disabled={isLoading || pin.length !== 4}
            className="w-full bg-[#222] hover:bg-[#333] border border-[#333] text-white"
            size="lg"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  )
}


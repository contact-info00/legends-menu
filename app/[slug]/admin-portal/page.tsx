'use client'

import { useRouter, useParams } from 'next/navigation'
import { Menu, MessageSquare, Settings, LogOut, Type, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      toast.success('Logged out successfully')
      router.push(`/${slug}/admin-portal/login`)
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
    }
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
      <div className="max-w-4xl mx-auto">
        <div 
          className="flex items-center justify-between mb-8 backdrop-blur-xl rounded-2xl p-4 border"
          style={{
            backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
          }}
        >
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <Button 
            onClick={handleLogout} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => router.push(`/${slug}/admin-portal/menu-builder`)}
            className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl hover:scale-[1.02] hover:bg-white/[0.12] transition-all text-left group"
            style={{
              boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Menu className="w-8 h-8 text-[#FBBF24] mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-bold text-white mb-2">
              Menu Builder
            </h2>
            <p className="text-white/90">
              Manage sections, categories, and items
            </p>
          </button>

          <button
            onClick={() => router.push(`/${slug}/admin-portal/feedback`)}
            className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl hover:scale-[1.02] hover:bg-white/[0.12] transition-all text-left group"
            style={{
              boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <MessageSquare className="w-8 h-8 text-[#FBBF24] mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-bold text-white mb-2">
              Feedback
            </h2>
            <p className="text-white/90">
              View customer feedback
            </p>
          </button>

          <button
            onClick={() => router.push(`/${slug}/admin-portal/settings`)}
            className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl hover:scale-[1.02] hover:bg-white/[0.12] transition-all text-left group"
            style={{
              boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Settings className="w-8 h-8 text-[#FBBF24] mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-bold text-white mb-2">
              Settings
            </h2>
            <p className="text-white/90">
              Restaurant settings and preferences
            </p>
          </button>

          <button
            onClick={() => router.push(`/${slug}/admin-portal/typography`)}
            className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl hover:scale-[1.02] hover:bg-white/[0.12] transition-all text-left group"
            style={{
              boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Type className="w-8 h-8 text-[#FBBF24] mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-bold text-white mb-2">
              Typography
            </h2>
            <p className="text-white/90">
              Customize font sizes and UI appearance
            </p>
          </button>

          <button
            onClick={() => router.push(`/${slug}/admin-portal/theme`)}
            className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl hover:scale-[1.02] hover:bg-white/[0.12] transition-all text-left group"
            style={{
              boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Palette className="w-8 h-8 text-[#FBBF24] mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-bold text-white mb-2">
              Theme & Colors
            </h2>
            <p className="text-white/90">
              Customize colors for the entire site
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}


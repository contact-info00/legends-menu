'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Feedback {
  id: string
  staffRating: number
  serviceRating: number
  hygieneRating: number
  satisfactionEmoji: string | null
  phoneNumber: string | null
  tableNumber: string | null
  comment: string | null
  createdAt: string
}

export default function FeedbackPage() {
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch('/api/admin/feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedbacks(data.feedbacks || [])
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-[var(--price-text)] text-[var(--price-text)]'
                : 'text-white/50'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#400810' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 backdrop-blur-xl bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/20 shadow-lg">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Customer Feedback</h1>
          <Button 
            onClick={() => router.push('/admin')} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center text-white py-12">Loading feedback...</div>
        ) : feedbacks.length === 0 ? (
          <div className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl p-12 text-center text-white/70 border border-white/20 shadow-lg">
            No feedback received yet
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl transition-all"
                style={{
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-white/70 mb-1">Staff</div>
                        {renderStars(feedback.staffRating)}
                      </div>
                      <div>
                        <div className="text-sm text-white/70 mb-1">Service</div>
                        {renderStars(feedback.serviceRating)}
                      </div>
                      <div>
                        <div className="text-sm text-white/70 mb-1">Hygiene</div>
                        {renderStars(feedback.hygieneRating)}
                      </div>
                    </div>
                    {feedback.satisfactionEmoji && (
                      <div className="text-2xl mb-2">{feedback.satisfactionEmoji}</div>
                    )}
                    {feedback.comment && (
                      <p className="text-white mb-2">
                        {feedback.comment}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm text-white/70">
                      {feedback.phoneNumber && (
                        <span>Phone: {feedback.phoneNumber}</span>
                      )}
                      {feedback.tableNumber && (
                        <span>Table: {feedback.tableNumber}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-white/70">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Language } from '@/lib/i18n'

const emojis = ['😍', '😊', '😐', '😕', '😢']

export default function FeedbackPage() {
  const router = useRouter()
  const [currentLang, setCurrentLang] = useState<Language>('en')
  const [staffRating, setStaffRating] = useState(0)
  const [serviceRating, setServiceRating] = useState(0)
  const [hygieneRating, setHygieneRating] = useState(0)
  const [satisfactionEmoji, setSatisfactionEmoji] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('language')
    if (savedLang) {
      setCurrentLang(savedLang as Language)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffRating,
          serviceRating,
          hygieneRating,
          satisfactionEmoji: satisfactionEmoji || null,
          phoneNumber: phoneNumber || null,
          tableNumber: tableNumber || null,
          comment: comment || null,
        }),
      })

      if (response.ok) {
        alert('Thank you for your feedback!')
        router.push('/menu')
      } else {
        alert('Failed to submit feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 sm:w-8 sm:h-8 ${
                star <= rating
                  ? 'fill-[#FBBF24] text-[#FBBF24]'
                  : 'text-white/30'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#400810' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 shadow-lg">
          <button
            onClick={() => router.push('/menu')}
            className="text-white/70 hover:text-white transition-colors mb-4 text-sm sm:text-base"
          >
            ← Back to Menu
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Feedback</h1>
          <p className="text-white/70">We value your opinion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Star Ratings */}
          <div className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-lg border border-white/30 space-y-4 sm:space-y-6">
            <div>
              <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                Staff Rating
              </label>
              {renderStars(staffRating, setStaffRating)}
            </div>

            <div>
              <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                Service Rating
              </label>
              {renderStars(serviceRating, setServiceRating)}
            </div>

            <div>
              <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                Hygiene Rating
              </label>
              {renderStars(hygieneRating, setHygieneRating)}
            </div>
          </div>

          {/* Emoji Satisfaction */}
          <div className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-lg border border-white/30">
            <label className="block text-white font-semibold mb-4 text-sm sm:text-base">
              Overall Satisfaction
            </label>
            <div className="flex gap-2 sm:gap-4">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSatisfactionEmoji(emoji)}
                  className={`text-3xl sm:text-4xl p-2 rounded-lg transition-all ${
                    satisfactionEmoji === emoji
                      ? 'bg-white/20 scale-110'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Fields */}
          <div className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-lg border border-white/30 space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                Phone Number (Optional)
              </label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+964 750 123 4567"
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                Table Number (Optional)
              </label>
              <Input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Table 5"
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full h-32 rounded-xl border border-white/20 backdrop-blur-sm bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                placeholder="Tell us more about your experience..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || staffRating === 0 || serviceRating === 0 || hygieneRating === 0}
            className="w-full bg-gradient-to-r from-[#800020] to-[#5C0015] text-white hover:opacity-90 text-sm sm:text-base"
            size="lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </div>
    </div>
  )
}


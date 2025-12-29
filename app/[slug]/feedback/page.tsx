'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Language } from '@/lib/i18n'

const emojis = ['😍', '😊', '😐', '😕', '😢']

export default function FeedbackPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
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
        router.push(`/${slug}/menu`)
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
              className="w-6 h-6 sm:w-8 sm:h-8 transition-colors"
              style={{
                fill: star <= rating ? 'var(--auto-accent, #FBBF24)' : 'transparent',
                color: star <= rating ? 'var(--auto-accent, #FBBF24)' : 'var(--auto-muted, rgba(255, 255, 255, 0.5))',
              }}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
      <div className="max-w-2xl mx-auto">
        <div 
          className="mb-6 backdrop-blur-xl rounded-2xl p-4 border"
          style={{
            backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
          }}
        >
          <button
            onClick={() => router.push(`/${slug}/menu`)}
            className="mb-4 text-sm sm:text-base transition-colors"
            style={{ color: 'var(--auto-text-secondary, rgba(255, 255, 255, 0.9))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--auto-text-primary, #FFFFFF)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--auto-text-secondary, rgba(255, 255, 255, 0.9))'
            }}
          >
            ← Back to Menu
          </button>
          <h1 
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
          >
            Feedback
          </h1>
          <p style={{ color: 'var(--auto-text-secondary, rgba(255, 255, 255, 0.9))' }}>
            We value your opinion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Star Ratings */}
          <div 
            className="backdrop-blur-xl rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6"
            style={{
              backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
            }}
          >
            <div>
              <label 
                className="block font-semibold mb-2 text-sm sm:text-base"
                style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
              >
                Staff Rating
              </label>
              {renderStars(staffRating, setStaffRating)}
            </div>

            <div>
              <label 
                className="block font-semibold mb-2 text-sm sm:text-base"
                style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
              >
                Service Rating
              </label>
              {renderStars(serviceRating, setServiceRating)}
            </div>

            <div>
              <label 
                className="block font-semibold mb-2 text-sm sm:text-base"
                style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
              >
                Hygiene Rating
              </label>
              {renderStars(hygieneRating, setHygieneRating)}
            </div>
          </div>

          {/* Emoji Satisfaction */}
          <div 
            className="backdrop-blur-xl rounded-2xl p-4 sm:p-6"
            style={{
              backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
            }}
          >
            <label 
              className="block font-semibold mb-4 text-sm sm:text-base"
              style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
            >
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
                      ? 'scale-110'
                      : ''
                  }`}
                  style={{
                    backgroundColor: satisfactionEmoji === emoji
                      ? 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.15))'
                      : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (satisfactionEmoji !== emoji) {
                      e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (satisfactionEmoji !== emoji) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Fields */}
          <div 
            className="backdrop-blur-xl rounded-2xl p-4 sm:p-6 space-y-4"
            style={{
              backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
            }}
          >
            <div>
              <label 
                className="block font-semibold mb-2 text-sm sm:text-base"
                style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
              >
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
              <label 
                className="block font-semibold mb-2 text-sm sm:text-base"
                style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
              >
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
              <label 
                className="block font-semibold mb-2 text-sm sm:text-base"
                style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
              >
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full h-32 rounded-xl border backdrop-blur-sm px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))',
                  borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                  color: 'var(--auto-text-primary, #FFFFFF)',
                }}
                placeholder="Tell us more about your experience..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || staffRating === 0 || serviceRating === 0 || hygieneRating === 0}
            className="w-full text-sm sm:text-base"
            style={{
              backgroundColor: 'var(--auto-primary, #800020)',
              color: 'var(--auto-primary-text, #FFFFFF)',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = 'var(--auto-primary-hover, #A00028)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--auto-primary, #800020)'
            }}
            size="lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </div>
    </div>
  )
}


'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import StarRating from '@/components/ui/StarRating'
import { useI18n } from '@/lib/i18n/useI18n'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { MAX_RATING_COMMENT_LENGTH } from '@/lib/ratings/validation'
import { PageLoader } from '@/components/ui/LoadingSpinner'

interface RatingRecord {
  id: string
  rater_user_id: string
  stars: number
  comment?: string | null
  created_at?: string
}

export default function BookingRatingPage({
  params
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = use(params)
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [existingRating, setExistingRating] = useState<RatingRecord | null>(null)
  const [dashboardPath, setDashboardPath] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      setSuccessMessage(null)

      const supabase = supabaseBrowserClient()
      if (!supabase) {
        if (active) {
          setError(t('error.auth_required'))
          setLoading(false)
        }
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (active) {
          setError(t('error.auth_required'))
          setLoading(false)
        }
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('auth_user_id', session.user.id)
        .single()

      if (!profile || profileError) {
        if (active) {
          setError(t('error.profile_not_found'))
          setLoading(false)
        }
        return
      }

      if (active) {
        setDashboardPath(profile.role === 'vendor' ? '/vendor/dashboard' : '/customer/dashboard')
      }

      const response = await fetch(`/api/ratings/booking/${bookingId}`, {
        headers: {
          'Accept-Language': locale
        }
      })
      const payload = await response.json()

      if (!response.ok) {
        if (active) {
          setError(payload.error || t('rating.load_failed'))
          setLoading(false)
        }
        return
      }

      const ratings: RatingRecord[] = Array.isArray(payload.ratings) ? payload.ratings : []
      const mine = ratings.find((rating) => rating.rater_user_id === profile.id) || null

      if (active) {
        if (mine) {
          setExistingRating(mine)
          setStars(mine.stars)
          setComment(mine.comment || '')
        }
        setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [locale, bookingId, t])

  const handleSubmit = async () => {
    if (submitting) return
    if (stars <= 0) {
      setError(t('rating.select_stars'))
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale
        },
        body: JSON.stringify({
          booking_id: bookingId,
          stars,
          comment: comment.trim() || undefined
        })
      })

      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || t('error.rating_create_failed'))
        return
      }

      setExistingRating({
        id: payload.rating?.id || bookingId,
        rater_user_id: '',
        stars: payload.rating?.stars ?? stars,
        comment: payload.rating?.comment ?? comment
      })
      setSuccessMessage(t('rating.submitted'))
    } catch (submitError) {
      console.error('Rating submit failed:', submitError)
      setError(t('error.rating_create_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <PageLoader text={t('rating.loading')} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">{t('rating.title')}</h1>
            <p className="text-sm text-gray-600">{t('rating.subtitle')}</p>
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          {successMessage && (
            <div className="text-sm text-green-600">{successMessage}</div>
          )}

          {existingRating ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-700">{t('rating.already_submitted')}</div>
              <StarRating value={existingRating.stars} readonly size="large" />
              {existingRating.comment && (
                <div className="text-sm text-gray-600">{existingRating.comment}</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('rating.stars_label')}
                </label>
                <StarRating value={stars} onChange={setStars} size="large" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('rating.comment_label')}
                </label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t('rating.comment_placeholder')}
                  maxLength={MAX_RATING_COMMENT_LENGTH}
                  rows={4}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500">
                  {comment.length}/{MAX_RATING_COMMENT_LENGTH}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? t('rating.submitting') : t('rating.submit')}
              </button>
            </div>
          )}

          {dashboardPath && (
            <Link href={dashboardPath} className="text-sm text-blue-600 hover:text-blue-700">
              {t('rating.back_to_bookings')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

import ReviewModeration from '@/components/admin/ReviewModeration'

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Review Moderation</h1>
        <p className="mt-2 text-gray-600">
          Manage and moderate customer reviews to maintain quality and prevent spam.
        </p>
      </div>
      
      <ReviewModeration />
    </div>
  )
}

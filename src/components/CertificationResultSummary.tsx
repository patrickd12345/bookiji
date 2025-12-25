'use client'

interface CertificationResult {
  status: 'pass' | 'fail'
  timestamp: string
  attacks_covered: string[]
  duration_seconds: number
  failure_reason?: string
  snapshot_path?: string
}

interface CertificationResultSummaryProps {
  result: CertificationResult
}

export default function CertificationResultSummary({ result }: CertificationResultSummaryProps) {
  const isPass = result.status === 'pass'

  return (
    <div className={`border rounded-lg p-4 sm:p-6 ${isPass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold">
          {isPass ? (
            <span className="text-green-800">✓ PASS</span>
          ) : (
            <span className="text-red-800">✗ FAIL</span>
          )}
        </h2>
        <span className="text-xs sm:text-sm text-gray-600">
          {new Date(result.timestamp).toLocaleString()}
        </span>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Attacks Covered */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Attacks Covered</h3>
          <div className="flex flex-wrap gap-2">
            {result.attacks_covered.map((attack, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-white rounded border text-xs sm:text-sm"
              >
                {attack}
              </span>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <p className="text-xs sm:text-sm text-gray-600">
            Duration: {Math.round(result.duration_seconds)} seconds
          </p>
        </div>

        {/* Failure Details */}
        {!isPass && result.failure_reason && (
          <div className="bg-white rounded p-3 sm:p-4 border border-red-300">
            <h3 className="text-sm sm:text-base font-semibold text-red-800 mb-2">Failure Reason</h3>
            <p className="text-xs sm:text-sm text-red-700">{result.failure_reason}</p>
            {result.snapshot_path && (
              <p className="text-xs text-gray-600 mt-2 break-all">
                Snapshot: {result.snapshot_path}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


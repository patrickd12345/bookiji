'use client'

import { useState, useEffect } from 'react'

export default function CertTestPage() {
  const [value, setValue] = useState(0)

  useEffect(() => {
    // Load persisted value from localStorage
    const stored = localStorage.getItem('e2e-cert-value')
    if (stored) {
      setValue(parseInt(stored, 10))
    }
  }, [])

  const handleIncrement = () => {
    const newValue = value + 1
    setValue(newValue)
    localStorage.setItem('e2e-cert-value', newValue.toString())
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">E2E Certification Test Page</h1>
        <div className="space-y-4">
          <div>
            <p className="text-gray-600 mb-2">Current value:</p>
            <p data-test="value" data-value={value} className="text-3xl font-bold text-blue-600">
              {value}
            </p>
          </div>
          <button
            onClick={handleIncrement}
            data-test="increment"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Increment
          </button>
        </div>
      </div>
    </div>
  )
}


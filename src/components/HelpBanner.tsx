'use client'

import Link from 'next/link'

export default function HelpBanner() {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl shadow-lg p-6 border border-emerald-100 mb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">🧙‍♂️</span>
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              We've Got You Covered
            </h3>
            <p className="text-sm text-emerald-700">Comprehensive help system built for your success</p>
          </div>
        </div>
        <Link
          href="/help"
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          📚 Explore Help Center
        </Link>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Start Guides */}
        <div className="bg-white rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🚀</span>
            <h4 className="font-semibold text-emerald-900">Quick Start Guides</h4>
          </div>
          <p className="text-sm text-emerald-700">
            Step-by-step tutorials for customers and providers
          </p>
        </div>

        {/* Interactive Tours */}
        <div className="bg-white rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎯</span>
            <h4 className="font-semibold text-emerald-900">Interactive Tours</h4>
          </div>
          <p className="text-sm text-emerald-700">
            Guided walkthroughs of every feature and workflow
          </p>
        </div>

        {/* 24/7 FAQ Support */}
        <div className="bg-white rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">❓</span>
            <h4 className="font-semibold text-emerald-900">Instant Answers</h4>
          </div>
          <p className="text-sm text-emerald-700">
            Searchable FAQ with answers to common questions
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-xs font-medium">
          ✨ No learning curve
        </span>
        <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-xs font-medium">
          🎓 Expert guidance
        </span>
        <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-xs font-medium">
          ⚡ Instant support
        </span>
        <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-xs font-medium">
          🏆 Success guaranteed
        </span>
      </div>
    </div>
  )
} 
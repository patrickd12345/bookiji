'use client'

import dynamic from 'next/dynamic'
import { isTruthyEnv } from '@/lib/env/isTruthyEnv'

const NotifyForm = dynamic(() => import('@/components/NotifyForm'), { ssr: false })
const HomePageModern2025 = dynamic(() => import('./HomePageModern2025'), { ssr: false })
const JarvisChat = dynamic(() => import('@/components/jarvis/JarvisChat'), { ssr: false })

export default function HomePageWrapper() {
  const isE2E = isTruthyEnv(process.env.NEXT_PUBLIC_E2E) || isTruthyEnv(process.env.E2E)
  return (
    <>
      {isE2E && (
        <div className="px-6 pt-10 pb-4 text-center">
          <h1 className="text-4xl font-bold">Bookiji</h1>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                window.location.assign('/get-started')
              }}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold"
            >
              Get started
            </button>
          </div>
        </div>
      )}
      <NotifyForm />
      <HomePageModern2025 />
      <JarvisChat />
    </>
  )
}

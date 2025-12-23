'use client'

import dynamic from 'next/dynamic'

const NotifyForm = dynamic(() => import('@/components/NotifyForm'), { ssr: false })
const HomePageModern2025 = dynamic(() => import('./HomePageModern2025'), { ssr: false })

export default function HomePageWrapper() {
  return (
    <>
      <NotifyForm />
      <HomePageModern2025 />
    </>
  )
}

'use client'

import dynamic from 'next/dynamic'
import HomePageModern2025 from '../HomePageModern2025'

// Dynamically import NotifyForm to avoid SSR issues
const NotifyForm = dynamic(() => import('@/components/NotifyForm'), { ssr: false })

export default function ModernHomePage() {
  return (
    <>
      <NotifyForm />
      <HomePageModern2025 />
    </>
  )
}









'use client'

import dynamic from 'next/dynamic'

const NotifyForm = dynamic(() => import('@/components/NotifyForm'), { ssr: false })
const HomePageClient = dynamic(() => import('./HomePageClient'), { ssr: false })

export default function HomePageWrapper() {
  return (
    <>
      <NotifyForm />
      <HomePageClient />
    </>
  )
}

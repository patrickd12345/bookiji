import NotifyForm from '@/components/NotifyForm'

export default function PreLaunchLanding() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-8 gap-6">
      <div>
        <h1 className="text-4xl font-bold mb-4">🚧 Bookiji is almost ready!</h1>
        <p className="text-lg text-gray-600 max-w-xl">
          We&rsquo;re working hard behind the scenes to bring you the world&rsquo;s most flexible service-booking platform.
        </p>
        <p className="text-lg text-gray-600 max-w-xl mt-2">
          Check back soon or subscribe below to be the first to know when we launch.
        </p>
      </div>

      <NotifyForm />

      <p className="text-sm text-gray-400 mt-6">© {new Date().getFullYear()} Bookiji. All rights reserved.</p>
    </main>
  )
} 

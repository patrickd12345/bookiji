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

      <form
        action="https://formspree.io/f/xdorzlqk" // simple Formspree placeholder – replace with real mailing list later
        method="POST"
        className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-4"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="your@email.com"
          className="flex-1 rounded-md border px-4 py-2 focus:outline-none focus:ring"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-white hover:opacity-90"
        >
          Notify me
        </button>
      </form>

      <p className="text-sm text-gray-400 mt-6">© {new Date().getFullYear()} Bookiji. All rights reserved.</p>
    </main>
  )
} 

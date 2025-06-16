export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-2xl font-bold text-[#A259FF] mb-4">Page Not Found</h2>
      <p className="mb-4 text-gray-700">Sorry, we couldn't find the page you were looking for.</p>
      <a href="/" className="px-6 py-2 bg-[#A259FF] text-white rounded-full font-semibold hover:bg-[#7C3AED] transition">Go Home</a>
    </div>
  );
} 
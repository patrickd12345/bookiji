import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bookiji - Book any service, anywhere. Guaranteed.",
  description: "The world's first AI-powered, commitment-based booking platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        {/* Header */}
        <header className="fixed w-full top-4 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between h-16 px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                  <span className="text-2xl">📅</span>
                  <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Bookiji
                  </span>
                </Link>

                {/* Navigation */}
                <div className="hidden md:flex items-center space-x-8">
                  <Link href="/get-started" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Get Started
                  </Link>
                  <Link href="/vendor/onboarding" className="text-gray-600 hover:text-gray-900 transition-colors">
                    Become a Provider
                  </Link>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/login" 
                    className="hidden md:inline-block text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link 
                    href="/register" 
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="min-h-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {/* Product */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                  Product
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/get-started" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Get Started
                    </Link>
                  </li>
                  <li>
                    <Link href="/vendor/onboarding" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Become a Provider
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                  Support
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Register
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                  Legal
                </h3>
                <ul className="space-y-3">
                  <li>
                    <span className="text-gray-600">Privacy Policy</span>
                  </li>
                  <li>
                    <span className="text-gray-600">Terms of Service</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 border-t border-gray-200 pt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📅</span>
                  <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Bookiji
                  </span>
                </div>
                <p className="text-gray-500 text-sm">
                  © {new Date().getFullYear()} Bookiji. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
} 
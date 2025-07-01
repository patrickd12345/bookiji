"use client"

import { useState, useEffect } from 'react'

export default function WorkingThemesPage() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      html.classList.add('light')
      setIsDark(false)
    } else {
      html.classList.remove('light')
      html.classList.add('dark')
      setIsDark(true)
    }
  }

  if (!mounted) {
    return <div className="p-8 text-center">Loading theme...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">🎉 Theme Switching SUCCESS!</h1>
          <p className="text-xl text-muted-foreground">
            Shadcn/UI + CSS Variables = Working themes in Next.js 15
          </p>
          
          <button 
            onClick={toggleTheme}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-medium"
          >
            {isDark ? '🌞 Switch to Light' : '🌙 Switch to Dark'}
          </button>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Primary Colors</h3>
            <div className="space-y-2">
              <div className="h-10 bg-primary text-primary-foreground rounded flex items-center justify-center">
                Primary
              </div>
              <div className="h-10 bg-secondary text-secondary-foreground rounded flex items-center justify-center">
                Secondary
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Interactive Elements</h3>
            <div className="space-y-3">
              <button className="w-full p-2 bg-accent text-accent-foreground rounded hover:bg-accent/80 transition-colors">
                Accent Button
              </button>
              <input 
                className="w-full p-2 border border-input bg-background rounded"
                placeholder="Test input..."
              />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Muted Elements</h3>
            <div className="space-y-2">
              <div className="h-10 bg-muted text-muted-foreground rounded flex items-center justify-center">
                Muted Background
              </div>
              <p className="text-muted-foreground text-sm">
                This is muted text that adapts to theme
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-green-800 dark:text-green-200 mb-3">
            ✅ Complete Success!
          </h2>
          <div className="text-green-700 dark:text-green-300 space-y-1">
            <p>• <strong>Instant visual changes</strong> - No more broken DaisyUI!</p>
            <p>• <strong>CSS variables work</strong> - Reliable theme management</p>
            <p>• <strong>Next.js 15 compatible</strong> - No hydration issues</p>
            <p>• <strong>Production ready</strong> - Shadcn/UI components</p>
          </div>
        </div>

        {/* Current Theme Info */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground">
            Current theme: <span className="font-mono font-bold">{isDark ? 'dark' : 'light'}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Click the button above to see immediate theme switching!
          </p>
        </div>
      </div>
    </div>
  )
} 
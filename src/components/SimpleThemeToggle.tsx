"use client"

import { useState, useEffect } from 'react'

export function SimpleThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check current theme on mount
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
    return (
      <button 
        className="px-4 py-2 border border-input bg-background rounded hover:bg-accent transition-colors"
        disabled
      >
        🌞 Loading...
      </button>
    )
  }

  return (
    <button 
      onClick={toggleTheme}
      className="px-4 py-2 border border-input bg-background rounded hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {isDark ? '🌞 Light Mode' : '🌙 Dark Mode'}
    </button>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import type { Theme } from '@/types'

const THEMES = [
  { id: 'corporate', label: 'Default', icon: '🏢' },
  { id: 'light', label: 'Light', icon: '🌞' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'pastel', label: 'Pastel', icon: '🎨' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🤖' },
  { id: 'ocean', label: 'Ocean', icon: '🌊' },
  { id: 'sunset', label: 'Sunset', icon: '🌅' },
  { id: 'forest', label: 'Forest', icon: '🌲' },
  { id: 'cupcake', label: 'Cupcake', icon: '🍭' },
  { id: 'midnight', label: 'Midnight', icon: '🌙' }
] as const

export default function ThemeSelector() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Only show the component after it's mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = async (newTheme: Theme) => {
    try {
      await setTheme(newTheme)
    } catch (error) {
      console.error('Failed to change theme:', error)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="inline-block w-5 h-5 stroke-current"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </div>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-200 rounded-box w-52">
        {THEMES.map((themeOption) => (
          <li key={themeOption.id}>
            <button
              onClick={() => handleThemeChange(themeOption.id as Theme)}
              className={theme === themeOption.id ? 'active' : ''}
            >
              <span className="mr-2">{themeOption.icon}</span>
              {themeOption.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
} 
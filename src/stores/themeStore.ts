import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '@/types'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const THEMES = [
  'corporate',
  'light',
  'dark',
  'pastel',
  'cyberpunk',
  'candycrush'
] as const

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'corporate'
  return 'corporate'
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      setTheme: (newTheme) => {
        set({ theme: newTheme })
        if (typeof document !== 'undefined') {
          // Remove all theme classes first
          THEMES.forEach(theme => {
            document.documentElement.classList.remove(theme)
          })
          // Add the new theme class
          document.documentElement.classList.add(newTheme)
        }
      }
    }),
    {
      name: 'bookiji-theme'
    }
  )
) 
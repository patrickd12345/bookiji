import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '@/types'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      setTheme: (newTheme) => {
        set({ theme: newTheme })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', newTheme)
        }
      }
    }),
    {
      name: 'bookiji-theme'
    }
  )
) 
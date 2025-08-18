"use client"

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react"
import { useTheme } from "next-themes"
import { useI18n } from "@/lib/i18n/useI18n"
import { useThemeWithTimeout } from "@/hooks/useThemeWithTimeout"
import { ThemeToast } from "@/components/ThemeToast"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { t } = useI18n()
  const [showTimeoutToast, setShowTimeoutToast] = useState(false)
  const dismissToast = () => setShowTimeoutToast(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled aria-label="Theme selector loading">
        <Palette className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Loading theme selector</span>
      </Button>
    )
  }

  const colorfulThemes = new Set(["corporate","pastel","ocean","sunset","forest","cyberpunk","cupcake","midnight"]) 
  const isColorful = theme ? colorfulThemes.has(theme) : false

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t('theme.change')} title={t('theme.change')}>
          {isColorful ? (
            <Palette className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </>
          )}
          <span className="sr-only">{t('theme.change')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>🎨 {t('theme.choose')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => setTheme("corporate")} className="cursor-pointer">
          🏢 {t('theme.default')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
          ☀️ {t('theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
          🌙 {t('theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
          💻 {t('theme.system')}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>🌈 {t('theme.colorful')}</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => setTheme("pastel")} className="cursor-pointer">
          🌸 {t('theme.pastel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("ocean")} className="cursor-pointer">
          🌊 {t('theme.ocean')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("sunset")} className="cursor-pointer">
          🌅 {t('theme.sunset')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("forest")} className="cursor-pointer">
          🌲 {t('theme.forest')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("cyberpunk")} className="cursor-pointer">
          🌆 {t('theme.cyberpunk')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("cupcake")} className="cursor-pointer">
          🍭 {t('theme.cupcake')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("midnight")} className="cursor-pointer">
          🌙 {t('theme.midnight')}
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
      <ThemeToast show={showTimeoutToast} onDismiss={dismissToast} />
    </>
  )
}

// Enhanced simple toggle with cycle through themes
export function SimpleThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { t } = useI18n()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const themes = ["corporate", "light", "dark", "pastel", "ocean", "sunset", "forest", "cyberpunk", "cupcake", "midnight"]
  
  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme || "corporate")
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  if (!mounted) {
    return (
      <Button variant="outline" className="px-4">
        🎨 {t('theme.change')}
      </Button>
    )
  }

  const getThemeEmoji = (currentTheme: string) => {
    const emojiMap: Record<string, string> = {
      light: "☀️",
      dark: "🌙", 
      pastel: "🌸",
      ocean: "🌊",
      sunset: "🌅",
      forest: "🌲",
      cyberpunk: "🌆",
      cupcake: "🍭",
      midnight: "🌙",
      corporate: "🏢"
    }
    return emojiMap[currentTheme] || "🎨"
  }

  return (
    <Button
      variant="outline"
      onClick={cycleTheme}
      className="px-4 gap-2"
    >
      <span>{getThemeEmoji(theme || "corporate")}</span>
      <span className="capitalize">{theme === "corporate" ? t('theme.default') : theme || "corporate"}</span>
    </Button>
  )
} 
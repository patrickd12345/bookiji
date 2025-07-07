"use client"

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export function ThemeSwitcher() {
  const { setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Palette className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <Palette className="absolute h-[1.2rem] w-[1.2rem] rotate-0 scale-0 transition-all [.pastel_&]:scale-100 [.ocean_&]:scale-100 [.sunset_&]:scale-100 [.forest_&]:scale-100 [.cyberpunk_&]:scale-100 [.cupcake_&]:scale-100 [.midnight_&]:scale-100" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>🎨 Choose Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => setTheme("corporate")} className="cursor-pointer">
          🏢 Default
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
          ☀️ Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
          🌙 Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
          💻 System
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>🌈 Colorful Themes</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => setTheme("pastel")} className="cursor-pointer">
          🌸 Pastel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("ocean")} className="cursor-pointer">
          🌊 Ocean
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("sunset")} className="cursor-pointer">
          🌅 Sunset
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("forest")} className="cursor-pointer">
          🌲 Forest
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("cyberpunk")} className="cursor-pointer">
          🌆 Cyberpunk
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("cupcake")} className="cursor-pointer">
          🍭 Cupcake
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("midnight")} className="cursor-pointer">
          🌙 Midnight
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Enhanced simple toggle with cycle through themes
export function SimpleThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const themes = ["corporate", "light", "dark", "pastel", "ocean", "sunset", "forest", "cyberpunk", "cupcake", "midnight"]
  
  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme || "light")
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  if (!mounted) {
    return (
      <Button variant="outline" className="px-4">
        🎨 Theme
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
      <span>{getThemeEmoji(theme || "light")}</span>
      <span className="capitalize">{theme === "corporate" ? "Default" : theme || "light"}</span>
    </Button>
  )
} 
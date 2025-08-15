"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="corporate"
      enableSystem
      disableTransitionOnChange
      themes={[
        "corporate",
        "light", 
        "dark",
        "pastel",
        "ocean",
        "sunset",
        "forest",
        "cyberpunk",
        "cupcake",
        "midnight"
      ]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
} 
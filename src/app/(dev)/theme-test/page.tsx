"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SimpleThemeToggle } from "@/components/ThemeSwitcher"

export default function ThemeTestPage() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme()

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Theme Test Page</h1>
        <SimpleThemeToggle />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme Information</CardTitle>
          <CardDescription>Current theme state and debugging info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Theme</Label>
              <p className="text-sm text-muted-foreground">{theme}</p>
            </div>
            <div>
              <Label>Resolved Theme</Label>
              <p className="text-sm text-muted-foreground">{resolvedTheme}</p>
            </div>
            <div>
              <Label>System Theme</Label>
              <p className="text-sm text-muted-foreground">{systemTheme}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Theme Controls</CardTitle>
            <CardDescription>Switch between themes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setTheme("light")}
            >
              Light Theme
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setTheme("dark")}
            >
              Dark Theme
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setTheme("system")}
            >
              System Theme
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UI Components</CardTitle>
            <CardDescription>Test various components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-input">Test Input</Label>
              <Input id="test-input" placeholder="Type something..." />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="test-switch" />
              <Label htmlFor="test-switch">Test Switch</Label>
            </div>
            <div className="space-y-2">
              <Button className="w-full">Default Button</Button>
              <Button variant="outline" className="w-full">Outline Button</Button>
              <Button variant="outline" className="w-full bg-red-500 hover:bg-red-600 text-white">Destructive Button</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Color Showcase</CardTitle>
            <CardDescription>Theme colors in action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-sm">
                Primary
              </div>
              <div className="h-8 bg-secondary rounded flex items-center justify-center text-secondary-foreground text-sm">
                Secondary
              </div>
              <div className="h-8 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                Muted
              </div>
              <div className="h-8 bg-accent rounded flex items-center justify-center text-accent-foreground text-sm">
                Accent
              </div>
              <div className="h-8 bg-destructive rounded flex items-center justify-center text-destructive-foreground text-sm">
                Destructive
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Success! 🎉</CardTitle>
          <CardDescription>
            If you can see theme changes happening visually, then Shadcn/UI theme switching is working properly!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unlike DaisyUI, this theme switching actually works with Next.js 15. The themes are applied 
            correctly and you should see immediate visual changes when switching between light and dark modes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 
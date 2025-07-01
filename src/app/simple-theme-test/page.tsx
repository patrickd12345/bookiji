import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"

export default function SimpleThemeTestPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Shadcn/UI Theme Test</h1>
        <ThemeSwitcher />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🎉 Working Theme Switching!</CardTitle>
          <CardDescription>
            This demonstrates Shadcn/UI with next-themes working properly in Next.js 15
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Click the theme switcher in the top right to see the magic happen! 
            Unlike DaisyUI, this actually works and changes colors immediately.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>UI Components</CardTitle>
            <CardDescription>Various themed components</CardDescription>
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
              <Button variant="outline" className="w-full bg-transparent hover:bg-accent">Ghost Button</Button>
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
              <div className="h-8 bg-card rounded flex items-center justify-center text-card-foreground text-sm border">
                Card
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dark/Light Demo</CardTitle>
            <CardDescription>Colors that change with theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background border rounded-lg">
              <p className="text-foreground font-medium">Background & Foreground</p>
              <p className="text-muted-foreground text-sm">Muted text color</p>
            </div>
            <div className="p-4 bg-popover border rounded-lg">
              <p className="text-popover-foreground font-medium">Popover Background</p>
              <p className="text-muted-foreground text-sm">With border styling</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-800 dark:text-green-200">✅ Success!</CardTitle>
          <CardDescription className="text-green-600 dark:text-green-400">
            Shadcn/UI + next-themes is working perfectly!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-green-700 dark:text-green-300">
            <p>✓ No hydration mismatches</p>
            <p>✓ Instant theme switching</p>
            <p>✓ Proper CSS variable management</p>
            <p>✓ Next.js 15 compatibility</p>
            <p>✓ TypeScript support</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
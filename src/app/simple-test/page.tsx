'use client'

import { useEffect, useState } from 'react'

export default function SimpleTest() {
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('light')

  // This ensures the component only renders after client-side hydration
  useEffect(() => {
    setMounted(true)
    // Get initial theme from HTML element
    const htmlElement = document.documentElement
    const initialTheme = htmlElement.getAttribute('data-theme') || 'light'
    setCurrentTheme(initialTheme)
  }, [])

  const changeTheme = (theme: string) => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
      setCurrentTheme(theme)
      console.log('🎨 Theme changed to:', theme)
      console.log('📄 HTML data-theme:', document.documentElement.getAttribute('data-theme'))
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div className="min-h-screen p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen p-8 bg-base-100 text-base-content">
      <h1 className="text-4xl font-bold mb-8 text-primary">✨ DaisyUI Theme Test</h1>
      <p className="text-lg mb-8 text-base-content">
        Current theme: <span className="font-bold">{currentTheme}</span>
      </p>
      
      {/* Theme Buttons */}
      <div className="mb-8 space-x-4">
        <button 
          className="btn btn-primary"
          onClick={() => changeTheme('light')}
        >
          🌞 Light Theme
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => changeTheme('dark')}
        >
          🌙 Dark Theme
        </button>
        <button 
          className="btn btn-accent"
          onClick={() => changeTheme('pastel')}
        >
          🎨 Pastel Theme
        </button>
        <button 
          className="btn btn-info"
          onClick={() => changeTheme('cyberpunk')}
        >
          🤖 Cyberpunk Theme
        </button>
      </div>

      {/* Test Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary">DaisyUI Card 1</h2>
            <p className="text-base-content">This card should change colors with the theme!</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary">Action</button>
            </div>
          </div>
        </div>

        <div className="card bg-base-300 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-secondary">DaisyUI Card 2</h2>
            <p className="text-base-content">Watch the background and text colors change!</p>
            <div className="card-actions justify-end">
              <button className="btn btn-secondary">Action</button>
            </div>
          </div>
        </div>
      </div>

      {/* Color Demonstration */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-base-content">Theme Colors</h2>
        <div className="flex flex-wrap gap-4">
          <div className="w-20 h-20 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-content text-sm">Primary</span>
          </div>
          <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center">
            <span className="text-secondary-content text-sm">Secondary</span>
          </div>
          <div className="w-20 h-20 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-accent-content text-sm">Accent</span>
          </div>
          <div className="w-20 h-20 bg-neutral rounded-lg flex items-center justify-center">
            <span className="text-neutral-content text-sm">Neutral</span>
          </div>
        </div>
      </div>

      {/* Form Elements */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-base-content">Form Elements</h2>
        <div className="form-control w-full max-w-xs mb-4">
          <label className="label">
            <span className="label-text">Test Input</span>
          </label>
          <input type="text" placeholder="Type here" className="input input-bordered w-full max-w-xs" />
        </div>
        
        <div className="form-control">
          <label className="cursor-pointer label w-fit">
            <input type="checkbox" className="checkbox checkbox-primary" />
            <span className="label-text ml-2">Test Checkbox</span>
          </label>
        </div>
      </div>

      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Click the theme buttons above to test DaisyUI theme switching!</span>
      </div>
    </div>
  )
} 
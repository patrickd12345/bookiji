'use client'

import { useState } from 'react'

const THEMES = ['light', 'dark', 'pastel', 'nord', 'cyberpunk']

export default function TestThemes() {
  const [currentTheme, setCurrentTheme] = useState('light')

  const changeTheme = (theme: string) => {
    setCurrentTheme(theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-base-content">DaisyUI Theme Test</h1>
        
        {/* Theme Buttons */}
        <div className="mb-8 flex gap-4 flex-wrap">
          {THEMES.map((theme) => (
            <button
              key={theme}
              onClick={() => changeTheme(theme)}
              className={`btn ${currentTheme === theme ? 'btn-primary' : 'btn-outline'}`}
            >
              {theme}
            </button>
          ))}
        </div>

        {/* Test Components */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card Test */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-base-content">Card Title</h2>
              <p className="text-base-content/70">This card should change colors with themes</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-secondary">Secondary</button>
              </div>
            </div>
          </div>

          {/* Alert Test */}
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>This alert uses DaisyUI theme colors</span>
          </div>

          {/* Button Variations */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-base-content">Button Variations</h3>
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-accent">Accent</button>
                <button className="btn btn-success">Success</button>
                <button className="btn btn-warning">Warning</button>
                <button className="btn btn-error">Error</button>
              </div>
            </div>
          </div>

          {/* Background Test */}
          <div className="bg-base-300 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-base-content mb-2">Background Colors</h3>
            <div className="space-y-2">
              <div className="bg-primary text-primary-content p-2 rounded">Primary Background</div>
              <div className="bg-secondary text-secondary-content p-2 rounded">Secondary Background</div>
              <div className="bg-accent text-accent-content p-2 rounded">Accent Background</div>
            </div>
          </div>
        </div>

        {/* Current Theme Display */}
        <div className="mt-8 text-center">
          <p className="text-base-content/70">Current theme: <span className="font-bold text-primary">{currentTheme}</span></p>
          <p className="text-sm text-base-content/50 mt-2">Check the &lt;html data-theme="{currentTheme}"&gt; attribute in DevTools</p>
        </div>
      </div>
    </div>
  )
} 
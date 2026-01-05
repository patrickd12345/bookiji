'use client'

/**
 * App Store Theme Test Page
 *
 * A concept page mimicking a modern mobile App Store layout.
 * Features dark mode, horizontal scrolling lists, and glassmorphism.
 */

import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import {
  Search,
  Gamepad2,
  LayoutGrid,
  Rocket,
  Star,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Mock Data
const FEATURED_APPS = [
  {
    id: 1,
    title: "Cosmic Journey",
    subtitle: "Explore the infinite universe",
    category: "Adventure",
    imageColor: "from-purple-600 to-indigo-900",
    textColor: "text-white"
  },
  {
    id: 2,
    title: "Zen Focus",
    subtitle: "Master your productivity flow",
    category: "Productivity",
    imageColor: "from-emerald-500 to-teal-900",
    textColor: "text-white"
  },
  {
    id: 3,
    title: "Cyber Racer",
    subtitle: "High octane neon racing",
    category: "Racing",
    imageColor: "from-pink-600 to-rose-900",
    textColor: "text-white"
  }
]

const POPULAR_GAMES = [
  { id: 101, name: "Genshin Impact", category: "RPG", rating: 4.8, iconColor: "bg-orange-400" },
  { id: 102, name: "Minecraft", category: "Simulation", rating: 4.9, iconColor: "bg-green-600" },
  { id: 103, name: "Call of Duty", category: "Action", rating: 4.7, iconColor: "bg-stone-700" },
  { id: 104, name: "Among Us", category: "Strategy", rating: 4.5, iconColor: "bg-red-600" },
  { id: 105, name: "Stardew Valley", category: "RPG", rating: 4.9, iconColor: "bg-blue-400" },
]

const ESSENTIAL_APPS = [
  { id: 201, name: "Discord", category: "Social", rating: 4.8, iconColor: "bg-indigo-500" },
  { id: 202, name: "Notion", category: "Productivity", rating: 4.9, iconColor: "bg-gray-100 text-black" },
  { id: 203, name: "Spotify", category: "Music", rating: 4.8, iconColor: "bg-green-500" },
  { id: 204, name: "Netflix", category: "Entertainment", rating: 4.6, iconColor: "bg-red-700" },
  { id: 205, name: "Duolingo", category: "Education", rating: 4.7, iconColor: "bg-lime-500" },
]

const CATEGORIES = [
  { id: 'arcade', name: 'Arcade', icon: Gamepad2, color: 'text-pink-500' },
  { id: 'productivity', name: 'Productivity', icon: CheckCircle, color: 'text-blue-500' }, // CheckCircle not imported, fixing below
  { id: 'social', name: 'Social', icon: LayoutGrid, color: 'text-green-500' },
  { id: 'action', name: 'Action', icon: Rocket, color: 'text-orange-500' },
]

// Helper Component for App Icon
const AppIcon = ({ color, className = "w-16 h-16" }: { color: string, className?: string }) => (
  <div className={`${className} ${color} rounded-2xl shadow-lg flex items-center justify-center shrink-0`}>
    <div className="w-1/2 h-1/2 bg-white/20 rounded-lg backdrop-blur-sm" />
  </div>
)

// Helper Component for "Get" Button
const GetButton = () => (
  <button className="px-6 py-1.5 rounded-full bg-white/10 text-blue-400 font-bold text-sm backdrop-blur-md uppercase tracking-wide hover:bg-white/20 transition-colors">
    Get
  </button>
)

export default function AppStorePage() {
  const [activeTab, setActiveTab] = useState('today')
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 50], [0, 1])
  const headerY = useTransform(scrollY, [0, 50], [-20, 0])

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-blue-500/30 font-sans pb-24">

      {/* Dynamic Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl"
        style={{ opacity: headerOpacity, y: headerY }}
      >
        <div className="text-xl font-bold tracking-tight">Browse</div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
      </motion.header>

      {/* Main Content Area */}
      <main className="pt-4 px-4 sm:px-6 max-w-5xl mx-auto space-y-12">

        {/* Top Header Row (Static) */}
        <div className="flex items-center justify-between py-6">
          <div>
            <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white">Today</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 shadow-xl shadow-purple-500/20" />
        </div>

        {/* Hero Section - Featured Apps */}
        <section className="relative w-full aspect-[4/5] sm:aspect-[2/1] rounded-[2rem] overflow-hidden shadow-2xl group cursor-pointer">
          <div className={`absolute inset-0 bg-gradient-to-br ${FEATURED_APPS[0].imageColor}`} />

          {/* Content Overlay */}
          <div className="absolute inset-0 p-8 flex flex-col justify-between bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white/90 mb-2 border border-white/10">
                  Featured
                </span>
                <h2 className="text-xl text-white/80 font-medium">{FEATURED_APPS[0].category}</h2>
              </div>
            </div>

            <div>
              <h3 className="text-4xl sm:text-5xl font-black text-white mb-2 leading-tight">
                {FEATURED_APPS[0].title}
              </h3>
              <p className="text-lg text-white/90 font-medium max-w-md mb-6">
                {FEATURED_APPS[0].subtitle}
              </p>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-white shadow-lg" />
                 <div className="flex flex-col">
                    <span className="font-bold">Cosmic Journey</span>
                    <span className="text-xs text-white/70">In-App Purchases</span>
                 </div>
                 <div className="ml-auto">
                   <GetButton />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Horizontal Scroll Section: Popular Games */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-2xl font-bold text-white">Must-Play Games</h2>
            <Link href="#" className="text-blue-400 text-sm font-semibold hover:text-blue-300">See All</Link>
          </div>

          {/* Scroll Container */}
          <div className="flex overflow-x-auto gap-4 pb-8 -mx-4 px-4 scrollbar-hide snap-x">
            {POPULAR_GAMES.map((game) => (
              <motion.div
                key={game.id}
                whileTap={{ scale: 0.95 }}
                className="snap-center shrink-0 w-[280px] sm:w-[320px] p-4 rounded-3xl bg-neutral-900/50 backdrop-blur-sm border border-white/5 flex flex-col gap-4 hover:bg-neutral-800/50 transition-colors cursor-pointer"
              >
                <div className="w-full h-40 rounded-2xl bg-neutral-800 overflow-hidden relative">
                   <div className={`absolute inset-0 opacity-50 ${game.iconColor}`} />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Gamepad2 className="w-12 h-12 text-white/50" />
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${game.iconColor} shadow-lg shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{game.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{game.category}</p>
                  </div>
                  <GetButton />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* List Section: Essential Apps */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-2xl font-bold text-white">Essential Apps</h2>
            <Link href="#" className="text-blue-400 text-sm font-semibold hover:text-blue-300">See All</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
            {ESSENTIAL_APPS.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 py-2 border-b border-white/5 pb-4 last:border-0"
              >
                <span className="text-lg font-bold text-gray-600 w-4 text-center">{index + 1}</span>
                <AppIcon color={app.iconColor} className="w-16 h-16" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg truncate">{app.name}</h3>
                  <p className="text-sm text-gray-400 truncate">{app.category}</p>
                </div>
                <GetButton />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Bottom Categories Grid */}
        <section className="pb-10">
          <h2 className="text-2xl font-bold text-white mb-6">Browse Categories</h2>
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex items-center gap-3 hover:bg-neutral-800 transition-colors cursor-pointer group">
                <cat.icon className={`w-6 h-6 ${cat.color} group-hover:scale-110 transition-transform`} />
                <span className="font-medium text-lg">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Tab Bar Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-xl border-t border-white/10 pt-2 pb-6 px-6 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center text-xs font-medium text-gray-500">
          <button className="flex flex-col items-center gap-1 text-blue-500">
            <Star className="w-6 h-6 fill-current" />
            <span>Today</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white transition-colors">
            <Gamepad2 className="w-6 h-6" />
            <span>Games</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white transition-colors">
            <LayoutGrid className="w-6 h-6" />
            <span>Apps</span>
          </button>
          <button className="flex flex-col items-center gap-1 hover:text-white transition-colors">
            <Search className="w-6 h-6" />
            <span>Search</span>
          </button>
        </div>
      </div>

    </div>
  )
}

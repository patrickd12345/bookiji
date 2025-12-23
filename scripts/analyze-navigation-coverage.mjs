#!/usr/bin/env node

/**
 * Analyzes navigation coverage by comparing:
 * 1. Pages that exist in src/app
 * 2. Pages linked in navigation components
 * 3. Identifies missing links
 */

import { readdirSync, statSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Get all page routes from src/app
function getAllPages(dir = 'src/app', basePath = '') {
  const pages = []
  const fullPath = join(rootDir, dir)
  
  try {
    const entries = readdirSync(fullPath)
    
    for (const entry of entries) {
      // Skip special Next.js directories and files
      if (entry.startsWith('_') || entry.startsWith('.') || entry === 'api' || entry === 'layout.tsx' || entry === 'loading.tsx' || entry === 'error.tsx' || entry === 'not-found.tsx') {
        continue
      }
      
      const entryPath = join(fullPath, entry)
      const stat = statSync(entryPath)
      
      if (stat.isDirectory()) {
        // Check if it's a dynamic route [param]
        if (entry.startsWith('[') && entry.endsWith(']')) {
          pages.push(`${basePath}/${entry}`)
        } else {
          // Recursively get pages from subdirectory
          pages.push(...getAllPages(join(dir, entry), `${basePath}/${entry}`))
        }
      } else if (entry === 'page.tsx' || entry === 'page.ts') {
        // Found a page
        const route = basePath || '/'
        pages.push(route)
      }
    }
  } catch (err) {
    // Directory doesn't exist or can't be read
  }
  
  return pages
}

// Extract hrefs from navigation components
function extractNavLinks() {
  const navFiles = [
    'src/components/MainNavigation.tsx',
    'src/components/admin/Sidebar.tsx',
    'src/components/admin/Navbar.tsx',
    'src/components/simcity-cockpit/CockpitNavigation.tsx',
    'src/app/settings/layout.tsx',
    'src/app/HomePageClient.tsx'
  ]
  
  const links = new Set()
  
  for (const file of navFiles) {
    try {
      const content = readFileSync(join(rootDir, file), 'utf-8')
      // Match href="..." or href={'...'} or href={`...`}
      const hrefMatches = content.matchAll(/href\s*=\s*["'`]([^"'`]+)["'`]/g)
      for (const match of hrefMatches) {
        const href = match[1]
        // Only include internal links
        if (href.startsWith('/') && !href.startsWith('/api/') && !href.startsWith('/_next/')) {
          links.add(href)
        }
      }
    } catch (err) {
      // File doesn't exist
    }
  }
  
  return Array.from(links).sort()
}

// Main analysis
const allPages = getAllPages()
const navLinks = extractNavLinks()

console.log('\n📊 NAVIGATION COVERAGE ANALYSIS\n')
console.log('='.repeat(80))

console.log(`\n📄 Total pages found: ${allPages.length}`)
console.log(`🔗 Total navigation links: ${navLinks.length}`)

// Find pages not in navigation
const pagesNotInNav = allPages.filter(page => {
  // Check if any nav link matches this page
  return !navLinks.some(link => {
    // Exact match
    if (link === page) return true
    // Parent route match (e.g., /admin matches /admin/analytics)
    if (page.startsWith(link + '/')) return true
    // Dynamic route match (e.g., /book/[vendorId] matches /book/123)
    if (link.includes('[') && link.includes(']')) {
      const linkPattern = link.replace(/\[.*?\]/g, '[^/]+')
      const regex = new RegExp(`^${linkPattern}$`)
      return regex.test(page)
    }
    return false
  })
})

// Find navigation links that don't have pages
const navLinksWithoutPages = navLinks.filter(link => {
  // Check if any page matches this link
  return !allPages.some(page => {
    // Exact match
    if (link === page) return true
    // Parent route match
    if (page.startsWith(link + '/')) return true
    // Dynamic route match
    if (page.includes('[') && page.includes(']')) {
      const pagePattern = page.replace(/\[.*?\]/g, '[^/]+')
      const regex = new RegExp(`^${pagePattern}$`)
      return regex.test(link)
    }
    return false
  })
})

console.log(`\n❌ Pages NOT in navigation: ${pagesNotInNav.length}`)
if (pagesNotInNav.length > 0) {
  console.log('\nMissing from navigation:')
  pagesNotInNav.forEach(page => {
    console.log(`   - ${page}`)
  })
}

console.log(`\n⚠️  Navigation links without pages: ${navLinksWithoutPages.length}`)
if (navLinksWithoutPages.length > 0) {
  console.log('\nBroken navigation links:')
  navLinksWithoutPages.forEach(link => {
    console.log(`   - ${link}`)
  })
}

// Group by category
console.log('\n\n📋 PAGES BY CATEGORY:\n')

const categories = {
  'Public Pages': allPages.filter(p => !p.startsWith('/admin') && !p.startsWith('/customer') && !p.startsWith('/vendor') && !p.startsWith('/provider')),
  'Admin Pages': allPages.filter(p => p.startsWith('/admin')),
  'Customer Pages': allPages.filter(p => p.startsWith('/customer')),
  'Vendor Pages': allPages.filter(p => p.startsWith('/vendor')),
  'Provider Pages': allPages.filter(p => p.startsWith('/provider')),
  'Settings Pages': allPages.filter(p => p.startsWith('/settings')),
}

for (const [category, pages] of Object.entries(categories)) {
  if (pages.length > 0) {
    console.log(`${category} (${pages.length}):`)
    pages.forEach(page => {
      const inNav = navLinks.some(link => link === page || page.startsWith(link + '/'))
      console.log(`   ${inNav ? '✅' : '❌'} ${page}`)
    })
    console.log()
  }
}

console.log('\n' + '='.repeat(80))
console.log('\n✅ Analysis complete!\n')


#!/usr/bin/env node

/**
 * Navigation Coverage Analysis
 * 
 * Analyzes all routes in the app and checks if they're reachable through
 * navigation (links, menus, buttons). Identifies orphaned pages that can't
 * be reached through navigation.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Extract all routes from app directory
function getAllRoutes() {
  const routes = new Set()
  const appDir = path.join(rootDir, 'src/app')
  
  function scanDirectory(dir, basePath = '') {
    if (!fs.existsSync(dir)) return
    
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const routePath = path.join(basePath, entry.name)
      
      if (entry.isDirectory()) {
        // Skip special Next.js directories
        if (entry.name.startsWith('(') || entry.name.startsWith('_')) {
          continue
        }
        scanDirectory(fullPath, routePath)
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        // Convert file path to route
        let route = basePath || '/'
        if (route !== '/') {
          route = '/' + route.replace(/\\/g, '/')
        }
        
        // Handle dynamic routes [param]
        route = route.replace(/\[([^\]]+)\]/g, ':$1')
        
        routes.add(route)
      }
    }
  }
  
  scanDirectory(appDir)
  return Array.from(routes).sort()
}

  // Extract navigation links from components
function getNavigationLinks() {
  const links = new Set()
  const componentsDir = path.join(rootDir, 'src/components')
  
  // Known navigation components
  const navFiles = [
    'MainNavigation.tsx',
    'Footer.tsx',
    'admin/Sidebar.tsx',
    'customer/CustomerNavigation.tsx',
    'vendor/VendorNavigation.tsx',
    'simcity-cockpit/CockpitNavigation.tsx',
  ]
  
  // Also check admin ops-ai layout
  const opsAiLayoutPath = path.join(rootDir, 'src/app/admin/ops-ai/layout.tsx')
  
  // Extract hrefs from navigation components
  for (const file of navFiles) {
    const filePath = path.join(componentsDir, file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Match href="/..." or href='/...'
      const hrefMatches = content.matchAll(/href=["']([^"']+)["']/g)
      for (const match of hrefMatches) {
        const href = match[1]
        // Only include internal routes (starting with /)
        if (href.startsWith('/') && !href.startsWith('//') && !href.includes('http')) {
          // Remove query params and hashes
          const cleanHref = href.split('?')[0].split('#')[0]
          links.add(cleanHref)
        }
      }
      
      // Also check for navItems arrays
      const navItemsMatches = content.matchAll(/href:\s*["']([^"']+)["']/g)
      for (const match of navItemsMatches) {
        const href = match[1]
        if (href.startsWith('/') && !href.startsWith('//') && !href.includes('http')) {
          const cleanHref = href.split('?')[0].split('#')[0]
          links.add(cleanHref)
        }
      }
    }
  }
  
  // Check ops-ai layout
  if (fs.existsSync(opsAiLayoutPath)) {
    const content = fs.readFileSync(opsAiLayoutPath, 'utf-8')
    const hrefMatches = content.matchAll(/href:\s*["']([^"']+)["']/g)
    for (const match of hrefMatches) {
      const href = match[1]
      if (href.startsWith('/') && !href.startsWith('//') && !href.includes('http')) {
        const cleanHref = href.split('?')[0].split('#')[0]
        links.add(cleanHref)
      }
    }
  }
  
  // Also check for links in page components (buttons, cards, etc.)
  // This includes: href attributes, router.push(), window.location, onClick handlers
  function scanForNavigation(dir) {
    if (!fs.existsSync(dir)) return
    
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('(') && !entry.name.startsWith('_') && entry.name !== 'node_modules') {
          scanForNavigation(fullPath)
        }
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        
        // Match href attributes
        const hrefMatches = content.matchAll(/href=["']([^"']+)["']/g)
        for (const match of hrefMatches) {
          const href = match[1]
          if (href.startsWith('/') && !href.startsWith('//') && !href.includes('http')) {
            const cleanHref = href.split('?')[0].split('#')[0]
            links.add(cleanHref)
          }
        }
        
        // Match router.push() calls
        const routerPushMatches = content.matchAll(/router\.(push|replace)\(["']([^"']+)["']/g)
        for (const match of routerPushMatches) {
          const route = match[2]
          if (route.startsWith('/') && !route.startsWith('//') && !route.includes('http')) {
            const cleanRoute = route.split('?')[0].split('#')[0]
            links.add(cleanRoute)
          }
        }
        
        // Match window.location assignments
        const windowLocationMatches = content.matchAll(/window\.location\.(href|assign|replace)\s*=\s*["']([^"']+)["']/g)
        for (const match of windowLocationMatches) {
          const route = match[2]
          if (route.startsWith('/') && !route.startsWith('//') && !route.includes('http')) {
            const cleanRoute = route.split('?')[0].split('#')[0]
            links.add(cleanRoute)
          }
        }
        
        // Match onClick handlers with navigation (template literals with routes)
        const onClickMatches = content.matchAll(/onClick.*?\([^)]*?["']([^"']+)["']/gs)
        for (const match of onClickMatches) {
          const route = match[1]
          if (route.startsWith('/') && !route.startsWith('//') && !route.includes('http') && route.length < 100) {
            const cleanRoute = route.split('?')[0].split('#')[0]
            links.add(cleanRoute)
          }
        }
        
        // Match template literals in navigation (e.g., `/book/${vendorId}`)
        // Extract base routes from template literals
        const templateLiteralMatches = content.matchAll(/["']\/([^"']*?)\$\{/g)
        for (const match of templateLiteralMatches) {
          const baseRoute = '/' + match[1]
          if (baseRoute.length > 1 && !baseRoute.includes('http')) {
            links.add(baseRoute)
          }
        }
      }
    }
  }
  
  scanForNavigation(path.join(rootDir, 'src/app'))
  scanForNavigation(path.join(rootDir, 'src/components'))
  
  return links
}

// Check if a route is reachable (either exact match or parent route)
function isRouteReachable(route, links) {
  // Exact match
  if (links.has(route)) return true
  
  // Check if parent route exists (e.g., /admin/users is reachable if /admin exists)
  const parts = route.split('/').filter(Boolean)
  for (let i = parts.length - 1; i > 0; i--) {
    const parentRoute = '/' + parts.slice(0, i).join('/')
    if (links.has(parentRoute)) return true
  }
  
  // Check dynamic routes (e.g., /book/:vendorId is reachable if /book exists)
  const baseRoute = route.split(':')[0].replace(/\/$/, '') || '/'
  if (links.has(baseRoute)) return true
  
  return false
}

// Main analysis
function analyzeNavigationCoverage() {
  console.log('🔍 Analyzing Navigation Coverage...\n')
  
  const allRoutes = getAllRoutes()
  const navLinksSet = getNavigationLinks()
  const navLinks = navLinksSet instanceof Set ? navLinksSet : new Set(Array.from(navLinksSet || []))
  
  console.log(`📊 Found ${allRoutes.length} routes`)
  console.log(`🔗 Found ${navLinks.size} navigation links\n`)
  
  // Categorize routes
  const publicRoutes = allRoutes.filter(r => !r.startsWith('/admin') && !r.startsWith('/customer') && !r.startsWith('/vendor'))
  const adminRoutes = allRoutes.filter(r => r.startsWith('/admin'))
  const customerRoutes = allRoutes.filter(r => r.startsWith('/customer'))
  const vendorRoutes = allRoutes.filter(r => r.startsWith('/vendor'))
  
  // Find unreachable routes
  const unreachable = []
  const reachable = []
  
  for (const route of allRoutes) {
    if (isRouteReachable(route, navLinks)) {
      reachable.push(route)
    } else {
      unreachable.push(route)
    }
  }
  
  // Generate report
  console.log('='.repeat(80))
  console.log('NAVIGATION COVERAGE REPORT')
  console.log('='.repeat(80))
  console.log()
  
  console.log(`✅ Reachable routes: ${reachable.length}/${allRoutes.length} (${Math.round(reachable.length / allRoutes.length * 100)}%)`)
  console.log(`❌ Unreachable routes: ${unreachable.length}/${allRoutes.length} (${Math.round(unreachable.length / allRoutes.length * 100)}%)`)
  console.log()
  
  if (unreachable.length > 0) {
    console.log('⚠️  UNREACHABLE ROUTES (not linked in navigation):')
    console.log('-'.repeat(80))
    
    // Group by category
    const unreachablePublic = unreachable.filter(r => !r.startsWith('/admin') && !r.startsWith('/customer') && !r.startsWith('/vendor'))
    const unreachableAdmin = unreachable.filter(r => r.startsWith('/admin'))
    const unreachableCustomer = unreachable.filter(r => r.startsWith('/customer'))
    const unreachableVendor = unreachable.filter(r => r.startsWith('/vendor'))
    
    if (unreachablePublic.length > 0) {
      console.log('\n📄 Public Routes:')
      unreachablePublic.forEach(r => console.log(`   - ${r}`))
    }
    
    if (unreachableAdmin.length > 0) {
      console.log('\n🔧 Admin Routes:')
      unreachableAdmin.forEach(r => console.log(`   - ${r}`))
    }
    
    if (unreachableCustomer.length > 0) {
      console.log('\n👤 Customer Routes:')
      unreachableCustomer.forEach(r => console.log(`   - ${r}`))
    }
    
    if (unreachableVendor.length > 0) {
      console.log('\n🏪 Vendor Routes:')
      unreachableVendor.forEach(r => console.log(`   - ${r}`))
    }
  } else {
    console.log('✅ All routes are reachable through navigation!')
  }
  
  console.log()
  console.log('='.repeat(80))
  console.log('NAVIGATION LINKS FOUND:')
  console.log('='.repeat(80))
  console.log()
  
  const publicLinks = Array.from(navLinks).filter(l => !l.startsWith('/admin') && !l.startsWith('/customer') && !l.startsWith('/vendor'))
  const adminLinks = Array.from(navLinks).filter(l => l.startsWith('/admin'))
  const customerLinks = Array.from(navLinks).filter(l => l.startsWith('/customer'))
  const vendorLinks = Array.from(navLinks).filter(l => l.startsWith('/vendor'))
  
  if (publicLinks.length > 0) {
    console.log('📄 Public Links:')
    publicLinks.forEach(l => console.log(`   - ${l}`))
    console.log()
  }
  
  if (adminLinks.length > 0) {
    console.log('🔧 Admin Links:')
    adminLinks.forEach(l => console.log(`   - ${l}`))
    console.log()
  }
  
  if (customerLinks.length > 0) {
    console.log('👤 Customer Links:')
    customerLinks.forEach(l => console.log(`   - ${l}`))
    console.log()
  }
  
  if (vendorLinks.length > 0) {
    console.log('🏪 Vendor Links:')
    vendorLinks.forEach(l => console.log(`   - ${l}`))
    console.log()
  }
  
  // Save report to file
  const reportPath = path.join(rootDir, 'NAVIGATION_COVERAGE_REPORT.md')
  const report = `# Navigation Coverage Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Routes**: ${allRoutes.length}
- **Navigation Links**: ${navLinks.size}
- **Reachable Routes**: ${reachable.length} (${Math.round(reachable.length / allRoutes.length * 100)}%)
- **Unreachable Routes**: ${unreachable.length} (${Math.round(unreachable.length / allRoutes.length * 100)}%)

## Unreachable Routes

${unreachable.length > 0 ? unreachable.map(r => `- \`${r}\``).join('\n') : '✅ All routes are reachable!'}

## Recommendations

${unreachable.length > 0 ? `
1. Add navigation links for unreachable routes
2. Consider adding these routes to appropriate navigation components:
   - Admin routes → \`src/components/admin/Sidebar.tsx\`
   - Customer routes → \`src/components/customer/CustomerNavigation.tsx\`
   - Vendor routes → \`src/components/vendor/VendorNavigation.tsx\`
   - Public routes → \`src/components/MainNavigation.tsx\` or \`src/components/Footer.tsx\`
` : '✅ All routes are properly linked in navigation!'}
`
  
  fs.writeFileSync(reportPath, report, 'utf-8')
  console.log(`\n📄 Report saved to: ${reportPath}`)
}

// Run analysis
analyzeNavigationCoverage()

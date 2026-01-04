#!/usr/bin/env tsx
// @env-allow-legacy-dotenv

/**
 * Pilot Data Seeding CLI
 * 
 * Creates deterministic seeds for 5 real vendors + 20 pilot users.
 * Ensures stable test data and validates the core booking flow.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { faker } from '@faker-js/faker'

// Load environment variables
config({ path: '.env.local' })

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

type AdminUser = { id: string; email?: string | null }

async function loadExistingUsersByEmail(): Promise<Map<string, string>> {
  const map = new Map<string, string>()

  // Supabase Admin API returns paginated users; pilot datasets are small, but we still handle pagination safely.
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('Failed to list existing users:', error)
      break
    }

    const users = (data?.users || []) as AdminUser[]
    for (const u of users) {
      if (u.email) map.set(u.email.toLowerCase(), u.id)
    }

    if (users.length < perPage) break
    page += 1
  }

  return map
}

function isUserAlreadyExistsError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message?.toLowerCase() || ''
  return msg.includes('already registered') || msg.includes('user already registered') || msg.includes('already exists')
}

async function ensureAuthUserIdByEmail(
  email: string,
  metadata: Record<string, unknown>
): Promise<string | null> {
  const normalizedEmail = email.toLowerCase()
  const existing = existingUsersByEmail.get(normalizedEmail)
  if (existing) return existing

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'pilot123!',
    email_confirm: true,
    user_metadata: metadata,
  })

  if (error) {
    if (isUserAlreadyExistsError(error)) {
      // Refresh once and retry lookup
      existingUsersByEmail = await loadExistingUsersByEmail()
      return existingUsersByEmail.get(normalizedEmail) || null
    }

    console.error(`Failed to create user ${email}:`, error)
    return null
  }

  const id = data?.user?.id
  if (id) existingUsersByEmail.set(normalizedEmail, id)
  return id || null
}

async function ensureProfileRow(
  id: string,
  row: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Failed to check profiles row:', error)
    return false
  }

  if (data?.id) return true

  const { error: insertError } = await supabase.from('profiles').insert({ id, ...row })
  if (insertError) {
    console.error('Failed to insert profiles row:', insertError)
    return false
  }

  return true
}

async function ensureProviderLocation(providerId: string, row: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await supabase
    .from('provider_locations')
    .select('provider_id')
    .eq('provider_id', providerId)
    .maybeSingle()

  if (error) {
    console.error('Failed to check provider_locations row:', error)
    return false
  }

  if (data?.provider_id) return true

  const { error: insertError } = await supabase
    .from('provider_locations')
    .insert({ provider_id: providerId, ...row })

  if (insertError) {
    console.error('Failed to insert provider_locations row:', insertError)
    return false
  }

  return true
}

async function ensureVendorSpecialty(providerId: string, specialty: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('vendor_specialties')
    .select('provider_id,specialty')
    .eq('provider_id', providerId)
    .eq('specialty', specialty)
    .maybeSingle()

  if (error) {
    console.error('Failed to check vendor_specialties row:', error)
    return false
  }

  if (data?.provider_id) return true

  const { error: insertError } = await supabase
    .from('vendor_specialties')
    .insert({
      provider_id: providerId,
      specialty,
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (insertError) {
    console.error('Failed to insert vendor_specialties row:', insertError)
    return false
  }

  return true
}

let existingUsersByEmail: Map<string, string> = new Map()

// Pilot data configuration
const PILOT_CONFIG = {
  vendors: 5,
  users: 20,
  specialties: ['haircut', 'styling', 'coloring', 'treatment', 'manicure', 'pedicure'],
  cities: [
    { name: 'Montreal', lat: 45.5017, lng: -73.5673 },
    { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
    { name: 'Vancouver', lat: 49.2827, lng: -123.1207 },
    { name: 'Calgary', lat: 51.0447, lng: -114.0719 },
    { name: 'Ottawa', lat: 45.4215, lng: -75.6972 }
  ]
}

// Vendor business data (real business names for pilot)
const VENDOR_BUSINESSES = [
  {
    name: 'Style Studio Montreal',
    specialty: 'haircut',
    city: 'Montreal',
    basePrice: 3500, // $35.00
    rating: 4.8,
    description: 'Professional hair styling and cutting services'
  },
  {
    name: 'Elite Barbershop',
    specialty: 'haircut',
    city: 'Toronto',
    basePrice: 4000, // $40.00
    rating: 4.6,
    description: 'Premium men\'s grooming and haircuts'
  },
  {
    name: 'Beauty Haven',
    specialty: 'styling',
    city: 'Vancouver',
    basePrice: 4500, // $45.00
    rating: 4.9,
    description: 'Luxury hair styling and beauty services'
  },
  {
    name: 'Urban Cuts',
    specialty: 'haircut',
    city: 'Calgary',
    basePrice: 3000, // $30.00
    rating: 4.5,
    description: 'Modern haircuts and styling for all ages'
  },
  {
    name: 'Prestige Salon',
    specialty: 'coloring',
    city: 'Ottawa',
    basePrice: 6000, // $60.00
    rating: 4.7,
    description: 'Professional hair coloring and treatment services'
  }
]

interface VendorData {
  id: string
  name: string
  email: string
  specialty: string
  city: string
  lat: number
  lng: number
  basePrice: number
  rating: number
  description: string
  isActive: boolean
}

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  city: string
  preferences: string[]
}

interface ServiceData {
  vendorId: string
  name: string
  description: string
  priceCents: number
  durationMinutes: number
  category: string
}

/**
 * Generate deterministic vendor data
 */
function generateVendors(): VendorData[] {
  return VENDOR_BUSINESSES.map((business, index) => {
    const city = PILOT_CONFIG.cities.find(c => c.name === business.city)!
    
    return {
      id: `vendor-${String(index + 1).padStart(3, '0')}`,
      name: business.name,
      email: `vendor${index + 1}@pilot.bookiji.com`,
      specialty: business.specialty,
      city: business.city,
      lat: city.lat + (Math.random() - 0.5) * 0.01, // Small random offset
      lng: city.lng + (Math.random() - 0.5) * 0.01,
      basePrice: business.basePrice,
      rating: business.rating,
      description: business.description,
      isActive: true
    }
  })
}

/**
 * Generate deterministic user data
 */
function generateUsers(): UserData[] {
  const users: UserData[] = []
  
  for (let i = 0; i < PILOT_CONFIG.users; i++) {
    const city = PILOT_CONFIG.cities[i % PILOT_CONFIG.cities.length]
    
    users.push({
      id: `user-${String(i + 1).padStart(3, '0')}`,
      email: `user${i + 1}@pilot.bookiji.com`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      city: city.name,
      preferences: faker.helpers.arrayElements(PILOT_CONFIG.specialties, { min: 1, max: 3 })
    })
  }
  
  return users
}

/**
 * Generate services for vendors
 */
function generateServices(vendors: VendorData[], idMap: Record<string, string>): ServiceData[] {
  const services: ServiceData[] = []
  
  vendors.forEach(vendor => {
    const realProviderId = idMap[vendor.id]
    if (!realProviderId) {
      console.warn(`Skipping services for vendor ${vendor.id} (no real ID found)`)
      return
    }

    // Base service
    services.push({
      vendorId: realProviderId,
      name: `${vendor.specialty.charAt(0).toUpperCase() + vendor.specialty.slice(1)}`,
      description: vendor.description,
      priceCents: vendor.basePrice,
      durationMinutes: 30,
      category: vendor.specialty
    })
    
    // Premium service
    services.push({
      vendorId: realProviderId,
      name: `Premium ${vendor.specialty}`,
      description: `Enhanced ${vendor.specialty} with premium products`,
      priceCents: vendor.basePrice + 2000, // +$20.00
      durationMinutes: 45,
      category: vendor.specialty
    })
    
    // Express service
    services.push({
      vendorId: realProviderId,
      name: `Express ${vendor.specialty}`,
      description: `Quick ${vendor.specialty} service`,
      priceCents: vendor.basePrice - 1000, // -$10.00
      durationMinutes: 20,
      category: vendor.specialty
    })
  })
  
  return services
}

/**
 * Seed vendors to database
 */
async function seedVendors(vendors: VendorData[]): Promise<Record<string, string>> {
  console.log('🌱 Seeding vendors...')
  const idMap: Record<string, string> = {}
  
  for (const vendor of vendors) {
    try {
      const realId = await ensureAuthUserIdByEmail(vendor.email, {
        role: 'vendor',
        vendor_id: vendor.id,
      })

      if (!realId) {
        continue
      }

      idMap[vendor.id] = realId
      
      const okProfile = await ensureProfileRow(realId, {
        email: vendor.email,
        first_name: vendor.name.split(' ')[0],
        last_name: vendor.name.split(' ').slice(1).join(' '),
        role: 'vendor',
        is_active: vendor.isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (!okProfile) {
        continue
      }
      
      const okLocation = await ensureProviderLocation(realId, {
        latitude: vendor.lat,
        longitude: vendor.lng,
        city: vendor.city,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (!okLocation) {
        continue
      }
      
      const okSpecialty = await ensureVendorSpecialty(realId, vendor.specialty)
      if (!okSpecialty) {
        continue
      }
      
      console.log(`✅ Created vendor: ${vendor.name} (${vendor.email})`)
    } catch (error) {
      console.error(`Failed to seed vendor ${vendor.name}:`, error)
    }
  }
  return idMap
}

/**
 * Seed users to database
 */
async function seedUsers(users: UserData[]): Promise<void> {
  console.log('👥 Seeding users...')
  
  for (const user of users) {
    try {
      const realId = await ensureAuthUserIdByEmail(user.email, {
        role: 'customer',
        preferences: user.preferences,
      })

      if (!realId) {
        continue
      }
      
      const okProfile = await ensureProfileRow(realId, {
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: 'customer',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (!okProfile) {
        continue
      }
      
      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`)
    } catch (error) {
      console.error(`Failed to seed user ${user.email}:`, error)
    }
  }
}

/**
 * Seed services to database
 */
async function seedServices(services: ServiceData[]): Promise<void> {
  console.log('🛠️ Seeding services...')
  
  for (const service of services) {
    try {
      const { data: existing, error: existingError } = await supabase
        .from('services')
        .select('id')
        .eq('provider_id', service.vendorId)
        .eq('name', service.name)
        .maybeSingle()

      if (existingError) {
        console.error(`Failed to check existing service ${service.name}:`, existingError)
        continue
      }

      if (existing?.id) {
        continue
      }

      const { error } = await supabase
        .from('services')
        .insert({
          provider_id: service.vendorId,
          name: service.name,
          description: service.description,
          price_cents: service.priceCents,
          duration_minutes: service.durationMinutes,
          category: service.category,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error(`Failed to create service ${service.name}:`, error)
        continue
      }
      
      console.log(`✅ Created service: ${service.name} ($${(service.priceCents / 100).toFixed(2)})`)
    } catch (error) {
      console.error(`Failed to seed service ${service.name}:`, error)
    }
  }
}

/**
 * Main seeding function
 */
async function seedPilotData(): Promise<void> {
  console.log('🚀 Starting pilot data seeding...')
  console.log('=====================================')
  
  try {
    existingUsersByEmail = await loadExistingUsersByEmail()

    // Generate data
    const vendors = generateVendors()
    const users = generateUsers()
    
    console.log(`📊 Data plan:`)
    console.log(`   Vendors: ${vendors.length}`)
    console.log(`   Users: ${users.length}`)
    console.log('')
    
    // Seed data
    const idMap = await seedVendors(vendors)
    console.log('')
    
    await seedUsers(users)
    console.log('')
    
    const services = generateServices(vendors, idMap)
    console.log(`   Services: ${services.length}`)
    await seedServices(services)
    
    console.log('=====================================')
    console.log('🎉 Pilot data seeding completed!')
    console.log('')
    console.log('📋 Next steps:')
    console.log('   1. Test vendor login with pilot123!')
    console.log('   2. Test user login with pilot123!')
    console.log('   3. Validate end-to-end booking flow')
    console.log('   4. Check email delivery for receipts')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
seedPilotData()

export { seedPilotData, generateVendors, generateUsers, generateServices }

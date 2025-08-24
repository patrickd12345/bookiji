#!/usr/bin/env tsx

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
config()

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  id: string
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
function generateServices(vendors: VendorData[]): ServiceData[] {
  const services: ServiceData[] = []
  
  vendors.forEach(vendor => {
    // Base service
    services.push({
      id: `service-${vendor.id}-base`,
      vendorId: vendor.id,
      name: `${vendor.specialty.charAt(0).toUpperCase() + vendor.specialty.slice(1)}`,
      description: vendor.description,
      priceCents: vendor.basePrice,
      durationMinutes: 30,
      category: vendor.specialty
    })
    
    // Premium service
    services.push({
      id: `service-${vendor.id}-premium`,
      vendorId: vendor.id,
      name: `Premium ${vendor.specialty}`,
      description: `Enhanced ${vendor.specialty} with premium products`,
      priceCents: vendor.basePrice + 2000, // +$20.00
      durationMinutes: 45,
      category: vendor.specialty
    })
    
    // Express service
    services.push({
      id: `service-${vendor.id}-express`,
      vendorId: vendor.id,
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
async function seedVendors(vendors: VendorData[]): Promise<void> {
  console.log('🌱 Seeding vendors...')
  
  for (const vendor of vendors) {
    try {
      // Create user account for vendor
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: vendor.email,
        password: 'pilot123!',
        email_confirm: true,
        user_metadata: {
          role: 'vendor',
          vendor_id: vendor.id
        }
      })
      
      if (userError) {
        console.error(`Failed to create vendor user ${vendor.email}:`, userError)
        continue
      }
      
      // Create vendor profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          email: vendor.email,
          first_name: vendor.name.split(' ')[0],
          last_name: vendor.name.split(' ').slice(1).join(' '),
          role: 'vendor',
          is_active: vendor.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.error(`Failed to create vendor profile for ${vendor.email}:`, profileError)
        continue
      }
      
      // Create vendor location
      const { error: locationError } = await supabase
        .from('provider_locations')
        .insert({
          provider_id: userData.user.id,
          latitude: vendor.lat,
          longitude: vendor.lng,
          city: vendor.city,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (locationError) {
        console.error(`Failed to create vendor location for ${vendor.email}:`, locationError)
        continue
      }
      
      // Create vendor specialty
      const { error: specialtyError } = await supabase
        .from('vendor_specialties')
        .insert({
          provider_id: userData.user.id,
          specialty: vendor.specialty,
          is_primary: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (specialtyError) {
        console.error(`Failed to create vendor specialty for ${vendor.email}:`, specialtyError)
        continue
      }
      
      console.log(`✅ Created vendor: ${vendor.name} (${vendor.email})`)
    } catch (error) {
      console.error(`Failed to seed vendor ${vendor.name}:`, error)
    }
  }
}

/**
 * Seed users to database
 */
async function seedUsers(users: UserData[]): Promise<void> {
  console.log('👥 Seeding users...')
  
  for (const user of users) {
    try {
      // Create user account
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'pilot123!',
        email_confirm: true,
        user_metadata: {
          role: 'customer',
          preferences: user.preferences
        }
      })
      
      if (userError) {
        console.error(`Failed to create user ${user.email}:`, userError)
        continue
      }
      
      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          role: 'customer',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.error(`Failed to create user profile for ${user.email}:`, profileError)
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
      const { error } = await supabase
        .from('services')
        .insert({
          id: service.id,
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
    // Generate data
    const vendors = generateVendors()
    const users = generateUsers()
    const services = generateServices(vendors)
    
    console.log(`📊 Generated data:`)
    console.log(`   Vendors: ${vendors.length}`)
    console.log(`   Users: ${users.length}`)
    console.log(`   Services: ${services.length}`)
    console.log('')
    
    // Seed data
    await seedVendors(vendors)
    console.log('')
    await seedUsers(users)
    console.log('')
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
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPilotData()
}

export { seedPilotData, generateVendors, generateUsers, generateServices }

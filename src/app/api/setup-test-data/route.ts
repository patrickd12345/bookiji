import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
import { randomUUID } from 'crypto'

export async function POST() {
  try {
    console.log('🔧 Generating extensive test data...')

    const vendorAddresses = [
      {
        address: '1000 Rue de la Gauchetière O',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3B 4W5',
        latitude: 45.4971,
        longitude: -73.5689
      },
      {
        address: '2000 Rue Peel',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3A 2W5',
        latitude: 45.4995,
        longitude: -73.5771
      },
      {
        address: '1500 Avenue McGill College',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3A 3J5',
        latitude: 45.5019,
        longitude: -73.5728
      },
      {
        address: '500 Boulevard René-Lévesque O',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2Z 1W7',
        latitude: 45.5065,
        longitude: -73.5662
      },
      {
        address: '800 Rue Sherbrooke O',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3A 1G1',
        latitude: 45.5042,
        longitude: -73.5775
      },
      {
        address: '900 Rue Sainte-Catherine E',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2L 2E5',
        latitude: 45.5135,
        longitude: -73.559
      },
      {
        address: '1100 Avenue des Canadiens-de-Montréal',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3B 2S2',
        latitude: 45.496,
        longitude: -73.569
      },
      {
        address: '1200 Boulevard de Maisonneuve O',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3A 1N5',
        latitude: 45.5012,
        longitude: -73.5741
      },
      {
        address: '1300 Avenue du Mont-Royal E',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2J 1Y2',
        latitude: 45.5265,
        longitude: -73.58
      },
      {
        address: '1400 Rue Amherst',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2L 3L1',
        latitude: 45.516,
        longitude: -73.563
      },
      {
        address: '1500 Avenue Atwater',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3Z 1X5',
        latitude: 45.488,
        longitude: -73.586
      },
      {
        address: '1600 Boulevard Saint-Laurent',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2X 2S9',
        latitude: 45.509,
        longitude: -73.57
      },
      {
        address: '1700 Avenue Papineau',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2K 4J5',
        latitude: 45.526,
        longitude: -73.552
      },
      {
        address: '1800 Boulevard de Maisonneuve E',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2L 2L5',
        latitude: 45.521,
        longitude: -73.5595
      },
      {
        address: '1900 Rue Notre-Dame O',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3J 1M8',
        latitude: 45.4885,
        longitude: -73.565
      },
      {
        address: '2000 Rue Saint-Denis',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2X 3K7',
        latitude: 45.5178,
        longitude: -73.5699
      },
      {
        address: '2100 Rue Guy',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3H 2M8',
        latitude: 45.4922,
        longitude: -73.578
      },
      {
        address: '2200 Rue Crescent',
        city: 'Montréal',
        state: 'QC',
        zip: 'H3G 2B8',
        latitude: 45.4978,
        longitude: -73.5772
      },
      {
        address: '2300 Avenue du Parc',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2H 1X2',
        latitude: 45.524,
        longitude: -73.587
      },
      {
        address: '2400 Rue Clark',
        city: 'Montréal',
        state: 'QC',
        zip: 'H2X 2R7',
        latitude: 45.515,
        longitude: -73.568
      }
    ]

    const vendors = Array.from({ length: 20 }, (_, i) => ({
      id: randomUUID(),
      email: `vendor${i + 1}@example.com`,
      role: 'vendor',
      full_name: `Vendor ${i + 1}`
    }))

    const customers = Array.from({ length: 50 }, (_, i) => ({
      id: randomUUID(),
      email: `customer${i + 1}@example.com`,
      role: 'customer',
      full_name: `Customer ${i + 1}`
    }))

    const { error: userErr } = await supabase
      .from('users')
      .upsert([...vendors, ...customers], { onConflict: 'id' })
    if (userErr) console.error('Error upserting users:', userErr)

    const services: { id: string; vendor_id: string; price_cents: number }[] = []
    for (const [i, vendor] of vendors.entries()) {
      const service = {
        id: randomUUID(),
        vendor_id: vendor.id,
        name: `Service ${i + 1}`,
        description: `Test service ${i + 1}`,
        duration_minutes: 60,
        price_cents: 2000,
        category: 'test'
      }
      const { error } = await supabase
        .from('services')
        .upsert(service, { onConflict: 'id' })
      if (error) console.error('Error creating service', error)
      services.push({ id: service.id, vendor_id: vendor.id, price_cents: 2000 })

      const addr = vendorAddresses[i]
      const { error: locErr } = await supabase
        .from('provider_locations')
        .upsert(
          {
            id: randomUUID(),
            vendor_id: vendor.id,
            name: `Location ${i + 1}`,
            address: addr.address,
            latitude: addr.latitude,
            longitude: addr.longitude,
            city: addr.city,
            state: addr.state,
            zip_code: addr.zip,
            country: 'CA',
            is_primary: true,
            is_active: true
          },
          { onConflict: 'id' }
        )
      if (locErr) console.error('Error creating location', locErr)
    }

    const slots: {
      id: string
      vendor_id: string
      service_id: string
      start_time: string
      end_time: string
    }[] = []

    const base = new Date()
    base.setDate(base.getDate() + 1)
    base.setHours(9, 0, 0, 0)

    for (const [i, svc] of services.entries()) {
      for (let j = 0; j < 3; j++) {
        const start = new Date(base.getTime() + (i * 3 + j) * 60 * 60 * 1000)
        const end = new Date(start.getTime() + 60 * 60 * 1000)
        const slot = {
          id: randomUUID(),
          vendor_id: svc.vendor_id,
          service_id: svc.id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_booked: false
        }
        const { error } = await supabase
          .from('availability_slots')
          .upsert(slot, { onConflict: 'id' })
        if (error) console.error('Error creating slot', error)
        slots.push(slot)
      }
    }

    const bookings = []
    for (let i = 0; i < 50; i++) {
      const slot = slots[i]
      const booking = {
        id: randomUUID(),
        customer_id: customers[i].id,
        vendor_id: slot.vendor_id,
        service_id: slot.service_id,
        slot_id: slot.id,
        slot_start: slot.start_time,
        slot_end: slot.end_time,
        status: 'confirmed',
        total_amount_cents: 2000
      }
      const { error } = await supabase
        .from('bookings')
        .upsert(booking, { onConflict: 'id' })
      if (error) console.error('Error creating booking', error)

      await supabase.from('availability_slots').update({ is_booked: true }).eq('id', slot.id)
      bookings.push(booking)
    }

    console.log('✅ Test data generation complete')
    return NextResponse.json({
      success: true,
      message: 'Test data created',
      data: {
        vendors: vendors.length,
        customers: customers.length,
        bookings: bookings.length
      }
    })
  } catch (error) {
    console.error('❌ Test data setup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test data setup failed'
      },
      { status: 500 }
    )
  }
}

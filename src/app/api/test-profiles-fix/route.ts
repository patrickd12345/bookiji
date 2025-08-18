import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET() {
	try {
		console.log('🧪 Testing profiles table access after fix...')

		const config = getSupabaseConfig()
		const key = config.publishableKey || config.anonKey
		if (!config.url || !key) {
			return NextResponse.json({
				success: false,
				error: 'Missing Supabase configuration',
				urlSet: !!config.url,
				keySet: !!key
			}, { status: 500 })
		}

		const supabase = createClient(config.url, key)

		const { data: profilesData, error: profilesError } = await supabase
			.from('profiles')
			.select('id, email, role')
			.limit(5)

		if (profilesError) {
			return NextResponse.json({
				success: false,
				error: 'Profiles query failed',
				code: (profilesError as { code?: string }).code,
				message: profilesError.message
			}, { status: 500 })
		}

		return NextResponse.json({
			success: true,
			profilesCount: profilesData?.length || 0,
			sampleData: profilesData?.slice(0, 2) || []
		})

	} catch (error) {
		return NextResponse.json({
			success: false,
			error: 'Test failed',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}

import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL not configured')
    }

    const file = `backup-${new Date().toISOString().split('T')[0]}.sql`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execSync(`pg_dump ${url} > ${file}`, { stdio: 'inherit', shell: true } as any)
    
    console.log(`Daily backup completed: ${file}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Daily backup completed: ${file}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Daily backup failed:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Backup failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

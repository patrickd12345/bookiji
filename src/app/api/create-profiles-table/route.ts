import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // 🛡️ Security: Require CRON_SECRET for this admin endpoint
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.warn('🔧 Creating profiles table...')
    
    // Create the profiles table (simplified version)
    const createProfilesTable = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
        full_name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        role TEXT CHECK (role IN ('customer', 'vendor', 'admin')),
        preferences JSONB,
        marketing_consent BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `
    
    // Enable RLS
    const enableRLS = `
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    `
    
    // Create policies
    const createPolicies = `
      CREATE POLICY "Public profiles are viewable by everyone"
        ON profiles FOR SELECT
        USING (true);

      CREATE POLICY "Users can insert their own profile"
        ON profiles FOR INSERT
        WITH CHECK (auth.uid() = id);

      CREATE POLICY "Users can update own profile"
        ON profiles FOR UPDATE
        USING (auth.uid() = id);
    `
    
    // Create trigger function
    const createTriggerFunction = `
      CREATE OR REPLACE FUNCTION handle_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `
    
    // Create trigger
    const createTrigger = `
      CREATE TRIGGER handle_profiles_updated_at
        BEFORE UPDATE ON profiles
        FOR EACH ROW
        EXECUTE PROCEDURE handle_updated_at();
    `
    
    // Execute the SQL (you'll need to do this manually in Supabase Dashboard)
    console.warn('📝 SQL to run in Supabase Dashboard:')
    console.warn(createProfilesTable)
    console.warn(enableRLS)
    console.warn(createPolicies)
    console.warn(createTriggerFunction)
    console.warn(createTrigger)
    
    return NextResponse.json({
      success: true,
      message: 'Profiles table creation SQL generated. Please run this in your Supabase Dashboard SQL Editor.',
      sql: {
        createTable: createProfilesTable,
        enableRLS: enableRLS,
        createPolicies: createPolicies,
        createTriggerFunction: createTriggerFunction,
        createTrigger: createTrigger
      }
    })
    
  } catch (error) {
    console.error('❌ Failed to generate SQL:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 
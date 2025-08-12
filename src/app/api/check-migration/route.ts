import { NextResponse } from 'next/server';
import { isUsingNewKeyModel, getEnvironmentVariableNames, validateSupabaseConfig } from '@/config/supabase';

export async function GET() {
  try {
    const migrationStatus = {
      isNewModelActive: isUsingNewKeyModel(),
      environmentVariables: getEnvironmentVariableNames(),
      validation: validateSupabaseConfig(),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: migrationStatus
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

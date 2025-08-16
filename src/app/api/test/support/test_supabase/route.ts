import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

export async function POST() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error:'disabled' }, { status:403 });

  try {
    // Get the config
    const config = getSupabaseConfig();
    
    // Check if we have the required keys
    if (!config.url) {
      return NextResponse.json({ error: 'Missing Supabase URL' });
    }
    
    if (!config.secretKey) {
      return NextResponse.json({ error: 'Missing Supabase secret key' });
    }

    // Try different client configurations
    let admin;
    let error: any;
    
    // Try 1: Default configuration
    try {
      admin = createClient(config.url, config.secretKey, { 
        auth: { persistSession: false } 
      });
      
      const { data, error: queryError } = await admin
        .from('kb_articles')
        .select('count')
        .limit(1);
        
      if (!queryError) {
        return NextResponse.json({
          success: true,
          method: 'default',
          config: {
            url: config.url,
            hasSecretKey: !!config.secretKey,
            secretKeyLength: config.secretKey?.length || 0
          },
          query_result: data
        });
      }
      error = queryError;
    } catch (e) {
      error = e;
    }

    // Try 2: With global fetch binding
    try {
      admin = createClient(config.url, config.secretKey, { 
        auth: { persistSession: false },
        global: {
          fetch: fetch.bind(globalThis)
        }
      });
      
      const { data, error: queryError } = await admin
        .from('kb_articles')
        .select('count')
        .limit(1);
        
      if (!queryError) {
        return NextResponse.json({
          success: true,
          method: 'global_fetch',
          config: {
            url: config.url,
            hasSecretKey: !!config.secretKey,
            secretKeyLength: config.secretKey?.length || 0
          },
          query_result: data
        });
      }
      error = queryError;
    } catch (e) {
      error = e;
    }

    // Try 3: With custom fetch
    try {
      const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
        return fetch(input, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers
          }
        });
      };
      
      admin = createClient(config.url, config.secretKey, { 
        auth: { persistSession: false },
        global: {
          fetch: customFetch
        }
      });
      
      const { data, error: queryError } = await admin
        .from('kb_articles')
        .select('count')
        .limit(1);
        
      if (!queryError) {
        return NextResponse.json({
          success: true,
          method: 'custom_fetch',
          config: {
            url: config.url,
            hasSecretKey: !!config.secretKey,
            secretKeyLength: config.secretKey?.length || 0
          },
          query_result: data
        });
      }
      error = queryError;
    } catch (e) {
      error = e;
    }

    // All methods failed
    return NextResponse.json({ 
      error: 'All client configurations failed', 
      lastError: error?.message || String(error),
      config: {
        url: config.url,
        hasSecretKey: !!config.secretKey,
        secretKeyLength: config.secretKey?.length || 0
      }
    });

  } catch (e) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: String(e),
      stack: e instanceof Error ? e.stack : undefined
    });
  }
}

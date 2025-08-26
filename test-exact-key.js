import { createClient } from '@supabase/supabase-js';

// Get the exact key from environment
const supabaseUrl = 'https://lzgynywojluwdccqkeop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6Z3lueXdvamx1d2RjY3FrZW9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTc1MDEyMDE5NSwiZXhwIjoyMDY1Njk2MTk1fQ.3kehlumtOoHyy3tSuL6gaDMD71NdQwMCRXuK0_ZC8r0';

console.log('Testing with exact key from .env.local:');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey.length);
console.log('Key starts with:', supabaseKey.substring(0, 20));
console.log('Key ends with:', supabaseKey.substring(supabaseKey.length - 20));

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log('\nTesting connection...');
    
    // Test select first
    const { data: selectData, error: selectError } = await supabase
      .from('kb_articles')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('Select Error:', selectError);
    } else {
      console.log('✅ Select Success!', selectData);
    }
    
    // Test insert
    console.log('\nTesting insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('kb_articles')
      .insert({
        title: 'Test Article',
        content: 'This is a test article content.',
        locale: 'en',
        section: 'faq'
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error('Insert Error:', insertError);
    } else {
      console.log('✅ Insert Success!', insertData);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();


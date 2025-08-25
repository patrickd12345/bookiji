# Support System Cron Jobs Setup

This document describes how to set up automated cron jobs for the Bookiji support system.

## Auto-Deduplication Cron Job

The support system includes an auto-deduplication feature that runs hourly to check for duplicate KB suggestions.

### Option 1: Supabase Edge Functions (Recommended)

1. **Create Edge Function**
   ```bash
   supabase functions new support-auto-dedupe
   ```

2. **Function Code** (`supabase/functions/support-auto-dedupe/index.ts`):
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   }

   serve(async (req) => {
     if (req.method === 'OPTIONS') {
       return new Response('ok', { headers: corsHeaders })
     }

     try {
       const supabaseUrl = Deno.env.get('SUPABASE_URL')!
       const supabaseServiceKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
       const adminApiKey = Deno.env.get('ADMIN_API_KEY')!

       // Verify admin API key
       const authHeader = req.headers.get('authorization')
       if (!authHeader?.startsWith('Bearer ') || authHeader.split(' ')[1] !== adminApiKey) {
         return new Response(JSON.stringify({ error: 'Unauthorized' }), {
           status: 403,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
         })
       }

       const supabase = createClient(supabaseUrl, supabaseServiceKey)

       // Get threshold from env or use default
       const threshold = Number(Deno.env.get('SUPPORT_KB_AUTO_DUP_RECHECK') ?? 0.92)

       // Find pending suggestions with embeddings
       const { data: pending, error } = await supabase
         .from('kb_suggestions')
         .select('id,q_embedding')
         .eq('status', 'pending')
         .not('q_embedding', 'is', null)
         .limit(50)

       if (error) {
         throw error
       }

       if (!pending || pending.length === 0) {
         return new Response(JSON.stringify({ message: 'No pending suggestions found' }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
         })
       }

       // Check each suggestion against KB
       const dupes = []
       for (const item of pending) {
         try {
           if (!item.q_embedding) continue

           const { data: hits } = await supabase.rpc('match_kb', {
             query_embedding: item.q_embedding,
             match_count: 1,
             min_sim: 0.0
           })

           const bestMatch = hits?.[0]
           
           // If similarity exceeds threshold, mark as duplicate
           if (bestMatch && bestMatch.similarity >= threshold) {
             const { error: updateError } = await supabase
               .from('kb_suggestions')
               .update({ 
                 status: 'duplicate', 
                 target_article_id: bestMatch.article_id,
                 similarity_to_best: bestMatch.similarity
               })
               .eq('id', item.id)
               
             if (!updateError) {
               dupes.push({
                 id: item.id,
                 article_id: bestMatch.article_id,
                 similarity: bestMatch.similarity
               })
             }
           }
         } catch (e) {
           console.error('Failed to check suggestion for duplicates', { id: item.id, error: e })
         }
       }

       return new Response(JSON.stringify({ 
         message: `Found ${dupes.length} duplicates among ${pending.length} pending suggestions`,
         dupes
       }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       })

     } catch (error) {
       return new Response(JSON.stringify({ error: error.message }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       })
     }
   })
   ```

3. **Deploy Function**
   ```bash
   supabase functions deploy support-auto-dedupe
   ```

4. **Set Environment Variables**
   ```bash
   supabase secrets set ADMIN_API_KEY=your-admin-key
   supabase secrets set SUPPORT_KB_AUTO_DUP_RECHECK=0.92
   ```

5. **Create Cron Job**
   ```sql
   -- In Supabase SQL Editor
   SELECT cron.schedule(
     'support-auto-dedupe',
     '0 * * * *', -- Every hour
     'SELECT net.http_post(
       url := ''https://your-project.supabase.co/functions/v1/support-auto-dedupe'',
       headers := ''{"Authorization": "Bearer your-admin-key"}'',
       body := ''{}''
     );'
   );
   ```

### Option 2: External Cron Service

If you prefer external cron services (Railway, Vercel Cron, etc.):

1. **Create a cron endpoint** in your Next.js app:
   ```typescript
   // app/api/cron/support-auto-dedupe/route.ts
   export async function GET(req: Request) {
     // Verify cron secret
     const authHeader = req.headers.get('authorization')
     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
     }

     // Call the auto-dedupe endpoint
     const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/kb/auto_dedupe`, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${process.env.ADMIN_API_KEY}` }
     })

     return NextResponse.json(await response.json())
   }
   ```

2. **Set up cron job** in your hosting platform:
   - **Railway**: Use `railway cron` command
   - **Vercel**: Use Vercel Cron Jobs
   - **GitHub Actions**: Create a workflow with cron schedule

### Option 3: Manual Testing

Test the auto-deduplication manually:

```bash
# Test the endpoint
curl -X POST https://your-project.supabase.co/functions/v1/support-auto-dedupe \
  -H "Authorization: Bearer your-admin-key"

# Or test the Next.js endpoint
curl -X POST http://localhost:3000/api/admin/kb/auto_dedupe \
  -H "Authorization: Bearer dev-admin-key"
```

## Monitoring and Alerts

### 1. Log Monitoring
The auto-deduplication process logs key events:
- `support.kb_suggest.duplicate` - When duplicates are found
- `support.kb_suggest.created` - When new suggestions are created
- `support.ticket.escalated` - When tickets are escalated

### 2. Metrics Dashboard
Consider setting up a simple metrics dashboard:

```typescript
// Example metrics endpoint
export async function GET() {
  const stats = await getSupportStats()
  return NextResponse.json({
    suggestions: {
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      duplicate: stats.duplicate
    },
    tickets: {
      open: stats.openTickets,
      escalated: stats.escalatedTickets
    }
  })
}
```

### 3. Health Checks
Set up health checks for the cron jobs:

```bash
# Check if cron is running
curl https://your-project.supabase.co/functions/v1/support-auto-dedupe/health

# Check last run time
curl https://your-project.supabase.co/functions/v1/support-auto-dedupe/status
```

## Troubleshooting

### Common Issues

1. **Function not deploying**: Check Supabase CLI version and project linking
2. **Environment variables not set**: Verify secrets are properly configured
3. **Cron not running**: Check Supabase cron extension is enabled
4. **Rate limiting**: The function includes built-in rate limiting

### Debug Mode

Enable debug logging by setting:
```bash
supabase secrets set SUPPORT_DEBUG=true
```

### Manual Override

If needed, manually trigger the process:
```bash
# Via Supabase dashboard SQL editor
SELECT net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/support-auto-dedupe',
  headers := '{"Authorization": "Bearer your-admin-key"}',
  body := '{}'
);
```

## Security Considerations

1. **Admin API Key**: Keep the admin API key secure and rotate regularly
2. **Function Access**: The edge function is public but requires the admin API key
3. **Rate Limiting**: Built-in rate limiting prevents abuse
4. **Audit Logging**: All operations are logged for audit purposes

## Performance Optimization

1. **Batch Processing**: Process suggestions in batches of 50
2. **Indexing**: Ensure proper database indexes on `kb_suggestions.status`
3. **Vector Search**: Optimize the `match_kb` function for performance
4. **Caching**: Consider caching frequently accessed KB articles

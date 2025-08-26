-- Disable the HTTP trigger temporarily since net extension is not available
-- We'll handle indexing manually for now

-- Drop the problematic trigger
drop trigger if exists kb_article_changed_trigger on kb_articles;

-- Drop the function that uses net.http_post
drop function if exists kb_article_changed();

-- Note: Manual indexing will be handled by the bootstrap script
-- and can be triggered via the kb-index edge function when needed

-- Expand KB sections to include comprehensive documentation types
-- This allows importing all the different types of documentation

-- First, drop the existing constraint
ALTER TABLE kb_articles DROP CONSTRAINT IF EXISTS kb_articles_section_check;

-- Add the new expanded constraint
ALTER TABLE kb_articles 
ADD CONSTRAINT kb_articles_section_check 
CHECK (section IN (
  'faq',           -- User help and frequently asked questions
  'vendor',        -- Vendor-specific guides
  'policy',        -- Policy and legal documents
  'troubleshooting', -- Problem-solving guides
  'user-guide',    -- User guides and tutorials
  'developer',     -- Developer documentation
  'admin',         -- Administrative guides
  'maintenance',   -- System maintenance and operations
  'api',           -- API documentation
  'deployment',    -- Deployment and infrastructure
  'system'         -- System overview and architecture
));

-- Add a comment explaining the sections
COMMENT ON CONSTRAINT kb_articles_section_check ON kb_articles IS 
'Comprehensive section types covering all Bookiji documentation categories';

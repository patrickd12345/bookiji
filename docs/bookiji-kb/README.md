---
title: Bookiji Knowledge Base System
locale: en
section: faq
---

# Bookiji Knowledge Base System

This directory contains the source Markdown files for Bookiji's knowledge base. The system automatically imports these files into the database and generates AI embeddings for intelligent search and Q&A.

## Directory Structure

```
docs/bookiji-kb/
├── README.md                    # This file
├── getting-started.md           # Getting started guide
├── connexion-stripe.md          # French Stripe connection guide
├── ai-features.md              # AI features documentation
├── vendor/                      # Vendor-specific documentation
│   └── onboarding.md           # Vendor onboarding guide
└── troubleshooting/             # Troubleshooting guides
    └── payment-issues.md       # Payment issues and solutions
```

## File Format

### Front Matter
Each Markdown file must include YAML front matter with these fields:

```yaml
---
title: Document Title
locale: en          # "en" or "fr"
section: faq        # "faq", "vendor", "policy", or "troubleshooting"
---
```

### Content
- Use standard Markdown syntax
- UTF-8 encoding required
- Support for nested headings, lists, links, and formatting
- Images and other media can be referenced

### Supported Sections
- **faq**: Frequently asked questions and general help
- **vendor**: Provider-specific documentation
- **policy**: Terms, conditions, and policies
- **troubleshooting**: Problem-solving guides

### Supported Locales
- **en**: English (default)
- **fr**: French

## Adding New Documents

### 1. Create the Markdown File
- Place in appropriate subdirectory if needed
- Use descriptive filename (e.g., `calendar-integration.md`)
- Include proper front matter

### 2. Write Content
- Use clear, concise language
- Structure with proper headings (H1, H2, H3)
- Include practical examples and step-by-step instructions
- Link to related documents when relevant

### 3. Test and Import
- Verify Markdown syntax
- Run `pnpm run test-kb` to test parsing
- Run `pnpm run bootstrap-kb` to import to database

## Import Process

### Automatic Import
The `bootstrap-kb` script:
1. Recursively scans the `docs/bookiji-kb/` directory
2. Parses front matter and content
3. Generates SHA256 checksums for change detection
4. Upserts articles into the database
5. Triggers automatic embedding generation

### Idempotent Operation
- Safe to run multiple times
- Only updates changed content
- Skips unchanged files
- Provides detailed import summary

### Database Integration
- Articles stored in `kb_articles` table
- Automatic embedding generation via database triggers
- Search and Q&A APIs immediately available
- RLS policies ensure proper access control

## Best Practices

### Content Guidelines
- **Clear titles**: Use descriptive, search-friendly titles
- **Logical structure**: Organize content with clear headings
- **Practical examples**: Include real-world scenarios
- **Regular updates**: Keep content current and accurate

### File Organization
- **Group related content**: Use subdirectories for organization
- **Consistent naming**: Use kebab-case for filenames
- **Version control**: Track changes in Git
- **Backup**: Keep local copies of important documents

### Quality Assurance
- **Review content**: Have team members review new documents
- **Test formatting**: Verify Markdown renders correctly
- **Validate links**: Ensure all links work properly
- **Check accuracy**: Verify technical information is correct

## Technical Details

### Database Schema
```sql
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'fr')),
    section TEXT NOT NULL CHECK (section IN ('faq', 'vendor', 'policy', 'troubleshooting')),
    url TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Unique Constraints
- `(lower(title), locale)` combination must be unique
- Prevents duplicate articles per language
- Enables safe re-imports

### Embedding Generation
- Automatic via database triggers
- Uses pgvector for similarity search
- 1536-dimensional vectors (OpenAI compatible)
- Real-time search and Q&A capabilities

## Troubleshooting

### Common Issues
- **Import failures**: Check environment variables and database connection
- **Parsing errors**: Verify Markdown syntax and front matter
- **Duplicate errors**: Check for conflicting titles in same locale
- **Missing embeddings**: Verify database trigger is working

### Debug Commands
```bash
# Test parsing without database import
pnpm run test-kb

# Check database connection
pnpm run bootstrap-kb

# View database logs
supabase logs
```

### Support
- **Technical issues**: Check database logs and error messages
- **Content questions**: Review existing documentation
- **Feature requests**: Submit through project issue tracker

## Future Enhancements

### Planned Features
- **Multi-language support**: Additional locales beyond EN/FR
- **Content versioning**: Track document change history
- **Rich media support**: Enhanced image and video handling
- **Collaborative editing**: Team-based content management
- **Analytics**: Track document usage and effectiveness

### Integration Opportunities
- **CMS integration**: Connect with external content management
- **API endpoints**: Programmatic content access
- **Webhook support**: Real-time content synchronization
- **CDN integration**: Global content distribution

## Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Add or update documentation
4. Test with `pnpm run test-kb`
5. Submit a pull request

### Review Process
- Content accuracy review
- Technical validation
- Formatting consistency check
- Integration testing

### Maintenance
- Regular content audits
- Performance monitoring
- User feedback integration
- Continuous improvement

---

For questions or support with the knowledge base system, contact the development team or refer to the project documentation.

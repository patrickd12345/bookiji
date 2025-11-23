# Translation Guide - Completing i18n

## Current Status
- **Complete**: 18 locales (60%)
- **Incomplete**: 15 locales (50%) - Missing 32 keys each

## Missing Keys Summary

All 15 incomplete locales need these 32 keys:

### Demo Section (11 keys)
- `demo.platform_title`
- `demo.experience_title`
- `demo.experience_body`
- `demo.step1.title`, `demo.step1.body`
- `demo.step2.title`, `demo.step2.body`
- `demo.step3.title`, `demo.step3.body`
- `demo.step4.title`, `demo.step4.body`

### Buttons (6 keys)
- `buttons.book_appointment`
- `buttons.close`
- `buttons.offer_services`
- `buttons.start_interactive_tour`
- `buttons.try_again`
- `buttons.watch_demo`

### Feature/Map (5 keys)
- `feature.map_protection.title`
- `feature.map_protection.desc`
- `radius.analyzing`
- `radius.recommended`
- `radius.refresh`

### Privacy (2 keys)
- `privacy.active`
- `privacy.explainer`

### Other (8 keys)
- `density.dense`, `density.medium`, `density.sparse`
- `label.service`, `label.provider_density`
- `locale.select_language_region`
- `cta.explore_features`, `cta.see_it_action`

## Translation Methods

### Method 1: English Fallback (Quick Fix) ✅ DONE
```bash
node scripts/fill-missing-translations.mjs --fill
```
**Status**: Already completed - all locales now have English fallback values.

### Method 2: Translation API (Automated)

#### Setup

1. **Choose a service:**
   - **Google Translate**: Most comprehensive, paid
   - **DeepL**: Best quality, paid (free tier available)
   - **LibreTranslate**: Free, open-source (can self-host)

2. **Set environment variables:**
   ```bash
   # For Google Translate
   export TRANSLATION_SERVICE=google
   export TRANSLATION_API_KEY=your_google_api_key

   # For DeepL
   export TRANSLATION_SERVICE=deepl
   export TRANSLATION_API_KEY=your_deepl_api_key

   # For LibreTranslate (public instance)
   export TRANSLATION_SERVICE=libre
   export LIBRETRANSLATE_URL=https://libretranslate.com/translate
   ```

3. **Run translation:**
   ```bash
   # Dry run (see what would be translated)
   node scripts/translate-missing-keys.mjs --dry-run

   # Translate all incomplete locales
   node scripts/translate-missing-keys.mjs

   # Translate specific locale
   node scripts/translate-missing-keys.mjs --locale=ru-RU
   ```

#### API Setup Instructions

**Google Translate API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Cloud Translation API
3. Create API key
4. Set `TRANSLATION_API_KEY` environment variable

**DeepL API:**
1. Sign up at [DeepL](https://www.deepl.com/pro-api)
2. Get API key from dashboard
3. Set `TRANSLATION_API_KEY` environment variable

**LibreTranslate (Self-hosted):**
```bash
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
export LIBRETRANSLATE_URL=http://localhost:5000/translate
```

### Method 3: Manual Translation Template

Use this template for manual translation work:

```json
{
  "buttons.book_appointment": "[Translate: Book an Appointment]",
  "buttons.close": "[Translate: Close]",
  "buttons.offer_services": "[Translate: Offer Your Services]",
  "buttons.start_interactive_tour": "[Translate: Start Interactive Tour]",
  "buttons.try_again": "[Translate: Try again]",
  "buttons.watch_demo": "[Translate: Watch Demo]",
  "cta.explore_features": "[Translate: Explore Bookiji features]",
  "cta.see_it_action": "[Translate: See it in ACTION!]",
  "demo.experience_body": "[Translate: Watch how easy it is to book services with our AI-powered platform. From finding providers to completing payments in seconds.]",
  "demo.experience_title": "[Translate: Experience Bookiji in Action]",
  "demo.platform_title": "[Translate: Bookiji Platform Demo]",
  "demo.step1.body": "[Translate: Use our AI chat or search to find exactly what you need]",
  "demo.step1.title": "[Translate: Step 1: Find Your Service]",
  "demo.step2.body": "[Translate: Our smart radius system finds nearby providers while protecting privacy]",
  "demo.step2.title": "[Translate: Step 2: Choose Location]",
  "demo.step3.body": "[Translate: Pay just $1 to confirm your booking - no hidden fees]",
  "demo.step3.title": "[Translate: Step 3: $1 Commitment]",
  "demo.step4.body": "[Translate: Get immediate confirmation and provider details]",
  "demo.step4.title": "[Translate: Step 4: Instant Confirmation]",
  "density.dense": "[Translate: dense]",
  "density.medium": "[Translate: medium]",
  "density.sparse": "[Translate: sparse]",
  "feature.map_protection.desc": "[Translate: Protecting vendor privacy with intelligent radius scaling]",
  "feature.map_protection.title": "[Translate: AI-Powered Map Protection]",
  "label.provider_density": "[Translate: Provider Density]",
  "label.service": "[Translate: Service]",
  "locale.select_language_region": "[Translate: Select Language & Region]",
  "privacy.active": "[Translate: Privacy Protection Active]",
  "privacy.explainer": "[Translate: Vendors are shown as availability zones, not exact locations. This protects their privacy while helping you find nearby services.]",
  "radius.analyzing": "[Translate: Analyzing optimal search radius...]",
  "radius.recommended": "[Translate: Recommended Radius]",
  "radius.refresh": "[Translate: Refresh Radius Analysis]"
}
```

## Workflow Recommendations

### Quick Start (Recommended)
1. ✅ **English fallback** - Already done, app works now
2. **Priority locales** - Translate most-used locales first (check analytics)
3. **Bulk translate** - Use API for remaining locales
4. **Review & refine** - Native speakers review API translations

### Quality Assurance
1. **Review translations** - Especially for:
   - Brand names (keep "Bookiji" as-is)
   - Technical terms (may need localization)
   - Cultural context (adapt for local market)

2. **Test in UI** - Verify translations display correctly:
   - RTL languages (Arabic)
   - Long text (may need UI adjustments)
   - Special characters

3. **Update as needed** - Translations may need updates when:
   - New features added
   - UI changes
   - User feedback received

## Tools Available

- `scripts/fill-missing-translations.mjs` - Analysis and English fallback
- `scripts/translate-missing-keys.mjs` - API translation automation
- `scripts/generate-i18n-report.mjs` - Completeness reporting
- `scripts/check-i18n.mjs` - Validation script

## Next Steps

1. **Immediate**: App works with English fallback ✅
2. **Short-term**: Translate priority locales (top 5-10 by usage)
3. **Long-term**: Complete all 15 remaining locales
4. **Ongoing**: Maintain translations as app evolves

## Notes

- **Brand consistency**: Keep "Bookiji" untranslated
- **Currency**: $1 commitment fee - may need localization
- **Technical terms**: "AI", "radius", "privacy" - consider localization
- **RTL support**: Arabic needs RTL UI support (already implemented)


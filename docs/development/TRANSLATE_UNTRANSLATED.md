# Translating Untranslated Keys

Even though the app works with English fallbacks, you can still translate the untranslated keys to improve the user experience.

## Quick Start

### Option 1: Translate All (Missing + Untranslated)

```bash
# Dry run first to see what will be translated
npm run i18n:translate:all -- --dry-run

# Actually translate (requires API key)
TRANSLATION_SERVICE=deepl TRANSLATION_API_KEY=your_key npm run i18n:translate:all
```

### Option 2: Translate Only Untranslated Keys

```bash
# Dry run
npm run i18n:translate -- --untranslated --dry-run

# Translate
TRANSLATION_SERVICE=deepl TRANSLATION_API_KEY=your_key npm run i18n:translate -- --untranslated
```

### Option 3: Translate Specific Locale

```bash
# Translate all keys for a specific locale
npm run i18n:translate -- --locale=ru-RU --all --dry-run

# Then translate
TRANSLATION_SERVICE=deepl TRANSLATION_API_KEY=your_key npm run i18n:translate -- --locale=ru-RU --all
```

## Translation Services

### DeepL (Recommended - Best Quality)

```bash
export TRANSLATION_SERVICE=deepl
export TRANSLATION_API_KEY=your_deepl_api_key
npm run i18n:translate:all
```

**Get API Key**: https://www.deepl.com/pro-api

### Google Translate

```bash
export TRANSLATION_SERVICE=google
export TRANSLATION_API_KEY=your_google_api_key
npm run i18n:translate:all
```

**Get API Key**: https://cloud.google.com/translate/docs/setup

### LibreTranslate (Free, Open Source)

```bash
export TRANSLATION_SERVICE=libre
export TRANSLATION_API_KEY=optional_api_key
export LIBRETRANSLATE_URL=https://libretranslate.com/translate
npm run i18n:translate:all
```

**Note**: LibreTranslate has rate limits on the public instance.

## What Gets Translated?

- **Missing keys**: Keys that don't exist in the locale file
- **Untranslated keys**: Keys that exist but have the same value as English

## Examples

### Check What Needs Translation

```bash
# See all missing and untranslated keys
npm run i18n:translate:all -- --dry-run
```

### Translate One Locale

```bash
# Russian
TRANSLATION_SERVICE=deepl TRANSLATION_API_KEY=xxx npm run i18n:translate -- --locale=ru-RU --all

# Arabic
TRANSLATION_SERVICE=deepl TRANSLATION_API_KEY=xxx npm run i18n:translate -- --locale=ar-SA --all
```

### Translate All Locales

```bash
TRANSLATION_SERVICE=deepl TRANSLATION_API_KEY=xxx npm run i18n:translate:all
```

## Rate Limiting

The script includes automatic rate limiting (100ms delay between requests) to avoid hitting API limits. For large translations:

- **DeepL Free**: 500,000 characters/month
- **Google Translate**: Pay-as-you-go
- **LibreTranslate**: Varies by instance

## After Translation

1. **Review translations**: Check the generated locale files
2. **Test the app**: Switch languages and verify translations look good
3. **Native speaker review**: Have native speakers review for quality
4. **Commit changes**: Commit the updated locale files

## Verification

After translating, verify completeness:

```bash
npm run i18n:check
```

You should see improved completeness percentages for all locales.

## Notes

- Translations are saved automatically
- Keys are sorted to match the master locale (en-US.json)
- On API errors, keys keep English fallback values
- The script is idempotent - safe to run multiple times













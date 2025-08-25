# Internationalization Guide

Bookiji supports multiple locales. Translation files live in the `locales/` folder. Each file is named after the locale code (`en-US.json`, `fr-FR.json`, etc.).

## Adding a New Locale

1. Copy `locales/en-US.json` as a template.
2. Translate each value and save the file with the appropriate locale code.
3. Ensure the locale exists in `src/lib/i18n/config.ts` under `SUPPORTED_LOCALES`.
4. No additional code changes are required; translations are loaded dynamically when the locale is selected.

## Updating Translations

Edit the JSON file for the desired locale. Changes will be picked up automatically on the next build or when the application reloads.

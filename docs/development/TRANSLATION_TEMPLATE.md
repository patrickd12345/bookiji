# Translation Template - Manual Translation Guide

This template provides the English source text for all 32 missing keys across 15 incomplete locales.

## How to Use

1. Copy the template for your target locale
2. Replace `[Translate: ...]` with proper translation
3. Keep brand names like "Bookiji" as-is
4. Maintain placeholders like `{{amount}}`, `{{count}}`, `{{fee}}`
5. Save to `src/locales/[locale-code].json`

---

## Translation Template

### Buttons (6 keys)

```json
{
  "buttons.book_appointment": "[Translate: Book an Appointment]",
  "buttons.close": "[Translate: Close]",
  "buttons.offer_services": "[Translate: Offer Your Services]",
  "buttons.start_interactive_tour": "[Translate: Start Interactive Tour]",
  "buttons.try_again": "[Translate: Try again]",
  "buttons.watch_demo": "[Translate: Watch Demo]"
}
```

**Context**: UI button labels. Keep concise and action-oriented.

---

### Call-to-Action (2 keys)

```json
{
  "cta.explore_features": "[Translate: Explore Bookiji features]",
  "cta.see_it_action": "[Translate: See it in ACTION!]"
}
```

**Context**: Marketing CTAs. "ACTION!" can be emphasized or adapted for local style.

---

### Demo Section (11 keys)

```json
{
  "demo.platform_title": "[Translate: Bookiji Platform Demo]",
  "demo.experience_title": "[Translate: Experience Bookiji in Action]",
  "demo.experience_body": "[Translate: Watch how easy it is to book services with our AI-powered platform. From finding providers to completing payments in seconds.]",
  "demo.step1.title": "[Translate: Step 1: Find Your Service]",
  "demo.step1.body": "[Translate: Use our AI chat or search to find exactly what you need]",
  "demo.step2.title": "[Translate: Step 2: Choose Location]",
  "demo.step2.body": "[Translate: Our smart radius system finds nearby providers while protecting privacy]",
  "demo.step3.title": "[Translate: Step 3: $1 Commitment]",
  "demo.step3.body": "[Translate: Pay just $1 to confirm your booking - no hidden fees]",
  "demo.step4.title": "[Translate: Step 4: Instant Confirmation]",
  "demo.step4.body": "[Translate: Get immediate confirmation and provider details]"
}
```

**Context**: Demo/tutorial section. Keep step numbers consistent. "$1" may need currency conversion.

---

### Density Labels (3 keys)

```json
{
  "density.dense": "[Translate: dense]",
  "density.medium": "[Translate: medium]",
  "density.sparse": "[Translate: sparse]"
}
```

**Context**: Provider density indicators on map. Can use:
- Density levels: "High", "Medium", "Low"
- Population terms: "Crowded", "Moderate", "Sparse"
- Local equivalents

---

### Feature/Map (5 keys)

```json
{
  "feature.map_protection.title": "[Translate: AI-Powered Map Protection]",
  "feature.map_protection.desc": "[Translate: Protecting vendor privacy with intelligent radius scaling]",
  "radius.analyzing": "[Translate: Analyzing optimal search radius...]",
  "radius.recommended": "[Translate: Recommended Radius]",
  "radius.refresh": "[Translate: Refresh Radius Analysis]"
}
```

**Context**: Map feature descriptions. "AI-Powered" can be localized or kept as technical term.

---

### Labels (2 keys)

```json
{
  "label.service": "[Translate: Service]",
  "label.provider_density": "[Translate: Provider Density]"
}
```

**Context**: Form/UI labels. Keep simple and clear.

---

### Locale Selector (1 key)

```json
{
  "locale.select_language_region": "[Translate: Select Language & Region]"
}
```

**Context**: Language selector label. Can be shortened to "Select Language" if space is limited.

---

### Privacy (2 keys)

```json
{
  "privacy.active": "[Translate: Privacy Protection Active]",
  "privacy.explainer": "[Translate: Vendors are shown as availability zones, not exact locations. This protects their privacy while helping you find nearby services.]"
}
```

**Context**: Privacy feature explanation. Important for user trust - be clear and accurate.

---

## Locale-Specific Notes

### Arabic (ar-SA)
- RTL text direction (already handled in UI)
- Formal vs. informal: Use formal Arabic for business context
- Numbers: May need Arabic-Indic numerals

### Slavic Languages (cs-CZ, pl-PL, ru-RU, uk-UA)
- Formal/informal: Use formal "you" for business context
- Cases: Ensure proper grammatical cases

### Nordic Languages (da-DK, fi-FI, no-NO, sv-SE)
- Generally straightforward translations
- Keep technical terms in English if commonly used

### Other Languages
- **hu-HU (Hungarian)**: Complex grammar, may need native speaker
- **tr-TR (Turkish)**: Agglutinative language, ensure proper suffixes
- **id-ID (Indonesian)**: Formal/informal distinction
- **ms-MY (Malay)**: Similar to Indonesian but with local variations

---

## Quality Checklist

- [ ] All 32 keys translated
- [ ] Brand name "Bookiji" kept as-is
- [ ] Placeholders (`{{amount}}`, `{{count}}`, `{{fee}}`) preserved
- [ ] Grammar and spelling checked
- [ ] Cultural context appropriate
- [ ] Length appropriate for UI (no overflow)
- [ ] Technical terms consistent
- [ ] Tested in actual UI

---

## Example: Russian (ru-RU)

```json
{
  "buttons.book_appointment": "Забронировать встречу",
  "buttons.close": "Закрыть",
  "buttons.offer_services": "Предложить услуги",
  "buttons.start_interactive_tour": "Начать интерактивный тур",
  "buttons.try_again": "Попробовать снова",
  "buttons.watch_demo": "Посмотреть демо",
  "cta.explore_features": "Изучить функции Bookiji",
  "cta.see_it_action": "Увидеть в действии!",
  "demo.platform_title": "Демо платформы Bookiji",
  "demo.experience_title": "Оцените Bookiji в действии",
  "demo.experience_body": "Посмотрите, как легко бронировать услуги с помощью нашей платформы на базе ИИ. От поиска поставщиков до завершения платежей за секунды.",
  "demo.step1.title": "Шаг 1: Найдите услугу",
  "demo.step1.body": "Используйте наш ИИ-чат или поиск, чтобы найти именно то, что вам нужно",
  "demo.step2.title": "Шаг 2: Выберите местоположение",
  "demo.step2.body": "Наша умная система радиуса находит ближайших поставщиков, защищая конфиденциальность",
  "demo.step3.title": "Шаг 3: Обязательство $1",
  "demo.step3.body": "Заплатите всего $1, чтобы подтвердить бронирование - без скрытых комиссий",
  "demo.step4.title": "Шаг 4: Мгновенное подтверждение",
  "demo.step4.body": "Получите немедленное подтверждение и детали поставщика",
  "density.dense": "высокая",
  "density.medium": "средняя",
  "density.sparse": "низкая",
  "feature.map_protection.desc": "Защита конфиденциальности поставщиков с помощью интеллектуального масштабирования радиуса",
  "feature.map_protection.title": "Защита карты на базе ИИ",
  "label.provider_density": "Плотность поставщиков",
  "label.service": "Услуга",
  "locale.select_language_region": "Выбрать язык и регион",
  "privacy.active": "Защита конфиденциальности активна",
  "privacy.explainer": "Поставщики отображаются как зоны доступности, а не точные местоположения. Это защищает их конфиденциальность, помогая вам находить ближайшие услуги.",
  "radius.analyzing": "Анализ оптимального радиуса поиска...",
  "radius.recommended": "Рекомендуемый радиус",
  "radius.refresh": "Обновить анализ радиуса"
}
```

---

## Submission

After completing translations:
1. Save to `src/locales/[locale-code].json`
2. Run validation: `node scripts/check-i18n.mjs`
3. Test in UI
4. Submit for review


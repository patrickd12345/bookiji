#!/usr/bin/env node
/**
 * Batch translate remaining locales with manual translations
 * This script applies translations for the remaining 10 incomplete locales
 */

import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('src/locales')

// Manual translations for each locale
const translations = {
  'cs-CZ': {
    'buttons.book_appointment': 'Rezervovat schůzku',
    'buttons.close': 'Zavřít',
    'buttons.offer_services': 'Nabídnout své služby',
    'buttons.start_interactive_tour': 'Spustit interaktivní prohlídku',
    'buttons.try_again': 'Zkusit znovu',
    'buttons.watch_demo': 'Sledovat demo',
    'cta.explore_features': 'Prozkoumat funkce Bookiji',
    'cta.see_it_action': 'Uvidět v AKCI!',
    'demo.experience_body': 'Podívejte se, jak snadné je rezervovat služby pomocí naší platformy poháněné AI. Od nalezení poskytovatelů po dokončení plateb během několika sekund.',
    'demo.experience_title': 'Zažijte Bookiji v akci',
    'demo.platform_title': 'Demo platformy Bookiji',
    'demo.step1.body': 'Použijte náš AI chat nebo vyhledávání, abyste našli přesně to, co potřebujete',
    'demo.step1.title': 'Krok 1: Najděte svou službu',
    'demo.step2.body': 'Náš chytrý systém poloměru najde blízké poskytovatele při ochraně soukromí',
    'demo.step2.title': 'Krok 2: Vyberte umístění',
    'demo.step3.body': 'Zaplaťte pouze $1 pro potvrzení rezervace - žádné skryté poplatky',
    'demo.step3.title': 'Krok 3: Závazek $1',
    'demo.step4.body': 'Získejte okamžité potvrzení a podrobnosti poskytovatele',
    'demo.step4.title': 'Krok 4: Okamžité potvrzení',
    'density.dense': 'hustá',
    'density.medium': 'střední',
    'density.sparse': 'řídká',
    'feature.map_protection.desc': 'Ochrana soukromí prodejců pomocí inteligentního škálování poloměru',
    'feature.map_protection.title': 'Ochrana mapy poháněná AI',
    'label.provider_density': 'Hustota poskytovatelů',
    'label.service': 'Služba',
    'locale.select_language_region': 'Vybrat jazyk a region',
    'privacy.active': 'Ochrana soukromí aktivní',
    'privacy.explainer': 'Prodejci jsou zobrazeni jako zóny dostupnosti, nikoli přesné polohy. To chrání jejich soukromí a zároveň vám pomáhá najít blízké služby.',
    'radius.analyzing': 'Analyzování optimálního vyhledávacího poloměru...',
    'radius.recommended': 'Doporučený poloměr',
    'radius.refresh': 'Obnovit analýzu poloměru'
  },
  'uk-UA': {
    'buttons.book_appointment': 'Забронювати зустріч',
    'buttons.close': 'Закрити',
    'buttons.offer_services': 'Запропонувати послуги',
    'buttons.start_interactive_tour': 'Почати інтерактивну екскурсію',
    'buttons.try_again': 'Спробувати знову',
    'buttons.watch_demo': 'Переглянути демо',
    'cta.explore_features': 'Дослідити функції Bookiji',
    'cta.see_it_action': 'Побачити в ДІЇ!',
    'demo.experience_body': 'Подивіться, наскільки легко бронювати послуги за допомогою нашої платформи на базі ШІ. Від пошуку постачальників до завершення платежів за секунди.',
    'demo.experience_title': 'Відчуйте Bookiji в дії',
    'demo.platform_title': 'Демо платформи Bookiji',
    'demo.step1.body': 'Використовуйте наш ШІ-чат або пошук, щоб знайти саме те, що вам потрібно',
    'demo.step1.title': 'Крок 1: Знайдіть свою послугу',
    'demo.step2.body': 'Наша розумна система радіуса знаходить близьких постачальників, захищаючи конфіденційність',
    'demo.step2.title': 'Крок 2: Виберіть місцезнаходження',
    'demo.step3.body': 'Сплатіть лише $1, щоб підтвердити бронювання - без прихованих комісій',
    'demo.step3.title': 'Крок 3: Зобов\'язання $1',
    'demo.step4.body': 'Отримайте миттєве підтвердження та деталі постачальника',
    'demo.step4.title': 'Крок 4: Миттєве підтвердження',
    'density.dense': 'висока',
    'density.medium': 'середня',
    'density.sparse': 'низька',
    'feature.map_protection.desc': 'Захист конфіденційності продавців за допомогою інтелектуального масштабування радіуса',
    'feature.map_protection.title': 'Захист карти на базі ШІ',
    'label.provider_density': 'Щільність постачальників',
    'label.service': 'Послуга',
    'locale.select_language_region': 'Вибрати мову та регіон',
    'privacy.active': 'Захист конфіденційності активний',
    'privacy.explainer': 'Продавці відображаються як зони доступності, а не точні місцезнаходження. Це захищає їхню конфіденційність, допомагаючи вам знаходити близькі послуги.',
    'radius.analyzing': 'Аналіз оптимального радіуса пошуку...',
    'radius.recommended': 'Рекомендований радіус',
    'radius.refresh': 'Оновити аналіз радіуса'
  },
  'fi-FI': {
    'buttons.book_appointment': 'Varaa aika',
    'buttons.close': 'Sulje',
    'buttons.offer_services': 'Tarjoa palveluitasi',
    'buttons.start_interactive_tour': 'Aloita interaktiivinen kierros',
    'buttons.try_again': 'Yritä uudelleen',
    'buttons.watch_demo': 'Katso demo',
    'cta.explore_features': 'Tutustu Bookiji-ominaisuuksiin',
    'cta.see_it_action': 'Näe se TOIMINNASSA!',
    'demo.experience_body': 'Katso, kuinka helppoa on varata palveluja AI-pohjaisella alustallamme. Palveluntarjoajien löytämisestä maksujen suorittamiseen sekunneissa.',
    'demo.experience_title': 'Koe Bookiji toiminnassa',
    'demo.platform_title': 'Bookiji-alustan demo',
    'demo.step1.body': 'Käytä AI-chattia tai hakua löytääksesi tarkalleen mitä tarvitset',
    'demo.step1.title': 'Vaihe 1: Löydä palvelusi',
    'demo.step2.body': 'Älykäs säteemme löytää lähellä olevat palveluntarjoajat suojaen yksityisyyttä',
    'demo.step2.title': 'Vaihe 2: Valitse sijainti',
    'demo.step3.body': 'Maksa vain $1 vahvistaaksesi varauksesi - ei piilotettuja maksuja',
    'demo.step3.title': 'Vaihe 3: $1 Sitoumus',
    'demo.step4.body': 'Saa välitön vahvistus ja palveluntarjoajan tiedot',
    'demo.step4.title': 'Vaihe 4: Välitön vahvistus',
    'density.dense': 'tiheä',
    'density.medium': 'keskiverto',
    'density.sparse': 'harva',
    'feature.map_protection.desc': 'Myyjien yksityisyyden suojaaminen älykkäällä säteen skaalauksella',
    'feature.map_protection.title': 'AI-pohjainen karttasuojaus',
    'label.provider_density': 'Palveluntarjoajien tiheys',
    'label.service': 'Palvelu',
    'locale.select_language_region': 'Valitse kieli ja alue',
    'privacy.active': 'Yksityisyydensuoja aktiivinen',
    'privacy.explainer': 'Myyjät näytetään saatavuusvyöhykkeinä, ei tarkkoina sijainteina. Tämä suojaa heidän yksityisyyttään auttaen sinua löytämään lähellä olevia palveluja.',
    'radius.analyzing': 'Analysoidaan optimaalista hakusädettä...',
    'radius.recommended': 'Suositeltu säde',
    'radius.refresh': 'Päivitä säteen analyysi'
  },
  'sv-SE': {
    'buttons.book_appointment': 'Boka en tid',
    'buttons.close': 'Stäng',
    'buttons.offer_services': 'Erbjud dina tjänster',
    'buttons.start_interactive_tour': 'Starta interaktiv rundtur',
    'buttons.try_again': 'Försök igen',
    'buttons.watch_demo': 'Titta på demo',
    'cta.explore_features': 'Utforska Bookiji-funktioner',
    'cta.see_it_action': 'Se det i AKTION!',
    'demo.experience_body': 'Se hur enkelt det är att boka tjänster med vår AI-drivna plattform. Från att hitta leverantörer till att slutföra betalningar på sekunder.',
    'demo.experience_title': 'Upplev Bookiji i aktion',
    'demo.platform_title': 'Bookiji-plattformsdemo',
    'demo.step1.body': 'Använd vår AI-chatt eller sök för att hitta precis vad du behöver',
    'demo.step1.title': 'Steg 1: Hitta din tjänst',
    'demo.step2.body': 'Vårt smarta radiussystem hittar närliggande leverantörer samtidigt som integriteten skyddas',
    'demo.step2.title': 'Steg 2: Välj plats',
    'demo.step3.body': 'Betala bara $1 för att bekräfta din bokning - inga dolda avgifter',
    'demo.step3.title': 'Steg 3: $1 Åtagande',
    'demo.step4.body': 'Få omedelbar bekräftelse och leverantörsdetaljer',
    'demo.step4.title': 'Steg 4: Omedelbar bekräftelse',
    'density.dense': 'tät',
    'density.medium': 'medel',
    'density.sparse': 'gles',
    'feature.map_protection.desc': 'Skydda leverantörernas integritet med intelligent radiusskalning',
    'feature.map_protection.title': 'AI-driven kartskydd',
    'label.provider_density': 'Leverantörstäthet',
    'label.service': 'Tjänst',
    'locale.select_language_region': 'Välj språk och region',
    'privacy.active': 'Integritetsskydd aktivt',
    'privacy.explainer': 'Leverantörer visas som tillgänglighetszoner, inte exakta platser. Detta skyddar deras integritet samtidigt som det hjälper dig hitta närliggande tjänster.',
    'radius.analyzing': 'Analyserar optimal sökradie...',
    'radius.recommended': 'Rekommenderad radie',
    'radius.refresh': 'Uppdatera radieanalys'
  },
  'da-DK': {
    'buttons.book_appointment': 'Book en aftale',
    'buttons.close': 'Luk',
    'buttons.offer_services': 'Tilbud dine tjenester',
    'buttons.start_interactive_tour': 'Start interaktiv rundvisning',
    'buttons.try_again': 'Prøv igen',
    'buttons.watch_demo': 'Se demo',
    'cta.explore_features': 'Udforsk Bookiji-funktioner',
    'cta.see_it_action': 'Se det i AKTION!',
    'demo.experience_body': 'Se hvor nemt det er at booke tjenester med vores AI-drevne platform. Fra at finde udbydere til at fuldføre betalinger på sekunder.',
    'demo.experience_title': 'Oplev Bookiji i aktion',
    'demo.platform_title': 'Bookiji-platformdemo',
    'demo.step1.body': 'Brug vores AI-chat eller søg for at finde præcis det, du har brug for',
    'demo.step1.title': 'Trin 1: Find din tjeneste',
    'demo.step2.body': 'Vores smarte radius-system finder nærliggende udbydere, mens privatlivet beskyttes',
    'demo.step2.title': 'Trin 2: Vælg placering',
    'demo.step3.body': 'Betal kun $1 for at bekræfte din booking - ingen skjulte gebyrer',
    'demo.step3.title': 'Trin 3: $1 Forpligtelse',
    'demo.step4.body': 'Få øjeblikkelig bekræftelse og udbyderdetaljer',
    'demo.step4.title': 'Trin 4: Øjeblikkelig bekræftelse',
    'density.dense': 'tæt',
    'density.medium': 'medium',
    'density.sparse': 'sparsom',
    'feature.map_protection.desc': 'Beskytter leverandørernes privatliv med intelligent radius-skalering',
    'feature.map_protection.title': 'AI-drevet kortbeskyttelse',
    'label.provider_density': 'Udbydertæthed',
    'label.service': 'Tjeneste',
    'locale.select_language_region': 'Vælg sprog og region',
    'privacy.active': 'Privatlivsbeskyttelse aktiv',
    'privacy.explainer': 'Leverandører vises som tilgængelighedszoner, ikke nøjagtige placeringer. Dette beskytter deres privatliv, mens det hjælper dig med at finde nærliggende tjenester.',
    'radius.analyzing': 'Analyserer optimal søgeradius...',
    'radius.recommended': 'Anbefalet radius',
    'radius.refresh': 'Opdater radiusanalyse'
  }
}

// Remaining locales with English fallback (will keep English for now)
const remainingLocales = ['no-NO', 'hu-HU', 'id-ID', 'ms-MY', 'en-IN']

function applyTranslations() {
  for (const [locale, trans] of Object.entries(translations)) {
    const filePath = path.join(localesDir, `${locale}.json`)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    let updated = false
    for (const [key, value] of Object.entries(trans)) {
      if (data[key] !== value) {
        data[key] = value
        updated = true
      }
    }
    
    if (updated) {
      // Sort keys to match base
      const base = JSON.parse(fs.readFileSync(path.join(localesDir, 'en-US.json'), 'utf8'))
      const sorted = {}
      Object.keys(base).forEach(k => {
        if (k in data) {
          sorted[k] = data[k]
        }
      })
      
      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n')
      console.log(`✅ Updated ${locale}`)
    }
  }
  
  console.log(`\n📊 Remaining locales with English fallback: ${remainingLocales.join(', ')}`)
  console.log(`💡 These can be translated later using API or manual translation`)
}

applyTranslations()


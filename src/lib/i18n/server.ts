import baseTranslations from '../../locales/en-US.json'
import frFR from '../../locales/fr-FR.json'
import deDE from '../../locales/de-DE.json'
import esES from '../../locales/es-ES.json'
import itIT from '../../locales/it-IT.json'
import jaJP from '../../locales/ja-JP.json'
import koKR from '../../locales/ko-KR.json'
import zhCN from '../../locales/zh-CN.json'
import ptBR from '../../locales/pt-BR.json'
import hiIN from '../../locales/hi-IN.json'
import thTH from '../../locales/th-TH.json'
import viVN from '../../locales/vi-VN.json'
import frCA from '../../locales/fr-CA.json'
import esMX from '../../locales/es-MX.json'
import enCA from '../../locales/en-CA.json'
import enGB from '../../locales/en-GB.json'
import enAU from '../../locales/en-AU.json'
import deCH from '../../locales/de-CH.json'
import ruRU from '../../locales/ru-RU.json'
import ukUA from '../../locales/uk-UA.json'
import arSA from '../../locales/ar-SA.json'
import nlNL from '../../locales/nl-NL.json'
import svSE from '../../locales/sv-SE.json'
import daDK from '../../locales/da-DK.json'
import noNO from '../../locales/no-NO.json'
import fiFI from '../../locales/fi-FI.json'
import plPL from '../../locales/pl-PL.json'
import trTR from '../../locales/tr-TR.json'
import idID from '../../locales/id-ID.json'
import msMY from '../../locales/ms-MY.json'
import enIN from '../../locales/en-IN.json'
import csCZ from '../../locales/cs-CZ.json'
import huHU from '../../locales/hu-HU.json'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './config'

const STATIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en-US': baseTranslations,
  'fr-FR': frFR,
  'de-DE': deDE,
  'es-ES': esES,
  'it-IT': itIT,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'zh-CN': zhCN,
  'pt-BR': ptBR,
  'hi-IN': hiIN,
  'th-TH': thTH,
  'vi-VN': viVN,
  'fr-CA': frCA,
  'es-MX': esMX,
  'en-CA': enCA,
  'en-GB': enGB,
  'en-AU': enAU,
  'de-CH': deCH,
  'ru-RU': ruRU,
  'uk-UA': ukUA,
  'ar-SA': arSA,
  'nl-NL': nlNL,
  'sv-SE': svSE,
  'da-DK': daDK,
  'no-NO': noNO,
  'fi-FI': fiFI,
  'pl-PL': plPL,
  'tr-TR': trTR,
  'id-ID': idID,
  'ms-MY': msMY,
  'en-IN': enIN,
  'cs-CZ': csCZ,
  'hu-HU': huHU
}

export function resolveLocale(locale?: string): string {
  if (locale && SUPPORTED_LOCALES[locale]) return locale
  return DEFAULT_LOCALE
}

export function t(
  locale: string | undefined,
  key: string,
  variables?: Record<string, string>
): string {
  const resolved = resolveLocale(locale)
  const messages = STATIC_TRANSLATIONS[resolved] || baseTranslations
  let text = (messages as Record<string, string>)[key]

  if (text === undefined) {
    const langPrefix = resolved.split('-')[0]
    const fallbackLocale = Object.keys(STATIC_TRANSLATIONS).find(
      (code) => code !== resolved && code.startsWith(langPrefix + '-')
    )
    if (fallbackLocale) {
      const fallbackMessages = STATIC_TRANSLATIONS[fallbackLocale]
      text = (fallbackMessages as Record<string, string>)[key]
    }
  }

  if (text === undefined) {
    text = (baseTranslations as Record<string, string>)[key] || key
  }

  if (variables) {
    Object.entries(variables).forEach(([vKey, value]) => {
      text = text.replace(new RegExp(`{{${vKey}}}`, 'g'), value)
    })
  }

  return text
}


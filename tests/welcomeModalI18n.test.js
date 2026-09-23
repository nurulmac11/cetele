import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SUPPORTED_LANGUAGES,
  WELCOME_TRANSLATIONS,
  detectBrowserLanguage,
  getWelcomeTranslation
} from '../src/i18n/welcomeTranslations.js'

describe('WelcomeModal i18n', () => {
  let mockStorage = {}

  beforeEach(() => {
    mockStorage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => {
        mockStorage[key] = String(val)
      },
      removeItem: (key) => {
        delete mockStorage[key]
      },
      clear: () => {
        mockStorage = {}
      }
    })
  })

  it('supports 8 popular languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(8)
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(codes).toEqual(['en', 'es', 'tr', 'de', 'fr', 'pt', 'it', 'ja'])
  })

  it('has complete translation keys for every supported language', () => {
    const requiredKeys = ['headlineFragments', 'subheadline', 'steps', 'codeExample', 'results', 'features', 'actions']

    SUPPORTED_LANGUAGES.forEach(({ code }) => {
      const translation = WELCOME_TRANSLATIONS[code]
      expect(translation).toBeDefined()
      requiredKeys.forEach((key) => {
        expect(translation[key]).toBeDefined()
      })
      expect(translation.headlineFragments.length).toBeGreaterThan(0)
    })
  })

  it('detects language from navigator.languages or navigator.language', () => {
    // Mock Turkish browser language
    vi.stubGlobal('navigator', { languages: ['tr-TR', 'tr', 'en-US'] })
    expect(detectBrowserLanguage()).toBe('tr')

    // Mock German browser language
    vi.stubGlobal('navigator', { languages: ['de-DE', 'de', 'en'] })
    expect(detectBrowserLanguage()).toBe('de')

    // Mock Japanese browser language
    vi.stubGlobal('navigator', { languages: ['ja-JP'] })
    expect(detectBrowserLanguage()).toBe('ja')

    // Fallback to English for unknown language
    vi.stubGlobal('navigator', { languages: ['xy-ZZ'] })
    expect(detectBrowserLanguage()).toBe('en')
  })

  it('respects stored user preference in localStorage over browser language', () => {
    localStorage.setItem('cetele_welcome_lang', 'es')
    vi.stubGlobal('navigator', { languages: ['de-DE'] })

    expect(detectBrowserLanguage()).toBe('es')
  })

  it('returns fallback translation if invalid language code is passed to getWelcomeTranslation', () => {
    const fallback = getWelcomeTranslation('invalid-code')
    expect(fallback).toEqual(WELCOME_TRANSLATIONS.en)
  })
})

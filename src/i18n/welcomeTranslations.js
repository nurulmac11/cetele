export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' }
]

export const WELCOME_TRANSLATIONS = {
  en: {
    headlineFragments: [
      { type: 'text', value: 'A ' },
      { type: 'teal', value: 'calculator' },
      { type: 'text', value: ' that works like a ' },
      { type: 'purple', value: 'notepad.' }
    ],
    subheadline: 'Write your calculations naturally, keep your numbers organized, and see every result instantly.',
    steps: {
      step1Title: 'Write',
      step1Desc: 'Write your numbers and name them.',
      step2Title: 'Calculate',
      step2Desc: 'Use them in calculations.',
      step3Title: 'See Results Instantly',
      step3Desc: 'Results update automatically.'
    },
    codeExample: {
      comment: '---- Weekend trip ----',
      hotelVar: 'hotel',
      foodVar: 'food',
      fuelVar: 'fuel',
      activitiesVar: 'activities',
      totalVar: 'total'
    },
    results: {
      title: 'Results',
      live: 'Live'
    },
    features: {
      sectionsTitle: 'Organize with Sections',
      sectionsDesc: 'Group related calculations.',
      tabsTitle: 'Save as Tabs',
      tabsDesc: 'Keep everything for later.',
      changeTitle: 'Change Anything',
      changeDesc: 'Everything updates instantly.'
    },
    actions: {
      tryYourself: 'Try it yourself',
      skipTour: 'Skip tour',
      closeTooltip: 'Close tour (Esc)',
      closeAria: 'Close modal'
    }
  },
  es: {
    headlineFragments: [
      { type: 'text', value: 'Una ' },
      { type: 'teal', value: 'calculadora' },
      { type: 'text', value: ' que funciona como un ' },
      { type: 'purple', value: 'bloc de notas.' }
    ],
    subheadline:
      'Escribe tus cálculos de forma natural, mantén tus números organizados y ve cada resultado al instante.',
    steps: {
      step1Title: 'Escribe',
      step1Desc: 'Escribe tus números y ponles nombre.',
      step2Title: 'Calcula',
      step2Desc: 'Úsalos en tus cálculos.',
      step3Title: 'Resultados al Instante',
      step3Desc: 'Los resultados se actualizan automáticamente.'
    },
    codeExample: {
      comment: '---- Viaje de fin de semana ----',
      hotelVar: 'hotel',
      foodVar: 'comida',
      fuelVar: 'gasolina',
      activitiesVar: 'actividades',
      totalVar: 'total'
    },
    results: {
      title: 'Resultados',
      live: 'En vivo'
    },
    features: {
      sectionsTitle: 'Organiza con Secciones',
      sectionsDesc: 'Agrupa cálculos relacionados.',
      tabsTitle: 'Guarda en Pestañas',
      tabsDesc: 'Guarda todo para más adelante.',
      changeTitle: 'Cambia Cualquier Dato',
      changeDesc: 'Todo se actualiza al instante.'
    },
    actions: {
      tryYourself: 'Pruébalo tú mismo',
      skipTour: 'Omitir recorrido',
      closeTooltip: 'Cerrar recorrido (Esc)',
      closeAria: 'Cerrar ventana'
    }
  },
  tr: {
    headlineFragments: [
      { type: 'text', value: 'Bir ' },
      { type: 'purple', value: 'not defteri' },
      { type: 'text', value: ' gibi çalışan bir ' },
      { type: 'teal', value: 'hesap makinesi.' }
    ],
    subheadline: 'Hesaplarınızı doğal bir şekilde yazın, sayılarınızı düzenli tutun ve her sonucu anında görün.',
    steps: {
      step1Title: 'Yazın',
      step1Desc: 'Sayılarınızı yazın ve isimlendirin.',
      step2Title: 'Hesaplayın',
      step2Desc: 'Bunları hesaplamalarda kullanın.',
      step3Title: 'Sonuçları Anında Görün',
      step3Desc: 'Sonuçlar otomatik olarak güncellenir.'
    },
    codeExample: {
      comment: '---- Hafta sonu gezisi ----',
      hotelVar: 'otel',
      foodVar: 'yemek',
      fuelVar: 'yakit',
      activitiesVar: 'aktiviteler',
      totalVar: 'toplam'
    },
    results: {
      title: 'Sonuçlar',
      live: 'Canlı'
    },
    features: {
      sectionsTitle: 'Bölümlerle Düzenleyin',
      sectionsDesc: 'İlişkili hesapları gruplayın.',
      tabsTitle: 'Sekme Olarak Kaydedin',
      tabsDesc: 'Her şeyi sonrası için saklayın.',
      changeTitle: 'İstediğinizi Değiştirin',
      changeDesc: 'Her şey anında güncellenir.'
    },
    actions: {
      tryYourself: 'Kendiniz deneyin',
      skipTour: 'Turu geç',
      closeTooltip: 'Turu kapat (Esc)',
      closeAria: 'Pencereyi kapat'
    }
  },
  de: {
    headlineFragments: [
      { type: 'text', value: 'Ein ' },
      { type: 'teal', value: 'Taschenrechner' },
      { type: 'text', value: ', der wie ein ' },
      { type: 'purple', value: 'Notizblock' },
      { type: 'text', value: ' funktioniert.' }
    ],
    subheadline:
      'Schreiben Sie Ihre Berechnungen ganz natürlich, halten Sie Ihre Zahlen übersichtlich und sehen Sie jedes Ergebnis sofort.',
    steps: {
      step1Title: 'Schreiben',
      step1Desc: 'Schreiben Sie Ihre Zahlen und benennen Sie sie.',
      step2Title: 'Berechnen',
      step2Desc: 'Verwenden Sie sie in Berechnungen.',
      step3Title: 'Ergebnisse Sofort Sehen',
      step3Desc: 'Ergebnisse werden automatisch aktualisiert.'
    },
    codeExample: {
      comment: '---- Wochenendausflug ----',
      hotelVar: 'hotel',
      foodVar: 'essen',
      fuelVar: 'benzin',
      activitiesVar: 'aktivitaeten',
      totalVar: 'gesamt'
    },
    results: {
      title: 'Ergebnisse',
      live: 'Live'
    },
    features: {
      sectionsTitle: 'Mit Abschnitten Strukturieren',
      sectionsDesc: 'Gruppieren Sie zugehörige Berechnungen.',
      tabsTitle: 'Als Tabs Speichern',
      tabsDesc: 'Behalten Sie alles für später.',
      changeTitle: 'Alles Anpassbar',
      changeDesc: 'Alles wird sofort aktualisiert.'
    },
    actions: {
      tryYourself: 'Jetzt ausprobieren',
      skipTour: 'Tour überspringen',
      closeTooltip: 'Tour schließen (Esc)',
      closeAria: 'Dialog schließen'
    }
  },
  fr: {
    headlineFragments: [
      { type: 'text', value: 'Une ' },
      { type: 'teal', value: 'calculatrice' },
      { type: 'text', value: ' qui fonctionne comme un ' },
      { type: 'purple', value: 'bloc-notes.' }
    ],
    subheadline:
      'Écrivez vos calculs naturellement, gardez vos chiffres organisés et voyez chaque résultat instantanément.',
    steps: {
      step1Title: 'Écrivez',
      step1Desc: 'Saisissez vos chiffres et nommez-les.',
      step2Title: 'Calculez',
      step2Desc: 'Utilisez-les dans vos calculs.',
      step3Title: 'Résultats Instantanés',
      step3Desc: 'Les résultats se mettent à jour automatiquement.'
    },
    codeExample: {
      comment: '---- Week-end ----',
      hotelVar: 'hotel',
      foodVar: 'repas',
      fuelVar: 'carburant',
      activitiesVar: 'activites',
      totalVar: 'total'
    },
    results: {
      title: 'Résultats',
      live: 'En direct'
    },
    features: {
      sectionsTitle: 'Organiser par Sections',
      sectionsDesc: 'Regroupez les calculs associés.',
      tabsTitle: 'Enregistrer en Onglets',
      tabsDesc: 'Conservez tout pour plus tard.',
      changeTitle: 'Modifiez Tout Facilement',
      changeDesc: 'Tout se met à jour instantanément.'
    },
    actions: {
      tryYourself: 'Essayez par vous-même',
      skipTour: 'Passer la visite',
      closeTooltip: 'Fermer la visite (Esc)',
      closeAria: 'Fermer la fenêtre'
    }
  },
  pt: {
    headlineFragments: [
      { type: 'text', value: 'Uma ' },
      { type: 'teal', value: 'calculadora' },
      { type: 'text', value: ' que funciona como um ' },
      { type: 'purple', value: 'bloco de notas.' }
    ],
    subheadline:
      'Escreva seus cálculos naturalmente, mantenha seus números organizados e veja cada resultado instantaneamente.',
    steps: {
      step1Title: 'Escreva',
      step1Desc: 'Escreva seus números e dê nomes a eles.',
      step2Title: 'Calcule',
      step2Desc: 'Use-os em seus cálculos.',
      step3Title: 'Resultados ao Instante',
      step3Desc: 'Os resultados são atualizados automaticamente.'
    },
    codeExample: {
      comment: '---- Viagem de fim de semana ----',
      hotelVar: 'hotel',
      foodVar: 'comida',
      fuelVar: 'combustivel',
      activitiesVar: 'atividades',
      totalVar: 'total'
    },
    results: {
      title: 'Resultados',
      live: 'Ao vivo'
    },
    features: {
      sectionsTitle: 'Organize com Seções',
      sectionsDesc: 'Agrupe cálculos relacionados.',
      tabsTitle: 'Salve em Abas',
      tabsDesc: 'Guarde tudo para mais tarde.',
      changeTitle: 'Altere Qualquer Coisa',
      changeDesc: 'Tudo é atualizado instantaneamente.'
    },
    actions: {
      tryYourself: 'Experimente você mesmo',
      skipTour: 'Pular tour',
      closeTooltip: 'Fechar tour (Esc)',
      closeAria: 'Fechar janela'
    }
  },
  it: {
    headlineFragments: [
      { type: 'text', value: 'Una ' },
      { type: 'teal', value: 'calcolatrice' },
      { type: 'text', value: ' che funziona come un ' },
      { type: 'purple', value: 'blocco note.' }
    ],
    subheadline:
      "Scrivi i tuoi calcoli in modo naturale, mantieni i numeri organizzati e vedi ogni risultato all'istante.",
    steps: {
      step1Title: 'Scrivi',
      step1Desc: 'Scrivi i tuoi numeri e dai loro un nome.',
      step2Title: 'Calcola',
      step2Desc: 'Usali nei tuoi calcoli.',
      step3Title: "Risultati all'Instante",
      step3Desc: 'I risultati si aggiornano automaticamente.'
    },
    codeExample: {
      comment: '---- Viaggio nel fine settimana ----',
      hotelVar: 'hotel',
      foodVar: 'cibo',
      fuelVar: 'carburante',
      activitiesVar: 'attivita',
      totalVar: 'totale'
    },
    results: {
      title: 'Risultati',
      live: 'Dal vivo'
    },
    features: {
      sectionsTitle: 'Organizza con le Sezioni',
      sectionsDesc: 'Raggruppa i calcoli correlati.',
      tabsTitle: 'Salva come Schede',
      tabsDesc: 'Conserva tutto per dopo.',
      changeTitle: 'Modifica Qualsiasi Dato',
      changeDesc: "Tutto si aggiorna all'istante."
    },
    actions: {
      tryYourself: 'Provalo tu stesso',
      skipTour: 'Salta il tour',
      closeTooltip: 'Chiudi tour (Esc)',
      closeAria: 'Chiudi finestra'
    }
  },
  ja: {
    headlineFragments: [
      { type: 'purple', value: 'メモ帳' },
      { type: 'text', value: 'のように使える' },
      { type: 'teal', value: '電卓' },
      { type: 'text', value: '。' }
    ],
    subheadline: '計算式を自然に入力し、数値を整理して、すべての結果を即座に確認できます。',
    steps: {
      step1Title: '入力',
      step1Desc: '数値と変数名を入力します。',
      step2Title: '計算',
      step2Desc: 'それらを使って計算式を書きます。',
      step3Title: '結果を即座に確認',
      step3Desc: '結果は自動的に更新されます。'
    },
    codeExample: {
      comment: '---- 週末の旅行 ----',
      hotelVar: 'hotel',
      foodVar: 'food',
      fuelVar: 'fuel',
      activitiesVar: 'activities',
      totalVar: 'total'
    },
    results: {
      title: '計算結果',
      live: 'ライブ'
    },
    features: {
      sectionsTitle: 'セクションで整理',
      sectionsDesc: '関連する計算をグループ化。',
      tabsTitle: 'タブとして保存',
      tabsDesc: 'あとで参照できるように保存。',
      changeTitle: 'いつでも変更可能',
      changeDesc: 'すべてが即座に連動更新。'
    },
    actions: {
      tryYourself: '実際に試してみる',
      skipTour: 'ツアーをスキップ',
      closeTooltip: 'ツアーを閉じる (Esc)',
      closeAria: 'モーダルを閉じる'
    }
  }
}

/**
 * Detects the browser language, checking localStorage first, then navigator.languages / navigator.language.
 * Falls back to 'en'.
 */
export function detectBrowserLanguage() {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('cetele_welcome_lang')
      if (saved && WELCOME_TRANSLATIONS[saved]) {
        return saved
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  if (typeof navigator !== 'undefined') {
    const navLangs = navigator.languages || (navigator.language ? [navigator.language] : [])
    for (const langStr of navLangs) {
      if (!langStr) continue
      const code = String(langStr).toLowerCase().split('-')[0].split('_')[0]
      if (WELCOME_TRANSLATIONS[code]) {
        return code
      }
    }
  }

  return 'en'
}

/**
 * Gets translations for the given language code, falling back to 'en'.
 */
export function getWelcomeTranslation(langCode) {
  return WELCOME_TRANSLATIONS[langCode] || WELCOME_TRANSLATIONS.en
}

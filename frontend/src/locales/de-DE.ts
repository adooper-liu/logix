// Deutsch (德语)
export default {
  // ========== Allgemein ==========
  common: {
    appName: 'LogiX',
    slogan: 'Komplexe Logistik einfach machen',
    logo: 'Logo',
    home: 'Startseite',
    back: 'Zurück',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    save: 'Speichern',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    view: 'Anzeigen',
    add: 'Hinzufügen',
    search: 'Suchen',
    filter: 'Filtern',
    export: 'Exportieren',
    import: 'Importieren',
    refresh: 'Aktualisieren',
    loading: 'Wird geladen...',
    noData: 'Keine Daten verfügbar',
    success: 'Vorgang erfolgreich',
    error: 'Vorgang fehlgeschlagen',
    warning: 'Warnung',
    info: 'Information',
    submit: 'Absenden',
    reset: 'Zurücksetzen',
    close: 'Schließen',
    yes: 'Ja',
    no: 'Nein',
    total: 'Insgesamt {count} Einträge',
    page: 'Seite {current}/{total}',
    perPage: '{count} Einträge pro Seite',
    operation: 'Vorgang',
    remark: 'Bemerkung',
    createTime: 'Erstellungszeit',
    updateTime: 'Aktualisierungszeit',
    status: 'Status',
    actions: 'Aktionen',
    detail: 'Details',
    all: 'Alle',
    more: 'Mehr',
    expand: 'Erweitern',
    collapse: 'Zusammenklappen'
  },

  // ========== Navigation ==========
  nav: {
    shipments: 'Sendungen',
    system: 'System',
    containerManagement: 'Container-Verwaltung',
    excelImport: 'Excel-Import',
    systemMonitoring: 'Systemüberwachung',
    dictMapping: 'Wörterbuch-Zuordnung',
    settings: 'Einstellungen',
    help: 'Hilfe',
    about: 'Über',
    personalCenter: 'Persönliches Zentrum',
    logout: 'Abmelden'
  },

  // ========== Benutzer ==========
  user: {
    username: 'Benutzername',
    password: 'Passwort',
    login: 'Anmelden',
    logout: 'Abmelden',
    profile: 'Profil',
    settings: 'Einstellungen',
    welcome: 'Willkommen zurück, {name}',
    loginSuccess: 'Anmeldung erfolgreich',
    loginFailed: 'Anmeldung fehlgeschlagen',
    logoutSuccess: 'Erfolgreich abgemeldet',
    pleaseLogin: 'Bitte melden Sie sich zuerst an',
    rememberMe: 'Angemeldet bleiben',
    forgotPassword: 'Passwort vergessen?'
  },

  // ========== Container ==========
  container: {
    containerNumber: 'Containernummer',
    orderNumber: 'Bestellnummer',
    containerType: 'Containertyp',
    cargoDescription: 'Frachtbeschreibung',
    logisticsStatus: 'Logistik-Status',
    inspectionRequired: 'Inspektion erforderlich',
    isUnboxing: 'Auspacken',
    // Logistik-Status
    status: {
      notShipped: 'Nicht versandt',
      shipped: 'Versandt',
      inTransit: 'Unterwegs',
      atPort: 'Im Hafen',
      pickedUp: 'Abgeholt',
      unloaded: 'Entladen',
      returnedEmpty: 'Leer zurückgegeben'
    },
    // Containertypen
    types: {
      '20GP': '20ft Standard',
      '40GP': '40ft Standard',
      '40HQ': '40ft Hochcontainer',
      '45HQ': '45ft Hochcontainer',
      '20RF': '20ft Kühlcontainer',
      '40RF': '40ft Kühlcontainer',
      '20OT': '20ft Open Top',
      '40OT': '40ft Open Top',
      '20FR': '20ft Flat Rack',
      '40FR': '40ft Flat Rack'
    }
  },

  // ========== Bestellung ==========
  order: {
    orderNumber: 'Bestellnummer',
    mainOrderNumber: 'Hauptbestellnummer',
    customerName: 'Kundenname',
    destinationCountry: 'Zielland',
    orderStatus: 'Bestellstatus',
    purchaseMode: 'Einkaufsmodus',
    priceTerms: 'Preiskonditionen',
    totalBoxes: 'Gesamtkisten',
    totalVolume: 'Gesamtvolumen',
    totalWeight: 'Gesamtgewicht',
    totalValue: 'Gesamtwert',
    negotiationAmount: 'Verhandlungsbetrag',
    // Status
    status: {
      draft: 'Entwurf',
      pending: 'Ausstehend',
      processing: 'In Bearbeitung',
      completed: 'Abgeschlossen',
      cancelled: 'Storniert'
    }
  },

  // ========== Hafen ==========
  port: {
    portCode: 'Hafencode',
    portName: 'Hafenname',
    portType: 'Hafentyp',
    eta: 'Geschätzte Ankunft',
    ata: 'Tatsächliche Ankunft',
    etd: 'Geschätzte Abfahrt',
    atd: 'Tatsächliche Abfahrt',
    // Hafentypen
    types: {
      origin: 'Abgangshafen',
      transit: 'Transithafen',
      destination: 'Zielhafen'
    }
  },

  // ========== Standgeld ==========
  demurrage: {
    chargeType: 'Gebührentyp',
    freeDays: 'Kostenlose Tage',
    freeDaysBasis: 'Basis für kostenlose Tage',
    calculationBasis: 'Berechnungsgrundlage',
    chargedAmount: 'Berechneter Betrag',
    currency: 'Währung',
    billingDate: 'Abrechnungsdatum',
    // Berechnungsgrundlage
    basis: {
      byArrival: 'Nach Ankunft',
      byUnloading: 'Nach Entladung'
    },
    // Basis für kostenlose Tage
    freeDaysBasisTypes: {
      naturalDay: 'Kalendertag',
      workingDay: 'Werktag'
    },
    // Gebührentypen
    chargeTypes: {
      demurrage: 'Standgeld',
      storage: 'Lagergebühr',
      detention: 'Containergeld',
      demurrageDetention: 'Standgeld und Containergeld',
      storageSurcharge: 'Lagerzuschlag'
    }
  },

  // ========== Überwachung ==========
  monitoring: {
    systemStatus: 'Systemstatus',
    performance: 'Leistung',
    realtime: 'Echtzeit',
    history: 'Verlauf',
    alerts: 'Warnungen',
    cpuUsage: 'CPU-Auslastung',
    memoryUsage: 'Speichernutzung',
    diskUsage: 'Festplattenauslastung',
    networkTraffic: 'Netzwerkverkehr',
    responseTime: 'Antwortzeit',
    throughput: 'Durchsatz',
    uptime: 'Betriebszeit',
    health: 'Gesundheitsstatus',
    healthy: 'Gesund',
    unhealthy: 'Ungesund',
    warning: 'Warnung',
    critical: 'Kritisch'
  },

  // ========== Einstellungen ==========
  settings: {
    general: 'Allgemein',
    language: 'Sprache',
    theme: 'Design',
    notifications: 'Benachrichtigungen',
    security: 'Sicherheit',
    account: 'Konto',
    profile: 'Profil',
    preferences: 'Präferenzen',
    languageTip: 'Wählen Sie Ihre bevorzugte Sprache',
    themeTip: 'Wählen Sie Ihr Interface-Design',
    notificationTip: 'Verwalten Sie Ihre Benachrichtigungseinstellungen',
    securityTip: 'Verwalten Sie Ihre Sicherheitseinstellungen'
  },

  // ========== Hilfe ==========
  help: {
    documentation: 'Dokumentation',
    quickStart: 'Schnellstart',
    userGuide: 'Benutzerhandbuch',
    faq: 'Häufig gestellte Fragen',
    contactSupport: 'Support kontaktieren',
    searchDoc: 'Dokumentation durchsuchen',
    noResults: 'Keine Ergebnisse gefunden',
    recentlyViewed: 'Zuletzt angesehen',
    popularTopics: 'Beliebte Themen'
  },

  // ========== Über ==========
  about: {
    aboutUs: 'Über uns',
    version: 'Version',
    copyright: 'Urheberrecht',
    license: 'Lizenz',
    termsOfService: 'Nutzungsbedingungen',
    privacyPolicy: 'Datenschutzrichtlinie',
    contactUs: 'Kontaktieren Sie uns',
    website: 'Website',
    github: 'GitHub'
  },

  // ========== Validierung ==========
  validation: {
    required: 'Dieses Feld ist erforderlich',
    email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    phone: 'Bitte geben Sie eine gültige Telefonnummer ein',
    minLength: 'Mindestens {min} Zeichen erforderlich',
    maxLength: 'Maximal {max} Zeichen zulässig',
    pattern: 'Ungültiges Format',
    range: 'Wert muss zwischen {min} und {max} liegen',
    numeric: 'Bitte geben Sie eine gültige Zahl ein',
    url: 'Bitte geben Sie eine gültige URL ein'
  },

  // ========== Zeit ==========
  time: {
    today: 'Heute',
    yesterday: 'Gestern',
    thisWeek: 'Diese Woche',
    lastWeek: 'Letzte Woche',
    thisMonth: 'Dieser Monat',
    lastMonth: 'Letzter Monat',
    thisYear: 'Dieses Jahr',
    lastYear: 'Letztes Jahr',
    daysAgo: 'vor {days} Tagen',
    hoursAgo: 'vor {hours} Stunden',
    minutesAgo: 'vor {minutes} Minuten',
    justNow: 'Gerade eben',
    dateFormat: 'DD.MM.YYYY',
    dateTimeFormat: 'DD.MM.YYYY HH:mm:ss',
    timeFormat: 'HH:mm:ss'
  },

  // ========== Fehler ==========
  error: {
    networkError: 'Netzwerkfehler, bitte überprüfen Sie Ihre Verbindung',
    serverError: 'Serverfehler, bitte versuchen Sie es später erneut',
    unauthorized: 'Nicht autorisiert, bitte melden Sie sich erneut an',
    forbidden: 'Zugriff verweigert',
    notFound: 'Ressource nicht gefunden',
    timeout: 'Anfrage Zeitüberschreitung',
    unknown: 'Unbekannter Fehler',
    retry: 'Wiederholen',
    contactAdmin: 'Wenden Sie sich an den Administrator'
  }
}

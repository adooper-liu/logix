// Italiano (意大利语)
export default {
  // ========== Generale ==========
  common: {
    appName: 'LogiX',
    slogan: 'Rendere la logistica complessa semplice',
    logo: 'Logo',
    home: 'Home',
    back: 'Indietro',
    confirm: 'Conferma',
    cancel: 'Annulla',
    save: 'Salva',
    delete: 'Elimina',
    edit: 'Modifica',
    view: 'Visualizza',
    add: 'Aggiungi',
    search: 'Cerca',
    filter: 'Filtra',
    export: 'Esporta',
    import: 'Importa',
    refresh: 'Aggiorna',
    loading: 'Caricamento...',
    noData: 'Nessun dato disponibile',
    success: 'Operazione riuscita',
    error: 'Operazione fallita',
    warning: 'Avviso',
    info: 'Informazioni',
    submit: 'Invia',
    reset: 'Reimposta',
    close: 'Chiudi',
    yes: 'Sì',
    no: 'No',
    total: 'Totale {count} elementi',
    page: 'Pagina {current}/{total}',
    perPage: '{count} elementi per pagina',
    operation: 'Operazione',
    remark: 'Nota',
    createTime: 'Data di creazione',
    updateTime: 'Data di aggiornamento',
    status: 'Stato',
    actions: 'Azioni',
    detail: 'Dettagli',
    all: 'Tutti',
    more: 'Altro',
    expand: 'Espandi',
    collapse: 'Comprimi'
  },

  // ========== Navigazione ==========
  nav: {
    shipments: 'Spedizioni',
    system: 'Sistema',
    containerManagement: 'Gestione container',
    excelImport: 'Importa Excel',
    systemMonitoring: 'Monitoraggio sistema',
    dictMapping: 'Mappatura dizionario',
    settings: 'Impostazioni',
    help: 'Aiuto',
    about: 'Informazioni',
    personalCenter: 'Centro personale',
    logout: 'Logout'
  },

  // ========== Utente ==========
  user: {
    username: 'Nome utente',
    password: 'Password',
    login: 'Accesso',
    logout: 'Logout',
    profile: 'Profilo',
    settings: 'Impostazioni',
    welcome: 'Bentornato, {name}',
    loginSuccess: 'Accesso riuscito',
    loginFailed: 'Accesso fallito',
    logoutSuccess: 'Logout riuscito',
    pleaseLogin: 'Accedi prima',
    rememberMe: 'Ricordami',
    forgotPassword: 'Password dimenticata?'
  },

  // ========== Container ==========
  container: {
    containerNumber: 'Numero container',
    orderNumber: 'Numero ordine',
    containerType: 'Tipo container',
    cargoDescription: 'Descrizione carico',
    logisticsStatus: 'Stato logistica',
    inspectionRequired: 'Ispezione richiesta',
    isUnboxing: 'Sballaggio',
    // Stato logistica
    status: {
      notShipped: 'Non spedito',
      shipped: 'Spedito',
      inTransit: 'In transito',
      atPort: 'In porto',
      pickedUp: 'Ritirato',
      unloaded: 'Scaricato',
      returnedEmpty: 'Restituito vuoto'
    },
    // Tipi di container
    types: {
      '20GP': '20 piedi standard',
      '40GP': '40 piedi standard',
      '40HQ': '40 piedi high cube',
      '45HQ': '45 piedi high cube',
      '20RF': '20 piedi refrigerato',
      '40RF': '40 piedi refrigerato',
      '20OT': '20 piedi open top',
      '40OT': '40 piedi open top',
      '20FR': '20 piedi flat rack',
      '40FR': '40 piedi flat rack'
    }
  },

  // ========== Ordine ==========
  order: {
    orderNumber: 'Numero ordine',
    mainOrderNumber: 'Numero ordine principale',
    customerName: 'Nome cliente',
    destinationCountry: 'Paese di destinazione',
    orderStatus: 'Stato ordine',
    purchaseMode: 'Modalità acquisto',
    priceTerms: 'Termini prezzo',
    totalBoxes: 'Totale casse',
    totalVolume: 'Volume totale',
    totalWeight: 'Peso totale',
    totalValue: 'Valore totale',
    negotiationAmount: 'Importo negoziazione',
    // Stato
    status: {
      draft: 'Bozza',
      pending: 'In attesa',
      processing: 'In elaborazione',
      completed: 'Completato',
      cancelled: 'Annullato'
    }
  },

  // ========== Porto ==========
  port: {
    portCode: 'Codice porto',
    portName: 'Nome porto',
    portType: 'Tipo porto',
    eta: 'ETA',
    ata: 'ATA',
    etd: 'ETD',
    atd: 'ATD',
    // Tipi di porto
    types: {
      origin: 'Porto di origine',
      transit: 'Porto di transito',
      destination: 'Porto di destinazione'
    }
  },

  // ========== Demurrage ==========
  demurrage: {
    chargeType: 'Tipo tariffa',
    freeDays: 'Giorni gratuiti',
    freeDaysBasis: 'Base giorni gratuiti',
    calculationBasis: 'Base calcolo',
    chargedAmount: 'Importo addebitato',
    currency: 'Valuta',
    billingDate: 'Data fatturazione',
    // Base calcolo
    basis: {
      byArrival: 'Per arrivo',
      byUnloading: 'Per scarico'
    },
    // Base giorni gratuiti
    freeDaysBasisTypes: {
      naturalDay: 'Giorno naturale',
      workingDay: 'Giorno lavorativo'
    },
    // Tipi tariffa
    chargeTypes: {
      demurrage: 'Demurrage',
      storage: 'Stoccaggio',
      detention: 'Detention',
      demurrageDetention: 'Demurrage e detention',
      storageSurcharge: 'Soprattassa stoccaggio'
    }
  },

  // ========== Monitoraggio ==========
  monitoring: {
    systemStatus: 'Stato sistema',
    performance: 'Prestazioni',
    realtime: 'Tempo reale',
    history: 'Storico',
    alerts: 'Avvisi',
    cpuUsage: 'Utilizzo CPU',
    memoryUsage: 'Utilizzo memoria',
    diskUsage: 'Utilizzo disco',
    networkTraffic: 'Traffico di rete',
    responseTime: 'Tempo di risposta',
    throughput: 'Throughput',
    uptime: 'Tempo di attività',
    health: 'Stato di salute',
    healthy: 'Sano',
    unhealthy: 'Malsano',
    warning: 'Avviso',
    critical: 'Critico'
  },

  // ========== Impostazioni ==========
  settings: {
    general: 'Generale',
    language: 'Lingua',
    theme: 'Tema',
    notifications: 'Notifiche',
    security: 'Sicurezza',
    account: 'Account',
    profile: 'Profilo',
    preferences: 'Preferenze',
    languageTip: 'Seleziona la tua lingua preferita',
    themeTip: 'Scegli il tema dell\'interfaccia',
    notificationTip: 'Gestisci le preferenze di notifica',
    securityTip: 'Gestisci le impostazioni di sicurezza'
  },

  // ========== Aiuto ==========
  help: {
    documentation: 'Documentazione',
    quickStart: 'Avvio rapido',
    userGuide: 'Guida utente',
    faq: 'FAQ',
    contactSupport: 'Contatta supporto',
    searchDoc: 'Cerca nella documentazione',
    noResults: 'Nessun risultato trovato',
    recentlyViewed: 'Visualizzati di recente',
    popularTopics: 'Argomenti popolari'
  },

  // ========== Informazioni ==========
  about: {
    aboutUs: 'Chi siamo',
    version: 'Versione',
    copyright: 'Copyright',
    license: 'Licenza',
    termsOfService: 'Termini di servizio',
    privacyPolicy: 'Informativa sulla privacy',
    contactUs: 'Contattaci',
    website: 'Sito web',
    github: 'GitHub'
  },

  // ========== Validazione ==========
  validation: {
    required: 'Questo campo è obbligatorio',
    email: 'Inserisci un indirizzo email valido',
    phone: 'Inserisci un numero di telefono valido',
    minLength: 'Minimo {min} caratteri richiesti',
    maxLength: 'Massimo {max} caratteri consentiti',
    pattern: 'Formato non valido',
    range: 'Il valore deve essere tra {min} e {max}',
    numeric: 'Inserisci un numero valido',
    url: 'Inserisci un URL valido'
  },

  // ========== Tempo ==========
  time: {
    today: 'Oggi',
    yesterday: 'Ieri',
    thisWeek: 'Questa settimana',
    lastWeek: 'Settimana scorsa',
    thisMonth: 'Questo mese',
    lastMonth: 'Mese scorso',
    thisYear: 'Quest\'anno',
    lastYear: 'Anno scorso',
    daysAgo: '{days} giorni fa',
    hoursAgo: '{hours} ore fa',
    minutesAgo: '{minutes} minuti fa',
    justNow: 'Proprio ora',
    dateFormat: 'DD/MM/YYYY',
    dateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
    timeFormat: 'HH:mm:ss'
  },

  // ========== Errore ==========
  error: {
    networkError: 'Errore di rete, controlla la connessione',
    serverError: 'Errore del server, riprova più tardi',
    unauthorized: 'Non autorizzato, accedi di nuovo',
    forbidden: 'Accesso negato',
    notFound: 'Risorsa non trovata',
    timeout: 'Timeout della richiesta',
    unknown: 'Errore sconosciuto',
    retry: 'Riprova',
    contactAdmin: 'Contatta l\'amministratore'
  }
}

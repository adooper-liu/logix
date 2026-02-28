// Français (法语)
export default {
  // ========== Général ==========
  common: {
    appName: 'LogiX',
    slogan: 'Rendre la logistique complexe simple',
    logo: 'Logo',
    home: 'Accueil',
    back: 'Retour',
    confirm: 'Confirmer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    view: 'Voir',
    add: 'Ajouter',
    search: 'Rechercher',
    filter: 'Filtrer',
    export: 'Exporter',
    import: 'Importer',
    refresh: 'Actualiser',
    loading: 'Chargement...',
    noData: 'Aucune donnée disponible',
    success: 'Opération réussie',
    error: 'Opération échouée',
    warning: 'Avertissement',
    info: 'Information',
    submit: 'Soumettre',
    reset: 'Réinitialiser',
    close: 'Fermer',
    yes: 'Oui',
    no: 'Non',
    total: 'Total {count} éléments',
    page: 'Page {current}/{total}',
    perPage: '{count} éléments par page',
    operation: 'Opération',
    remark: 'Remarque',
    createTime: 'Date de création',
    updateTime: 'Date de mise à jour',
    status: 'Statut',
    actions: 'Actions',
    detail: 'Détails',
    all: 'Tout',
    more: 'Plus',
    expand: 'Développer',
    collapse: 'Réduire'
  },

  // ========== Navigation ==========
  nav: {
    shipments: 'Expéditions',
    system: 'Système',
    containerManagement: 'Gestion des conteneurs',
    excelImport: 'Import Excel',
    systemMonitoring: 'Surveillance système',
    dictMapping: 'Mappage dictionnaire',
    settings: 'Paramètres',
    help: 'Aide',
    about: 'À propos',
    personalCenter: 'Centre personnel',
    logout: 'Déconnexion'
  },

  // ========== Utilisateur ==========
  user: {
    username: 'Nom d\'utilisateur',
    password: 'Mot de passe',
    login: 'Connexion',
    logout: 'Déconnexion',
    profile: 'Profil',
    settings: 'Paramètres',
    welcome: 'Bienvenue, {name}',
    loginSuccess: 'Connexion réussie',
    loginFailed: 'Échec de la connexion',
    logoutSuccess: 'Déconnexion réussie',
    pleaseLogin: 'Veuillez vous connecter d\'abord',
    rememberMe: 'Se souvenir de moi',
    forgotPassword: 'Mot de passe oublié ?'
  },

  // ========== Conteneur ==========
  container: {
    containerNumber: 'Numéro de conteneur',
    orderNumber: 'Numéro de commande',
    containerType: 'Type de conteneur',
    cargoDescription: 'Description de la cargaison',
    logisticsStatus: 'Statut logistique',
    inspectionRequired: 'Inspection requise',
    isUnboxing: 'Déblocage',
    // Statut logistique
    status: {
      notShipped: 'Non expédié',
      shipped: 'Expédié',
      inTransit: 'En transit',
      atPort: 'Au port',
      pickedUp: 'Récupéré',
      unloaded: 'Déchargé',
      returnedEmpty: 'Retourné vide'
    },
    // Types de conteneurs
    types: {
      '20GP': '20 pieds standard',
      '40GP': '40 pieds standard',
      '40HQ': '40 pieds high cube',
      '45HQ': '45 pieds high cube',
      '20RF': '20 pieds réfrigéré',
      '40RF': '40 pieds réfrigéré',
      '20OT': '20 pieds ouvert',
      '40OT': '40 pieds ouvert',
      '20FR': '20 pieds plateau',
      '40FR': '40 pieds plateau'
    }
  },

  // ========== Commande ==========
  order: {
    orderNumber: 'Numéro de commande',
    mainOrderNumber: 'Numéro de commande principale',
    customerName: 'Nom du client',
    destinationCountry: 'Pays de destination',
    orderStatus: 'Statut de la commande',
    purchaseMode: 'Mode d\'achat',
    priceTerms: 'Conditions de prix',
    totalBoxes: 'Total des caisses',
    totalVolume: 'Volume total',
    totalWeight: 'Poids total',
    totalValue: 'Valeur totale',
    negotiationAmount: 'Montant de négociation',
    // Statut
    status: {
      draft: 'Brouillon',
      pending: 'En attente',
      processing: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé'
    }
  },

  // ========== Port ==========
  port: {
    portCode: 'Code port',
    portName: 'Nom du port',
    portType: 'Type de port',
    eta: 'ETA',
    ata: 'ATA',
    etd: 'ETD',
    atd: 'ATD',
    // Types de ports
    types: {
      origin: 'Port d\'origine',
      transit: 'Port de transit',
      destination: 'Port de destination'
    }
  },

  // ========== Démurrage ==========
  demurrage: {
    chargeType: 'Type de frais',
    freeDays: 'Jours gratuits',
    freeDaysBasis: 'Base des jours gratuits',
    calculationBasis: 'Base de calcul',
    chargedAmount: 'Montant facturé',
    currency: 'Devise',
    billingDate: 'Date de facturation',
    // Base de calcul
    basis: {
      byArrival: 'Par arrivée',
      byUnloading: 'Par déchargement'
    },
    // Base des jours gratuits
    freeDaysBasisTypes: {
      naturalDay: 'Jour naturel',
      workingDay: 'Jour ouvrable'
    },
    // Types de frais
    chargeTypes: {
      demurrage: 'Démurrage',
      storage: 'Stockage',
      detention: 'Détention',
      demurrageDetention: 'Démurrage et détention',
      storageSurcharge: 'Supplément de stockage'
    }
  },

  // ========== Surveillance ==========
  monitoring: {
    systemStatus: 'Statut du système',
    performance: 'Performance',
    realtime: 'Temps réel',
    history: 'Historique',
    alerts: 'Alertes',
    cpuUsage: 'Utilisation CPU',
    memoryUsage: 'Utilisation mémoire',
    diskUsage: 'Utilisation disque',
    networkTraffic: 'Trafic réseau',
    responseTime: 'Temps de réponse',
    throughput: 'Débit',
    uptime: 'Temps de fonctionnement',
    health: 'État de santé',
    healthy: 'Sain',
    unhealthy: 'Malsain',
    warning: 'Avertissement',
    critical: 'Critique'
  },

  // ========== Paramètres ==========
  settings: {
    general: 'Général',
    language: 'Langue',
    theme: 'Thème',
    notifications: 'Notifications',
    security: 'Sécurité',
    account: 'Compte',
    profile: 'Profil',
    preferences: 'Préférences',
    languageTip: 'Sélectionnez votre langue préférée',
    themeTip: 'Choisissez votre thème d\'interface',
    notificationTip: 'Gérer vos préférences de notification',
    securityTip: 'Gérer vos paramètres de sécurité'
  },

  // ========== Aide ==========
  help: {
    documentation: 'Documentation',
    quickStart: 'Démarrage rapide',
    userGuide: 'Guide de l\'utilisateur',
    faq: 'FAQ',
    contactSupport: 'Contacter le support',
    searchDoc: 'Rechercher dans la documentation',
    noResults: 'Aucun résultat trouvé',
    recentlyViewed: 'Récemment consulté',
    popularTopics: 'Sujets populaires'
  },

  // ========== À propos ==========
  about: {
    aboutUs: 'À propos de nous',
    version: 'Version',
    copyright: 'Copyright',
    license: 'Licence',
    termsOfService: 'Conditions d\'utilisation',
    privacyPolicy: 'Politique de confidentialité',
    contactUs: 'Nous contacter',
    website: 'Site web',
    github: 'GitHub'
  },

  // ========== Validation ==========
  validation: {
    required: 'Ce champ est requis',
    email: 'Veuillez entrer une adresse e-mail valide',
    phone: 'Veuillez entrer un numéro de téléphone valide',
    minLength: 'Minimum {min} caractères requis',
    maxLength: 'Maximum {max} caractères autorisés',
    pattern: 'Format invalide',
    range: 'La valeur doit être entre {min} et {max}',
    numeric: 'Veuillez entrer un nombre valide',
    url: 'Veuillez entrer une URL valide'
  },

  // ========== Temps ==========
  time: {
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    thisWeek: 'Cette semaine',
    lastWeek: 'La semaine dernière',
    thisMonth: 'Ce mois',
    lastMonth: 'Le mois dernier',
    thisYear: 'Cette année',
    lastYear: 'L\'année dernière',
    daysAgo: 'Il y a {days} jours',
    hoursAgo: 'Il y a {hours} heures',
    minutesAgo: 'Il y a {minutes} minutes',
    justNow: 'À l\'instant',
    dateFormat: 'DD/MM/YYYY',
    dateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
    timeFormat: 'HH:mm:ss'
  },

  // ========== Erreur ==========
  error: {
    networkError: 'Erreur réseau, vérifiez votre connexion',
    serverError: 'Erreur serveur, réessayez plus tard',
    unauthorized: 'Non autorisé, veuillez vous reconnecter',
    forbidden: 'Accès refusé',
    notFound: 'Ressource non trouvée',
    timeout: 'Délai d\'attente dépassé',
    unknown: 'Erreur inconnue',
    retry: 'Réessayer',
    contactAdmin: 'Contacter l\'administrateur'
  }
}

// English
export default {
  // ========== Common ==========
  common: {
    appName: 'LogiX',
    slogan: 'Making Complex Logistics Simple',
    logo: 'Logo',
    home: 'Home',
    back: 'Back',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    loading: 'Loading...',
    noData: 'No data available',
    success: 'Operation successful',
    error: 'Operation failed',
    warning: 'Warning',
    info: 'Info',
    submit: 'Submit',
    reset: 'Reset',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    total: 'Total {count} items',
    page: 'Page {current}/{total}',
    perPage: '{count} items per page',
    operation: 'Operation',
    remark: 'Remark',
    createTime: 'Create Time',
    updateTime: 'Update Time',
    status: 'Status',
    actions: 'Actions',
    detail: 'Detail',
    all: 'All',
    more: 'More',
    expand: 'Expand',
    collapse: 'Collapse'
  },

  // ========== Navigation ==========
  nav: {
    shipments: 'Shipments',
    system: 'System',
    containerManagement: 'Container Management',
    excelImport: 'Excel Import',
    systemMonitoring: 'System Monitoring',
    dictMapping: 'Dictionary Mapping',
    settings: 'Settings',
    help: 'Help',
    about: 'About',
    personalCenter: 'Personal Center',
    logout: 'Logout'
  },

  // ========== User ==========
  user: {
    username: 'Username',
    password: 'Password',
    login: 'Login',
    logout: 'Logout',
    profile: 'Profile',
    settings: 'Settings',
    welcome: 'Welcome back, {name}',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    logoutSuccess: 'Logout successful',
    pleaseLogin: 'Please login first',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?'
  },

  // ========== Container ==========
  container: {
    containerNumber: 'Container Number',
    orderNumber: 'Order Number',
    containerType: 'Container Type',
    cargoDescription: 'Cargo Description',
    logisticsStatus: 'Logistics Status',
    inspectionRequired: 'Inspection Required',
    isUnboxing: 'Unboxing',
    // Logistics Status
    status: {
      notShipped: 'Not Shipped',
      shipped: 'Shipped',
      inTransit: 'In Transit',
      atPort: 'At Port',
      pickedUp: 'Picked Up',
      unloaded: 'Unloaded',
      returnedEmpty: 'Returned Empty'
    },
    // Container Types
    types: {
      '20GP': '20ft General Purpose',
      '40GP': '40ft General Purpose',
      '40HQ': '40ft High Cube',
      '45HQ': '45ft High Cube',
      '20RF': '20ft Refrigerated',
      '40RF': '40ft Refrigerated',
      '20OT': '20ft Open Top',
      '40OT': '40ft Open Top',
      '20FR': '20ft Flat Rack',
      '40FR': '40ft Flat Rack'
    }
  },

  // ========== Order ==========
  order: {
    orderNumber: 'Order Number',
    mainOrderNumber: 'Main Order Number',
    customerName: 'Customer Name',
    destinationCountry: 'Destination Country',
    orderStatus: 'Order Status',
    purchaseMode: 'Purchase Mode',
    priceTerms: 'Price Terms',
    totalBoxes: 'Total Boxes',
    totalVolume: 'Total Volume',
    totalWeight: 'Total Weight',
    totalValue: 'Total Value',
    negotiationAmount: 'Negotiation Amount',
    // Status
    status: {
      draft: 'Draft',
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }
  },

  // ========== Port ==========
  port: {
    portCode: 'Port Code',
    portName: 'Port Name',
    portType: 'Port Type',
    eta: 'ETA',
    ata: 'ATA',
    etd: 'ETD',
    atd: 'ATD',
    // Port Types
    types: {
      origin: 'Origin Port',
      transit: 'Transit Port',
      destination: 'Destination Port'
    }
  },

  // ========== Demurrage ==========
  demurrage: {
    chargeType: 'Charge Type',
    freeDays: 'Free Days',
    freeDaysBasis: 'Free Days Basis',
    calculationBasis: 'Calculation Basis',
    chargedAmount: 'Charged Amount',
    currency: 'Currency',
    billingDate: 'Billing Date',
    // Calculation Basis
    basis: {
      byArrival: 'By Arrival',
      byUnloading: 'By Unloading'
    },
    // Free Days Basis Types
    freeDaysBasisTypes: {
      naturalDay: 'Natural Day',
      workingDay: 'Working Day'
    },
    // Charge Types
    chargeTypes: {
      demurrage: 'Demurrage',
      storage: 'Storage',
      detention: 'Detention',
      demurrageDetention: 'Demurrage & Detention',
      storageSurcharge: 'Storage Surcharge'
    }
  },

  // ========== Monitoring ==========
  monitoring: {
    systemStatus: 'System Status',
    performance: 'Performance',
    realtime: 'Real-time',
    history: 'History',
    alerts: 'Alerts',
    cpuUsage: 'CPU Usage',
    memoryUsage: 'Memory Usage',
    diskUsage: 'Disk Usage',
    networkTraffic: 'Network Traffic',
    responseTime: 'Response Time',
    throughput: 'Throughput',
    uptime: 'Uptime',
    health: 'Health',
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    warning: 'Warning',
    critical: 'Critical'
  },

  // ========== Settings ==========
  settings: {
    general: 'General',
    language: 'Language',
    theme: 'Theme',
    notifications: 'Notifications',
    security: 'Security',
    account: 'Account',
    profile: 'Profile',
    preferences: 'Preferences',
    languageTip: 'Select your preferred language',
    themeTip: 'Choose your interface theme',
    notificationTip: 'Manage notification preferences',
    securityTip: 'Manage account security settings'
  },

  // ========== Help ==========
  help: {
    documentation: 'Documentation',
    quickStart: 'Quick Start',
    userGuide: 'User Guide',
    faq: 'FAQ',
    contactSupport: 'Contact Support',
    searchDoc: 'Search Documentation',
    noResults: 'No results found',
    recentlyViewed: 'Recently Viewed',
    popularTopics: 'Popular Topics'
  },

  // ========== About ==========
  about: {
    aboutUs: 'About Us',
    version: 'Version',
    copyright: 'Copyright',
    license: 'License',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    contactUs: 'Contact Us',
    website: 'Website',
    github: 'GitHub'
  },

  // ========== Validation ==========
  validation: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid phone number',
    minLength: 'Minimum {min} characters required',
    maxLength: 'Maximum {max} characters allowed',
    pattern: 'Invalid format',
    range: 'Value must be between {min} and {max}',
    numeric: 'Please enter a valid number',
    url: 'Please enter a valid URL'
  },

  // ========== Time ==========
  time: {
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisYear: 'This Year',
    lastYear: 'Last Year',
    daysAgo: '{days} days ago',
    hoursAgo: '{hours} hours ago',
    minutesAgo: '{minutes} minutes ago',
    justNow: 'Just now',
    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
    timeFormat: 'HH:mm:ss'
  },

  // ========== Error ==========
  error: {
    networkError: 'Network error, please check your connection',
    serverError: 'Server error, please try again later',
    unauthorized: 'Unauthorized, please login again',
    forbidden: 'Access forbidden',
    notFound: 'Resource not found',
    timeout: 'Request timeout',
    unknown: 'Unknown error',
    retry: 'Retry',
    contactAdmin: 'Contact administrator'
  }
}

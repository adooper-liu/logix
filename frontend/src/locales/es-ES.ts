// Español (西班牙语)
export default {
  // ========== General ==========
  common: {
    appName: 'LogiX',
    slogan: 'Hacer la logística compleja sencilla',
    logo: 'Logo',
    home: 'Inicio',
    back: 'Volver',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    view: 'Ver',
    add: 'Añadir',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    import: 'Importar',
    refresh: 'Actualizar',
    loading: 'Cargando...',
    noData: 'Sin datos disponibles',
    success: 'Operación exitosa',
    error: 'Operación fallida',
    warning: 'Advertencia',
    info: 'Información',
    submit: 'Enviar',
    reset: 'Restablecer',
    close: 'Cerrar',
    yes: 'Sí',
    no: 'No',
    total: 'Total {count} elementos',
    page: 'Página {current}/{total}',
    perPage: '{count} elementos por página',
    operation: 'Operación',
    remark: 'Nota',
    createTime: 'Fecha de creación',
    updateTime: 'Fecha de actualización',
    status: 'Estado',
    actions: 'Acciones',
    detail: 'Detalles',
    all: 'Todos',
    more: 'Más',
    expand: 'Expandir',
    collapse: 'Contraer'
  },

  // ========== Navegación ==========
  nav: {
    shipments: 'Envíos',
    system: 'Sistema',
    containerManagement: 'Gestión de contenedores',
    excelImport: 'Importar Excel',
    systemMonitoring: 'Monitoreo del sistema',
    dictMapping: 'Mapeo de diccionario',
    settings: 'Configuración',
    help: 'Ayuda',
    about: 'Acerca de',
    personalCenter: 'Centro personal',
    logout: 'Cerrar sesión'
  },

  // ========== Usuario ==========
  user: {
    username: 'Nombre de usuario',
    password: 'Contraseña',
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    profile: 'Perfil',
    settings: 'Configuración',
    welcome: 'Bienvenido de nuevo, {name}',
    loginSuccess: 'Inicio de sesión exitoso',
    loginFailed: 'Inicio de sesión fallido',
    logoutSuccess: 'Cierre de sesión exitoso',
    pleaseLogin: 'Inicie sesión primero',
    rememberMe: 'Recordarme',
    forgotPassword: '¿Olvidaste tu contraseña?'
  },

  // ========== Contenedor ==========
  container: {
    containerNumber: 'Número de contenedor',
    orderNumber: 'Número de pedido',
    containerType: 'Tipo de contenedor',
    cargoDescription: 'Descripción de carga',
    logisticsStatus: 'Estado logístico',
    inspectionRequired: 'Inspección requerida',
    isUnboxing: 'Desembalaje',
    // Estado logístico
    status: {
      notShipped: 'No enviado',
      shipped: 'Enviado',
      inTransit: 'En tránsito',
      atPort: 'En puerto',
      pickedUp: 'Recogido',
      unloaded: 'Descargado',
      returnedEmpty: 'Devuelto vacío'
    },
    // Tipos de contenedores
    types: {
      '20GP': '20 pies estándar',
      '40GP': '40 pies estándar',
      '40HQ': '40 pies high cube',
      '45HQ': '45 pies high cube',
      '20RF': '20 pies refrigerado',
      '40RF': '40 pies refrigerado',
      '20OT': '20 pies open top',
      '40OT': '40 pies open top',
      '20FR': '20 pies flat rack',
      '40FR': '40 pies flat rack'
    }
  },

  // ========== Pedido ==========
  order: {
    orderNumber: 'Número de pedido',
    mainOrderNumber: 'Número de pedido principal',
    customerName: 'Nombre del cliente',
    destinationCountry: 'País de destino',
    orderStatus: 'Estado del pedido',
    purchaseMode: 'Modo de compra',
    priceTerms: 'Condiciones de precio',
    totalBoxes: 'Total de cajas',
    totalVolume: 'Volumen total',
    totalWeight: 'Peso total',
    totalValue: 'Valor total',
    negotiationAmount: 'Monto de negociación',
    // Estado
    status: {
      draft: 'Borrador',
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      cancelled: 'Cancelado'
    }
  },

  // ========== Puerto ==========
  port: {
    portCode: 'Código de puerto',
    portName: 'Nombre del puerto',
    portType: 'Tipo de puerto',
    eta: 'ETA',
    ata: 'ATA',
    etd: 'ETD',
    atd: 'ATD',
    // Tipos de puertos
    types: {
      origin: 'Puerto de origen',
      transit: 'Puerto de transbordo',
      destination: 'Puerto de destino'
    }
  },

  // ========== Demurrage ==========
  demurrage: {
    chargeType: 'Tipo de tarifa',
    freeDays: 'Días gratuitos',
    freeDaysBasis: 'Base de días gratuitos',
    calculationBasis: 'Base de cálculo',
    chargedAmount: 'Monto cobrado',
    currency: 'Moneda',
    billingDate: 'Fecha de facturación',
    // Base de cálculo
    basis: {
      byArrival: 'Por llegada',
      byUnloading: 'Por descarga'
    },
    // Base de días gratuitos
    freeDaysBasisTypes: {
      naturalDay: 'Día natural',
      workingDay: 'Día hábil'
    },
    // Tipos de tarifa
    chargeTypes: {
      demurrage: 'Demora',
      storage: 'Almacenamiento',
      detention: 'Retención',
      demurrageDetention: 'Demora y retención',
      storageSurcharge: 'Recargo de almacenamiento'
    }
  },

  // ========== Monitoreo ==========
  monitoring: {
    systemStatus: 'Estado del sistema',
    performance: 'Rendimiento',
    realtime: 'Tiempo real',
    history: 'Historial',
    alerts: 'Alertas',
    cpuUsage: 'Uso de CPU',
    memoryUsage: 'Uso de memoria',
    diskUsage: 'Uso de disco',
    networkTraffic: 'Tráfico de red',
    responseTime: 'Tiempo de respuesta',
    throughput: 'Rendimiento',
    uptime: 'Tiempo de actividad',
    health: 'Estado de salud',
    healthy: 'Saludable',
    unhealthy: 'Poco saludable',
    warning: 'Advertencia',
    critical: 'Crítico'
  },

  // ========== Configuración ==========
  settings: {
    general: 'General',
    language: 'Idioma',
    theme: 'Tema',
    notifications: 'Notificaciones',
    security: 'Seguridad',
    account: 'Cuenta',
    profile: 'Perfil',
    preferences: 'Preferencias',
    languageTip: 'Selecciona tu idioma preferido',
    themeTip: 'Elige tu tema de interfaz',
    notificationTip: 'Gestiona tus preferencias de notificación',
    securityTip: 'Gestiona tu configuración de seguridad'
  },

  // ========== Ayuda ==========
  help: {
    documentation: 'Documentación',
    quickStart: 'Inicio rápido',
    userGuide: 'Guía de usuario',
    faq: 'Preguntas frecuentes',
    contactSupport: 'Contactar soporte',
    searchDoc: 'Buscar en documentación',
    noResults: 'No se encontraron resultados',
    recentlyViewed: 'Vistos recientemente',
    popularTopics: 'Temas populares'
  },

  // ========== Acerca de ==========
  about: {
    aboutUs: 'Acerca de nosotros',
    version: 'Versión',
    copyright: 'Derechos de autor',
    license: 'Licencia',
    termsOfService: 'Términos de servicio',
    privacyPolicy: 'Política de privacidad',
    contactUs: 'Contáctanos',
    website: 'Sitio web',
    github: 'GitHub'
  },

  // ========== Validación ==========
  validation: {
    required: 'Este campo es obligatorio',
    email: 'Por favor ingresa un correo válido',
    phone: 'Por favor ingresa un número de teléfono válido',
    minLength: 'Mínimo {min} caracteres requeridos',
    maxLength: 'Máximo {max} caracteres permitidos',
    pattern: 'Formato inválido',
    range: 'El valor debe estar entre {min} y {max}',
    numeric: 'Por favor ingresa un número válido',
    url: 'Por favor ingresa una URL válida'
  },

  // ========== Tiempo ==========
  time: {
    today: 'Hoy',
    yesterday: 'Ayer',
    thisWeek: 'Esta semana',
    lastWeek: 'La semana pasada',
    thisMonth: 'Este mes',
    lastMonth: 'El mes pasado',
    thisYear: 'Este año',
    lastYear: 'El año pasado',
    daysAgo: 'hace {days} días',
    hoursAgo: 'hace {hours} horas',
    minutesAgo: 'hace {minutes} minutos',
    justNow: 'Justo ahora',
    dateFormat: 'DD/MM/YYYY',
    dateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
    timeFormat: 'HH:mm:ss'
  },

  // ========== Error ==========
  error: {
    networkError: 'Error de red, verifica tu conexión',
    serverError: 'Error del servidor, intenta más tarde',
    unauthorized: 'No autorizado, inicia sesión de nuevo',
    forbidden: 'Acceso denegado',
    notFound: 'Recurso no encontrado',
    timeout: 'Tiempo de espera agotado',
    unknown: 'Error desconocido',
    retry: 'Reintentar',
    contactAdmin: 'Contactar administrador'
  }
}

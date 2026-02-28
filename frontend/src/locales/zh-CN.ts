// 中文（简体）
export default {
  // ========== 通用 ==========
  common: {
    appName: 'LogiX',
    slogan: '让复杂物流变得简单愉快',
    logo: 'Logo',
    home: '首页',
    back: '返回',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    view: '查看',
    add: '添加',
    search: '搜索',
    filter: '筛选',
    export: '导出',
    import: '导入',
    refresh: '刷新',
    loading: '加载中...',
    noData: '暂无数据',
    success: '操作成功',
    error: '操作失败',
    warning: '警告',
    info: '提示',
    submit: '提交',
    reset: '重置',
    close: '关闭',
    yes: '是',
    no: '否',
    total: '共 {count} 条',
    page: '第 {current}/{total} 页',
    perPage: '每页 {count} 条',
    operation: '操作',
    remark: '备注',
    createTime: '创建时间',
    updateTime: '更新时间',
    status: '状态',
    actions: '操作',
    detail: '详情',
    all: '全部',
    more: '更多',
    expand: '展开',
    collapse: '收起'
  },

  // ========== 导航菜单 ==========
  nav: {
    shipments: '货柜',
    system: '系统',
    containerManagement: '集装箱管理',
    excelImport: 'Excel数据导入',
    systemMonitoring: '系统监控',
    dictMapping: '通用字典映射',
    settings: '系统设置',
    help: '帮助文档',
    about: '关于',
    personalCenter: '个人中心',
    logout: '退出登录'
  },

  // ========== 用户相关 ==========
  user: {
    username: '用户名',
    password: '密码',
    login: '登录',
    logout: '退出登录',
    profile: '个人资料',
    settings: '设置',
    welcome: '欢迎回来，{name}',
    loginSuccess: '登录成功',
    loginFailed: '登录失败',
    logoutSuccess: '退出成功',
    pleaseLogin: '请先登录',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？'
  },

  // ========== 货柜相关 ==========
  container: {
    containerNumber: '集装箱号',
    orderNumber: '备货单号',
    containerType: '柜型',
    cargoDescription: '货物描述',
    logisticsStatus: '物流状态',
    inspectionRequired: '是否查验',
    isUnboxing: '是否开箱',
    // 物流状态
    status: {
      notShipped: '未出运',
      shipped: '已出运',
      inTransit: '在途',
      atPort: '已到港',
      pickedUp: '已提柜',
      unloaded: '已卸柜',
      returnedEmpty: '已还箱'
    },
    // 柜型
    types: {
      '20GP': '20英尺普通柜',
      '40GP': '40英尺普通柜',
      '40HQ': '40英尺高柜',
      '45HQ': '45英尺高柜',
      '20RF': '20英尺冷藏柜',
      '40RF': '40英尺冷藏柜',
      '20OT': '20英尺开顶柜',
      '40OT': '40英尺开顶柜',
      '20FR': '20英尺框架柜',
      '40FR': '40英尺框架柜'
    }
  },

  // ========== 备货单相关 ==========
  order: {
    orderNumber: '备货单号',
    mainOrderNumber: '主备货单号',
    customerName: '客户名称',
    destinationCountry: '目的国',
    orderStatus: '备货单状态',
    purchaseMode: '采购贸易模式',
    priceTerms: '价格条款',
    totalBoxes: '箱数合计',
    totalVolume: '体积合计',
    totalWeight: '毛重合计',
    totalValue: '出运总价',
    negotiationAmount: '议付金额',
    // 状态
    status: {
      draft: '草稿',
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      cancelled: '已取消'
    }
  },

  // ========== 港口相关 ==========
  port: {
    portCode: '港口代码',
    portName: '港口名称',
    portType: '港口类型',
    eta: '预计到港时间',
    ata: '实际到港时间',
    etd: '预计离港时间',
    atd: '实际离港时间',
    // 港口类型
    types: {
      origin: '起运港',
      transit: '中转港',
      destination: '目的港'
    }
  },

  // ========== 滞港费相关 ==========
  demurrage: {
    chargeType: '费用类型',
    freeDays: '免费天数',
    freeDaysBasis: '免费天数基准',
    calculationBasis: '计算方式',
    chargedAmount: '收费金额',
    currency: '币种',
    billingDate: '计费日期',
    // 计算方式
    basis: {
      byArrival: '按到港',
      byUnloading: '按卸船'
    },
    // 免费天数基准
    freeDaysBasisTypes: {
      naturalDay: '自然日',
      workingDay: '工作日'
    },
    // 费用类型
    chargeTypes: {
      demurrage: '滞港费',
      storage: '堆存费',
      detention: '滞箱费',
      demurrageDetention: '滞港滞箱费',
      storageSurcharge: '堆存附加费'
    }
  },

  // ========== 监控相关 ==========
  monitoring: {
    systemStatus: '系统状态',
    performance: '性能指标',
    realtime: '实时监控',
    history: '历史数据',
    alerts: '告警信息',
    cpuUsage: 'CPU使用率',
    memoryUsage: '内存使用率',
    diskUsage: '磁盘使用率',
    networkTraffic: '网络流量',
    responseTime: '响应时间',
    throughput: '吞吐量',
    uptime: '运行时间',
    health: '健康状态',
    healthy: '健康',
    unhealthy: '异常',
    warning: '警告',
    critical: '严重'
  },

  // ========== 设置相关 ==========
  settings: {
    general: '通用设置',
    language: '语言设置',
    theme: '主题设置',
    notifications: '通知设置',
    security: '安全设置',
    account: '账号设置',
    profile: '个人资料',
    preferences: '偏好设置',
    languageTip: '选择您的首选语言',
    themeTip: '选择界面主题',
    notificationTip: '管理通知偏好',
    securityTip: '管理账号安全设置'
  },

  // ========== 帮助文档 ==========
  help: {
    documentation: '帮助文档',
    quickStart: '快速开始',
    userGuide: '用户指南',
    faq: '常见问题',
    contactSupport: '联系支持',
    searchDoc: '搜索文档',
    noResults: '未找到相关文档',
    recentlyViewed: '最近查看',
    popularTopics: '热门主题'
  },

  // ========== 关于 ==========
  about: {
    aboutUs: '关于我们',
    version: '版本',
    copyright: '版权所有',
    license: '许可证',
    termsOfService: '服务条款',
    privacyPolicy: '隐私政策',
    contactUs: '联系我们',
    website: '官方网站',
    github: 'GitHub仓库'
  },

  // ========== 验证消息 ==========
  validation: {
    required: '此项为必填项',
    email: '请输入有效的邮箱地址',
    phone: '请输入有效的手机号码',
    minLength: '最少需要 {min} 个字符',
    maxLength: '最多允许 {max} 个字符',
    pattern: '格式不正确',
    range: '值必须在 {min} 和 {max} 之间',
    numeric: '请输入有效的数字',
    url: '请输入有效的URL地址'
  },

  // ========== 时间相关 ==========
  time: {
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    lastWeek: '上周',
    thisMonth: '本月',
    lastMonth: '上月',
    thisYear: '今年',
    lastYear: '去年',
    daysAgo: '{days}天前',
    hoursAgo: '{hours}小时前',
    minutesAgo: '{minutes}分钟前',
    justNow: '刚刚',
    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
    timeFormat: 'HH:mm:ss'
  },

  // ========== 错误消息 ==========
  error: {
    networkError: '网络错误，请检查网络连接',
    serverError: '服务器错误，请稍后重试',
    unauthorized: '未授权，请重新登录',
    forbidden: '无权访问',
    notFound: '资源未找到',
    timeout: '请求超时',
    unknown: '未知错误',
    retry: '重试',
    contactAdmin: '请联系管理员'
  }
}

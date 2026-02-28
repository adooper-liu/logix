// 日本語
export default {
  // ========== 共通 ==========
  common: {
    appName: 'LogiX',
    slogan: '複雑な物流をシンプルに',
    logo: 'ロゴ',
    home: 'ホーム',
    back: '戻る',
    confirm: '確認',
    cancel: 'キャンセル',
    save: '保存',
    delete: '削除',
    edit: '編集',
    view: '表示',
    add: '追加',
    search: '検索',
    filter: 'フィルター',
    export: 'エクスポート',
    import: 'インポート',
    refresh: '更新',
    loading: '読み込み中...',
    noData: 'データがありません',
    success: '操作成功',
    error: '操作失敗',
    warning: '警告',
    info: '情報',
    submit: '送信',
    reset: 'リセット',
    close: '閉じる',
    yes: 'はい',
    no: 'いいえ',
    total: '合計 {count} 件',
    page: '{current}/{total} ページ',
    perPage: '{count} 件/ページ',
    operation: '操作',
    remark: '備考',
    createTime: '作成日時',
    updateTime: '更新日時',
    status: 'ステータス',
    actions: '操作',
    detail: '詳細',
    all: 'すべて',
    more: 'もっと見る',
    expand: '展開',
    collapse: '折りたたむ'
  },

  // ========== ナビゲーション ==========
  nav: {
    shipments: '出荷',
    system: 'システム',
    containerManagement: 'コンテナ管理',
    excelImport: 'Excelインポート',
    systemMonitoring: 'システム監視',
    dictMapping: '辞書マッピング',
    settings: '設定',
    help: 'ヘルプ',
    about: 'について',
    personalCenter: '個人センター',
    logout: 'ログアウト'
  },

  // ========== ユーザー ==========
  user: {
    username: 'ユーザー名',
    password: 'パスワード',
    login: 'ログイン',
    logout: 'ログアウト',
    profile: 'プロフィール',
    settings: '設定',
    welcome: 'おかえりなさい、{name}',
    loginSuccess: 'ログイン成功',
    loginFailed: 'ログイン失敗',
    logoutSuccess: 'ログアウト成功',
    pleaseLogin: 'まずログインしてください',
    rememberMe: 'ログイン状態を保持',
    forgotPassword: 'パスワードをお忘れですか？'
  },

  // ========== コンテナ ==========
  container: {
    containerNumber: 'コンテナ番号',
    orderNumber: '注文番号',
    containerType: 'コンテナタイプ',
    cargoDescription: '貨物説明',
    logisticsStatus: '物流ステータス',
    inspectionRequired: '検査が必要',
    isUnboxing: '開梱',
    // 物流ステータス
    status: {
      notShipped: '未出荷',
      shipped: '出荷済み',
      inTransit: '輸送中',
      atPort: '港到着',
      pickedUp: 'ピックアップ済み',
      unloaded: 'アンロード済み',
      returnedEmpty: '空箱返却'
    },
    // コンテナタイプ
    types: {
      '20GP': '20フィート一般用',
      '40GP': '40フィート一般用',
      '40HQ': '40フィートハイキューブ',
      '45HQ': '45フィートハイキューブ',
      '20RF': '20フィート冷凍',
      '40RF': '40フィート冷凍',
      '20OT': '20フィートオープントップ',
      '40OT': '40フィートオープントップ',
      '20FR': '20フィートフラットラック',
      '40FR': '40フィートフラットラック'
    }
  },

  // ========== 注文 ==========
  order: {
    orderNumber: '注文番号',
    mainOrderNumber: 'メイン注文番号',
    customerName: '顧客名',
    destinationCountry: '目的地国',
    orderStatus: '注文ステータス',
    purchaseMode: '購入モード',
    priceTerms: '価格条件',
    totalBoxes: '総箱数',
    totalVolume: '総容量',
    totalWeight: '総重量',
    totalValue: '総額',
    negotiationAmount: '交渉金額',
    // ステータス
    status: {
      draft: '下書き',
      pending: '保留中',
      processing: '処理中',
      completed: '完了',
      cancelled: 'キャンセル'
    }
  },

  // ========== 港 ==========
  port: {
    portCode: '港コード',
    portName: '港名',
    portType: '港タイプ',
    eta: '到着予定時刻',
    ata: '到着時刻',
    etd: '出発予定時刻',
    atd: '出発時刻',
    // 港タイプ
    types: {
      origin: '出発港',
      transit: '中継港',
      destination: '到着港'
    }
  },

  // ========== 滞港料 ==========
  demurrage: {
    chargeType: '料金タイプ',
    freeDays: '無料期間',
    freeDaysBasis: '無料期間基準',
    calculationBasis: '計算基準',
    chargedAmount: '請求金額',
    currency: '通貨',
    billingDate: '請求日',
    // 計算基準
    basis: {
      byArrival: '到着基準',
      byUnloading: '荷卸し基準'
    },
    // 無料期間基準
    freeDaysBasisTypes: {
      naturalDay: '自然日',
      workingDay: '営業日'
    },
    // 料金タイプ
    chargeTypes: {
      demurrage: '滞港料',
      storage: '保管料',
      detention: '滞箱料',
      demurrageDetention: '滞港滞箱料',
      storageSurcharge: '保管追加料'
    }
  },

  // ========== 監視 ==========
  monitoring: {
    systemStatus: 'システムステータス',
    performance: 'パフォーマンス',
    realtime: 'リアルタイム',
    history: '履歴',
    alerts: 'アラート',
    cpuUsage: 'CPU使用率',
    memoryUsage: 'メモリ使用率',
    diskUsage: 'ディスク使用率',
    networkTraffic: 'ネットワークトラフィック',
    responseTime: '応答時間',
    throughput: 'スループット',
    uptime: '稼働時間',
    health: 'ヘルス状態',
    healthy: '正常',
    unhealthy: '異常',
    warning: '警告',
    critical: '深刻'
  },

  // ========== 設定 ==========
  settings: {
    general: '一般設定',
    language: '言語設定',
    theme: 'テーマ設定',
    notifications: '通知設定',
    security: 'セキュリティ設定',
    account: 'アカウント設定',
    profile: 'プロフィール',
    preferences: 'プリファレンス',
    languageTip: '優先言語を選択してください',
    themeTip: 'インターフェースのテーマを選択してください',
    notificationTip: '通知設定を管理します',
    securityTip: 'アカウントセキュリティ設定を管理します'
  },

  // ========== ヘルプ ==========
  help: {
    documentation: 'ドキュメント',
    quickStart: 'クイックスタート',
    userGuide: 'ユーザーガイド',
    faq: 'よくある質問',
    contactSupport: 'サポートに連絡',
    searchDoc: 'ドキュメントを検索',
    noResults: '該当するドキュメントが見つかりません',
    recentlyViewed: '最近表示した項目',
    popularTopics: '人気のトピック'
  },

  // ========== について ==========
  about: {
    aboutUs: '私たちについて',
    version: 'バージョン',
    copyright: '著作権',
    license: 'ライセンス',
    termsOfService: '利用規約',
    privacyPolicy: 'プライバシーポリシー',
    contactUs: 'お問い合わせ',
    website: 'Webサイト',
    github: 'GitHub'
  },

  // ========== バリデーション ==========
  validation: {
    required: 'この項目は必須です',
    email: '有効なメールアドレスを入力してください',
    phone: '有効な電話番号を入力してください',
    minLength: '最低 {min} 文字が必要です',
    maxLength: '最大 {max} 文字まで可能です',
    pattern: '形式が正しくありません',
    range: '値は {min} から {max} の間である必要があります',
    numeric: '有効な数値を入力してください',
    url: '有効なURLを入力してください'
  },

  // ========== 時間 ==========
  time: {
    today: '今日',
    yesterday: '昨日',
    thisWeek: '今週',
    lastWeek: '先週',
    thisMonth: '今月',
    lastMonth: '先月',
    thisYear: '今年',
    lastYear: '去年',
    daysAgo: '{days}日前',
    hoursAgo: '{hours}時間前',
    minutesAgo: '{minutes}分前',
    justNow: 'たった今',
    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
    timeFormat: 'HH:mm:ss'
  },

  // ========== エラー ==========
  error: {
    networkError: 'ネットワークエラー、接続を確認してください',
    serverError: 'サーバーエラー、後でもう一度試してください',
    unauthorized: '認証されていません、再度ログインしてください',
    forbidden: 'アクセスが拒否されました',
    notFound: 'リソースが見つかりません',
    timeout: 'リクエストがタイムアウトしました',
    unknown: '不明なエラー',
    retry: '再試行',
    contactAdmin: '管理者に連絡してください'
  }
}

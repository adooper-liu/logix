import * as Sentry from '@sentry/vue'

export function initSentry(app: any) {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  // Only initialize if DSN is provided
  if (!dsn) {
    console.log('[Sentry] Sentry DSN 未配置，跳过初始化')
    return
  }

  Sentry.init({
    app,
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: 1.0,
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Environment
    environment: import.meta.env.MODE,
    // Release tracking
    release: `logix@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    // Ignore common errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
  })

  console.log('[Sentry] Sentry 已初始化')
}

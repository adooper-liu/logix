/// <reference types="vite/client" />

declare module 'vue' {
  interface ComponentCustomProperties {
    $dateTime: import('@/utils/dateTimeUtils').DateTimeUtils
  }
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

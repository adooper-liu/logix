/// <reference types="vite/client" />

// 必须挂到 @vue/runtime-core，勿 declare module 'vue'（会覆盖 vue 的全部导出，导致 ref/computed 等报 TS2305）
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $dateTime: import('@/utils/dateTimeUtils').DateTimeUtils
  }
}

export {}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

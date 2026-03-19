/**
 * 日期时间规格机插件
 * 提供全局 $dateTime 和 inject('dateTime')
 *
 * @see public/docs-temp/日期时间规格机实施方案.md
 */

import type { App } from 'vue'
import { DateTimeUtils } from '@/utils/dateTimeUtils'

export default {
  install(app: App) {
    app.config.globalProperties.$dateTime = DateTimeUtils
    app.provide('dateTime', DateTimeUtils)
  }
}

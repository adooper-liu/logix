/**
 * 日期时间处理工具
 * 统一服务端与前端的日期时间处理逻辑，避免时区问题
 *
 * 日期时间规格机：提供 UTC 与本地时区转换
 * @see public/docs-temp/日期时间规格机实施方案.md
 */

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 日期时间规格机 - 前端核心类
 * API 接收 UTC，展示时转换为用户本地时区
 */
export class DateTimeUtils {
  /** 默认显示格式 */
  static readonly DEFAULT_FORMAT = 'YYYY-MM-DD HH:mm:ss'

  /** ISO 8601 格式 */
  static readonly ISO_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ'

  /**
   * 转换为 UTC 时间
   */
  static toUTC(date: Date | string): Date {
    return dayjs(date).utc().toDate()
  }

  /**
   * 转换为本地时间
   */
  static toLocal(utcDate: Date | string): Date {
    return dayjs(utcDate).local().toDate()
  }

  /**
   * 格式化日期时间（本地时区显示）
   */
  static format(date: Date | string, format: string = DateTimeUtils.DEFAULT_FORMAT): string {
    return dayjs(date).local().format(format)
  }

  /**
   * 解析日期时间字符串
   */
  static parse(dateString: string): Date {
    return dayjs(dateString).toDate()
  }

  /**
   * 获取当前时间（UTC）
   */
  static now(): Date {
    return dayjs().utc().toDate()
  }
}

/**
 * 解析日期时间字符串为本地日期对象，避免时区转换问题
 * @param dateStr 日期时间字符串，支持多种格式
 * @returns 解析后的日期对象
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date()

  // 规范化日期字符串格式
  const normalizedStr = String(dateStr).trim().replace(/\//g, '-')

  // 匹配 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss 格式
  const parts = normalizedStr.split(/[\s-:T]/)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1 // JavaScript月份从0开始
  const day = parseInt(parts[2], 10)
  const hour = parts[3] ? parseInt(parts[3], 10) : 0
  const minute = parts[4] ? parseInt(parts[4], 10) : 0
  const second = parts[5] ? parseInt(parts[5], 10) : 0

  return new Date(year, month, day, hour, minute, second)
}

/**
 * 格式化日期对象为本地时间字符串
 * @param date 日期对象
 * @param format 格式类型
 * @returns 格式化后的字符串
 */
export const formatDateToLocal = (
  date: Date | string,
  format: 'full' | 'date' | 'time' | 'datetime' = 'datetime'
): string => {
  const d = typeof date === 'string' ? parseLocalDate(date) : date

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  switch (format) {
    case 'full':
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    case 'date':
      return `${year}-${month}-${day}`
    case 'time':
      return `${hour}:${minute}:${second}`
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hour}:${minute}`
  }
}

/**
 * 解析Excel中的日期数字为本地日期对象
 * @param value Excel日期数字
 * @returns 解析后的日期对象
 */
export const parseExcelDate = (value: number): Date | null => {
  if (!value) return null

  // Excel日期从1900年1月1日开始，转换为JavaScript日期
  const date = new Date((value - 25569) * 86400 * 1000)
  return isNaN(date.getTime()) ? null : date
}

/**
 * 日期对象转为ISO字符串，但保持本地时间
 * @param date 日期对象
 * @returns ISO格式的字符串
 */
export const toLocalISOString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

/**
 * 添加指定天数到日期
 * @param date 基础日期
 * @param days 要添加的天数
 * @returns 新的日期对象
 */
export const addDays = (date: Date | string, days: number): Date => {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * 计算两个日期之间的天数差
 * @param start 开始日期
 * @param end 结束日期
 * @returns 天数差
 */
export const daysBetween = (start: Date | string, end: Date | string): number => {
  const startDate = typeof start === 'string' ? parseLocalDate(start) : start
  const endDate = typeof end === 'string' ? parseLocalDate(end) : end

  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)
}

/**
 * 获取当天开始时间（00:00:00）
 * @param date 日期对象
 * @returns 当天开始时间
 */
export const getDayStart = (date: Date | string = new Date()): Date => {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 获取当天结束时间（23:59:59）
 * @param date 日期对象
 * @returns 当天结束时间
 */
export const getDayEnd = (date: Date | string = new Date()): Date => {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * 比较两个日期是否为同一天
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 是否为同一天
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? parseLocalDate(date1) : date1
  const d2 = typeof date2 === 'string' ? parseLocalDate(date2) : date2

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * 检查日期是否在指定范围内
 * @param date 要检查的日期
 * @param start 开始日期
 * @param end 结束日期
 * @returns 是否在范围内
 */
export const isDateInRange = (
  date: Date | string,
  start: Date | string,
  end: Date | string
): boolean => {
  const d = typeof date === 'string' ? parseLocalDate(date) : date
  const startDate = typeof start === 'string' ? parseLocalDate(start) : start
  const endDate = typeof end === 'string' ? parseLocalDate(end) : end

  return d >= startDate && d <= endDate
}

export default {
  DateTimeUtils,
  parseLocalDate,
  formatDateToLocal,
  parseExcelDate,
  toLocalISOString,
  addDays,
  daysBetween,
  getDayStart,
  getDayEnd,
  isSameDay,
  isDateInRange,
}

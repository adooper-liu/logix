import axios from 'axios'
import { ElMessage } from 'element-plus'

export const isCanceledRequestError = (error: unknown): boolean => {
  if (axios.isCancel(error)) return true
  const message = String((error as any)?.message || '')
  if (message.includes('[RequestDedup]')) return true
  if (message.toLowerCase() === 'cancel') return true
  return false
}

export const notifyErrorUnlessCanceled = (error: unknown, message: string): void => {
  if (isCanceledRequestError(error)) return
  const detail = (error as any)?.message
  ElMessage.error(detail ? `${message}: ${detail}` : message)
}

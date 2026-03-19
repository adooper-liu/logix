/**
 * 日期时间规格机中间件
 * 统一 API 请求/响应中的日期时间格式
 *
 * - 请求体：将 ISO 8601 字符串解析为 Date
 * - 响应体：将 Date 对象序列化为 ISO 8601 字符串
 *
 * @see public/docs-temp/日期时间规格机实施方案.md
 */

import type { Request, Response, NextFunction } from 'express';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;

/**
 * 递归处理对象，将 Date 转为 ISO 字符串
 */
function serializeDates(obj: unknown): unknown {
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeDates);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result;
  }
  return obj;
}

/**
 * 递归处理请求体，将 ISO 日期字符串解析为 Date
 */
function parseDatesInBody(obj: unknown): unknown {
  if (typeof obj === 'string' && ISO_DATE_REGEX.test(obj)) {
    return new Date(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(parseDatesInBody);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = parseDatesInBody(value);
    }
    return result;
  }
  return obj;
}

/**
 * 日期时间处理中间件
 * 可选启用：在 app.ts 中通过 app.use(dateTimeMiddleware) 引入
 */
export function dateTimeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = parseDatesInBody(req.body) as Record<string, unknown>;
  }
  next();
}

/**
 * 响应 JSON 包装器：确保 Date 对象序列化为 ISO 字符串
 * 在需要时手动调用，或通过 res.json 拦截使用
 */
export function dateTimeResponseMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown): Response {
    return originalJson(serializeDates(body));
  };
  next();
}

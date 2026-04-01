/**
 * 全局国家过滤中间件
 * 从请求头 X-Country-Code 读取当前生效国家，写入请求上下文，供查询层统一施加过滤。
 * 后续与帐号权限绑定时可改为从 Session/JWT 取允许国家并写入同一上下文。
 */

import { Request, Response, NextFunction } from 'express';
import { runWithScope } from '../utils/requestContext.js';
import { normalizeCountryCode } from '../utils/countryCode.js';

const HEADER_COUNTRY = 'x-country-code';

export function scopedCountryMiddleware(req: Request, res: Response, next: NextFunction): void {
  const raw = req.get(HEADER_COUNTRY);
  const countryCode =
    typeof raw === 'string' && raw.trim() !== '' ? normalizeCountryCode(raw.trim()) : undefined;

  runWithScope({ countryCode }, () => next());
}

/**
 * 请求作用域上下文（全局过滤：国家等）
 * 用于「按国家全局过滤」与后续「帐号国家权限」：中间件设值，查询层统一读取，无需逐接口传参。
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface RequestScope {
  /** 当前请求生效的国家代码（来自 Header X-Country-Code 或后续 Session/权限） */
  countryCode?: string;
}

const requestStorage = new AsyncLocalStorage<RequestScope>();

/**
 * 在当前请求上下文中执行 fn，期间 getScopedCountryCode() 返回传入的 countryCode
 */
export function runWithScope<T>(scope: RequestScope, fn: () => T): T {
  return requestStorage.run(scope, fn);
}

/**
 * 获取当前请求作用域内的国家代码（未设或未在 runWithScope 内则返回 undefined）
 */
export function getScopedCountryCode(): string | undefined {
  const scope = requestStorage.getStore();
  const code = scope?.countryCode;
  if (code === undefined || code === null) return undefined;
  const s = String(code).trim();
  return s === '' ? undefined : s;
}

export { requestStorage };

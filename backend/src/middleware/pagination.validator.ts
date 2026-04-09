/**
 * 分页参数验证中间件
 *
 * 为所有列表接口添加 pageSize 上限,防止超大页请求打穿数据库和内存
 */

import { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * 默认最大页大小
 * - 普通列表: 100
 * - 统计/导出: 500
 * - 字典/配置: 200
 */
const DEFAULT_MAX_PAGE_SIZE = 100;

/**
 * 不同「路由挂载点」的 pageSize 上限（与 Express req.baseUrl 对齐）
 *
 * 说明：主应用 `app.use(apiPrefix, routes)` 后，子路由上的中间件里
 * `req.path` 多为 `/` 或资源子路径（如 `/ports`），不能用来拼完整 API 路径。
 * 应使用已包含 API 前缀的 `req.baseUrl`，再去掉 `config.apiPrefix` 得到路由挂载键（如 `/dict-manage`）。
 */
const PAGE_SIZE_LIMITS_BY_MOUNT: Record<string, number> = {
  '/containers': 100,
  '/customers': 100,
  '/external': 100,
  '/dict-manage': 200,
  '/trucking-port-mapping': 200,
  '/warehouse-trucking-mapping': 200
};

function mountKeyFromRequest(req: Request): string {
  const base = req.baseUrl || '';
  const prefix = config.apiPrefix;
  if (!base.startsWith(prefix)) {
    return base;
  }
  const rest = base.slice(prefix.length);
  if (!rest || rest === '') {
    return '/';
  }
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/**
 * 获取当前请求对应的 pageSize 上限
 */
function getMaxPageSize(req: Request): number {
  const mountKey = mountKeyFromRequest(req);

  if (PAGE_SIZE_LIMITS_BY_MOUNT[mountKey]) {
    return PAGE_SIZE_LIMITS_BY_MOUNT[mountKey];
  }

  let bestLen = 0;
  let limit = DEFAULT_MAX_PAGE_SIZE;
  for (const [prefix, prefLimit] of Object.entries(PAGE_SIZE_LIMITS_BY_MOUNT)) {
    if (mountKey.startsWith(prefix) && prefix.length > bestLen) {
      bestLen = prefix.length;
      limit = prefLimit;
    }
  }
  if (bestLen > 0) {
    return limit;
  }

  return DEFAULT_MAX_PAGE_SIZE;
}

/**
 * 分页参数验证中间件
 *
 * 功能:
 * 1. 限制 pageSize 最大值
 * 2. 确保 page >= 1
 * 3. 记录超限请求日志
 */
export function paginationValidator(req: Request, res: Response, next: NextFunction): void {
  const { page, pageSize } = req.query;

  // 如果没有分页参数,直接放行
  if (page === undefined && pageSize === undefined) {
    next();
    return;
  }

  const maxPageSize = getMaxPageSize(req);

  // 验证并修正 page
  let pageNum = Number(page);
  if (Number.isNaN(pageNum) || pageNum < 1) {
    pageNum = 1;
    req.query.page = '1';
  }

  // 验证并修正 pageSize
  let pageSizeNum = Number(pageSize);
  if (Number.isNaN(pageSizeNum) || pageSizeNum < 1) {
    pageSizeNum = 10; // 默认值
    req.query.pageSize = '10';
  } else if (pageSizeNum > maxPageSize) {
    // 记录超限请求
    logger.warn('PaginationValidator: pageSize 超限', {
      baseUrl: req.baseUrl,
      path: req.path,
      requested: pageSizeNum,
      limited: maxPageSize,
      ip: req.ip
    });

    // 强制限制
    pageSizeNum = maxPageSize;
    req.query.pageSize = String(maxPageSize);
  }

  next();
}

/**
 * 创建针对特定路径的分页验证器
 *
 * @param maxPageSize - 最大页大小
 * @returns Express 中间件
 */
export function createPaginationValidator(maxPageSize: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { page, pageSize } = req.query;

    if (page === undefined && pageSize === undefined) {
      next();
      return;
    }

    let pageNum = Number(page);
    if (Number.isNaN(pageNum) || pageNum < 1) {
      pageNum = 1;
      req.query.page = '1';
    }

    let pageSizeNum = Number(pageSize);
    if (Number.isNaN(pageSizeNum) || pageSizeNum < 1) {
      pageSizeNum = 10;
      req.query.pageSize = '10';
    } else if (pageSizeNum > maxPageSize) {
      logger.warn('PaginationValidator: pageSize 超限', {
        baseUrl: req.baseUrl,
        path: req.path,
        requested: pageSizeNum,
        limited: maxPageSize,
        ip: req.ip
      });

      pageSizeNum = maxPageSize;
      req.query.pageSize = String(maxPageSize);
    }

    next();
  };
}

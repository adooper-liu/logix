/**
 * 分页验证中间件单元测试
 * 
 * 测试 mountKeyFromRequest 和 getMaxPageSize 逻辑
 */

import { Request } from 'express';

// 模拟 config
const mockConfig = {
  apiPrefix: '/api/v1'
};

// 复制中间件的核心逻辑进行测试
const DEFAULT_MAX_PAGE_SIZE = 100;

const PAGE_SIZE_LIMITS_BY_MOUNT: Record<string, number> = {
  '/containers': 100,
  '/customers': 100,
  '/external': 100,
  '/dict-manage': 200,
  '/trucking-port-mapping': 200,
  '/warehouse-trucking-mapping': 200
};

function mountKeyFromRequest(req: Partial<Request>): string {
  const base = req.baseUrl || '';
  const prefix = mockConfig.apiPrefix;
  if (!base.startsWith(prefix)) {
    return base;
  }
  const rest = base.slice(prefix.length);
  if (!rest || rest === '') {
    return '/';
  }
  return rest.startsWith('/') ? rest : `/${rest}`;
}

function getMaxPageSize(req: Partial<Request>): number {
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

describe('Pagination Validator - mountKeyFromRequest', () => {
  it('should extract correct mount key for /containers route', () => {
    const req = { baseUrl: '/api/v1/containers' };
    expect(mountKeyFromRequest(req)).toBe('/containers');
  });

  it('should extract correct mount key for /dict-manage route', () => {
    const req = { baseUrl: '/api/v1/dict-manage' };
    expect(mountKeyFromRequest(req)).toBe('/dict-manage');
  });

  it('should handle root path correctly', () => {
    const req = { baseUrl: '/api/v1' };
    expect(mountKeyFromRequest(req)).toBe('/');
  });

  it('should handle empty baseUrl', () => {
    const req = { baseUrl: '' };
    expect(mountKeyFromRequest(req)).toBe('');
  });

  it('should handle baseUrl without prefix', () => {
    const req = { baseUrl: '/other/path' };
    expect(mountKeyFromRequest(req)).toBe('/other/path');
  });

  it('should handle nested sub-routes', () => {
    const req = { baseUrl: '/api/v1/containers/statistics' };
    expect(mountKeyFromRequest(req)).toBe('/containers/statistics');
  });
});

describe('Pagination Validator - getMaxPageSize', () => {
  it('should return 100 for /containers', () => {
    const req = { baseUrl: '/api/v1/containers' };
    expect(getMaxPageSize(req)).toBe(100);
  });

  it('should return 100 for /customers', () => {
    const req = { baseUrl: '/api/v1/customers' };
    expect(getMaxPageSize(req)).toBe(100);
  });

  it('should return 100 for /external', () => {
    const req = { baseUrl: '/api/v1/external' };
    expect(getMaxPageSize(req)).toBe(100);
  });

  it('should return 200 for /dict-manage', () => {
    const req = { baseUrl: '/api/v1/dict-manage' };
    expect(getMaxPageSize(req)).toBe(200);
  });

  it('should return 200 for /trucking-port-mapping', () => {
    const req = { baseUrl: '/api/v1/trucking-port-mapping' };
    expect(getMaxPageSize(req)).toBe(200);
  });

  it('should return 200 for /warehouse-trucking-mapping', () => {
    const req = { baseUrl: '/api/v1/warehouse-trucking-mapping' };
    expect(getMaxPageSize(req)).toBe(200);
  });

  it('should return default 100 for unknown routes', () => {
    const req = { baseUrl: '/api/v1/unknown' };
    expect(getMaxPageSize(req)).toBe(100);
  });

  it('should return default 100 for root path', () => {
    const req = { baseUrl: '/api/v1' };
    expect(getMaxPageSize(req)).toBe(100);
  });

  it('should use prefix matching for nested routes', () => {
    // /containers/statistics 应该匹配 /containers 的规则
    const req = { baseUrl: '/api/v1/containers/statistics' };
    expect(getMaxPageSize(req)).toBe(100);
  });

  it('should prefer longer prefix match', () => {
    // 如果有更长的前缀匹配,应该使用更具体的规则
    const req = { baseUrl: '/api/v1/dict-manage/something' };
    expect(getMaxPageSize(req)).toBe(200);
  });
});

describe('Pagination Validator - Edge Cases', () => {
  it('should handle undefined baseUrl', () => {
    const req = { baseUrl: undefined };
    expect(mountKeyFromRequest(req)).toBe('');
    expect(getMaxPageSize(req)).toBe(100);
  });

  it('should handle trailing slashes', () => {
    const req = { baseUrl: '/api/v1/containers/' };
    // 注意: Express 通常会规范化路径,但这里测试边界情况
    expect(mountKeyFromRequest(req)).toBe('/containers/');
  });

  it('should handle multiple levels of nesting', () => {
    const req = { baseUrl: '/api/v1/dict-manage/sub/deep' };
    expect(mountKeyFromRequest(req)).toBe('/dict-manage/sub/deep');
    expect(getMaxPageSize(req)).toBe(200); // 应该匹配 /dict-manage
  });
});

/**
 * CacheService 单元测试
 */

import { CacheService } from './CacheService';
import { redisClient } from '../database/redis';

// Mock Redis
jest.mock('../database/redis', () => ({
  redisClient: {
    get: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    exists: jest.fn()
  },
  cachePrefix: 'logix:'
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  const mockRedis = redisClient as jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    cacheService = new CacheService();
    jest.clearAllMocks();
  });

  describe('get<T>', () => {
    it('should retrieve and parse cached data', async () => {
      const mockData = { value: 123, name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await cacheService.get('test:key');

      expect(mockRedis.get).toHaveBeenCalledWith('logix:test:key');
      expect(result).toEqual(mockData);
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle JSON parse error gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await cacheService.get('invalid');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.get('error');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache data with default TTL (3600s)', async () => {
      const testData = { id: 1, data: 'test' };
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('test:key', testData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'logix:test:key',
        3600,
        JSON.stringify(testData)
      );
    });

    it('should cache data with custom TTL', async () => {
      const testData = { id: 2 };
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('custom:ttl', testData, 7200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'logix:custom:ttl',
        7200,
        JSON.stringify(testData)
      );
    });

    it('should not throw on Redis error', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis failed'));

      await expect(cacheService.set('fail', { test: 1 })).resolves.toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('should delete keys matching pattern', async () => {
      mockRedis.keys.mockResolvedValue(['logix:test:1', 'logix:test:2']);
      mockRedis.del.mockResolvedValue(2);

      await cacheService.invalidate('test:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('logix:test:*');
      expect(mockRedis.del).toHaveBeenCalledWith('logix:test:1', 'logix:test:2');
    });

    it('should handle no matching keys', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await cacheService.invalidate('empty:*');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should not throw on Redis error', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis failed'));

      await expect(cacheService.invalidate('error:*')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('existing');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.exists('missing');

      expect(result).toBe(false);
    });
  });

  describe('getOrDefault', () => {
    it('should return cached value when exists', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ cached: true }));

      const result = await cacheService.getOrDefault('key', { default: false });

      expect(result).toEqual({ cached: true });
    });

    it('should return default value when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.getOrDefault('missing', { default: 'value' });

      expect(result).toEqual({ default: 'value' });
    });
  });

  describe('setWithOptions', () => {
    it('should use prefix from options', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.setWithOptions(
        'key',
        { data: 1 },
        { prefix: 'custom', ttl: 1800 }
      );

      // CacheService 会自动添加 cachePrefix，所以实际 key 是 "logix:custom:key"
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'logix:custom:key',
        1800,
        JSON.stringify({ data: 1 })
      );
    });

    it('should handle empty prefix', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.setWithOptions(
        'simplekey',
        { value: 'test' },
        { prefix: '', ttl: 600 }
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'logix:simplekey',
        600,
        JSON.stringify({ value: 'test' })
      );
    });
  });
});

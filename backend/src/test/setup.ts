// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_DATABASE = 'logix_test';
process.env.DB_POOL_MIN = '2';
process.env.DB_POOL_MAX = '10';
process.env.DB_SYNCHRONIZE = 'false';

// Mock AppDataSource
jest.mock('../database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockImplementation((_entity) => {
      // 为不同的实体返回不同的 mock 对象
      const baseRepo = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockReturnValue({}),
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            {
              containerNumber: 'TEST_LIVE_001',
              scheduleStatus: 'initial',
              portOperations: [
                {
                  portType: 'destination',
                  portCode: 'CA_VAN',
                  portName: 'CA_VAN Port',
                  etaDestPort: '2026-03-20',
                  ataDestPort: '2026-03-20',
                  lastFreeDate: '2026-03-20'
                }
              ],
              replenishmentOrders: [
                {
                  customer: {
                    country: 'CA'
                  }
                }
              ]
            }
          ])
        })
      };
      return baseRepo;
    }),
    manager: {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback({});
      })
    },
    options: {
      namingStrategy: {
        columnName: jest.fn().mockReturnValue('test_column')
      }
    }
  },
  initDatabase: jest.fn().mockResolvedValue(undefined),
  closeDatabase: jest.fn().mockResolvedValue(undefined)
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock Redis to avoid real ioredis connection & open handles
jest.mock('../database/redis', () => ({
  redisClient: {
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(0),
    quit: jest.fn().mockResolvedValue(undefined)
  },
  cachePrefix: 'logix:'
}));

// Mock countryCode utility
jest.mock('../utils/countryCode', () => ({
  isValidCountryCode: jest.fn().mockReturnValue(true),
  getCountryCode: jest.fn().mockReturnValue('US')
}));

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  default: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} })
  }
}));

// Global test setup
global.beforeEach(() => {
  jest.clearAllMocks();
});

global.afterEach(() => {
  jest.resetAllMocks();
});

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
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
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
    debug: jest.fn()
  }
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
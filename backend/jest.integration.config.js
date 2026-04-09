/**
 * Jest Integration Test Configuration
 * 专门用于运行 backend/tests/integration 下的集成测试
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // 使用 dotenv/config + DOTENV_CONFIG_PATH 加载 .env.test
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1'
  },
  // 集成测试不需要 setupFilesAfterEnv（避免与单元测试冲突）
  // 明确指定只运行 tests/integration 目录下的测试
  testMatch: ['**/tests/integration/**/*.test.ts'],
  // 不忽略 tests 目录
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // 集成测试通常较慢，增加超时时间
  testTimeout: 30000,
  // 串行执行，避免数据库竞争
  maxWorkers: 1,
  //  verbose 输出便于调试
  verbose: true
};

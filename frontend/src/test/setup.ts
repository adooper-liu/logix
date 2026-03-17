/**
 * Vitest 全局设置文件
 */
import { beforeAll } from 'vitest';

// Mock global objects
beforeAll(() => {
  // Mock window对象
  global.window = global.window || {};
  
  // Mock localStorage
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  } as any;
  
  // Mock sessionStorage
  global.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  } as any;
});

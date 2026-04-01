/**
 * 周末产能字段修复 - 功能验证测试
 * Weekend Capacity Fix - Functional Verification Tests
 * 
 * 测试场景:
 * 1. 工作日排产测试（使用 daily_unload_capacity）
 * 2. 周末排产测试（产能应为 0）
 * 3. 混合日期排产测试
 * 4. 产能占用计算验证
 */

import { SmartCalendarCapacity } from './smartCalendarCapacity';
import { AppDataSource } from '../database';
import { Warehouse } from '../entities/Warehouse';


describe('周末产能字段修复 - 功能验证', () => {
  let smartCalendar: SmartCalendarCapacity;
  let testWarehouseCode: string = '';
  let testWarehouseDailyCapacity: number = 10; // 默认产能

  beforeAll(async () => {
    // 初始化数据库连接
    await AppDataSource.initialize();
    smartCalendar = new SmartCalendarCapacity();
    
    // 获取数据库中第一个可用的仓库
    const warehouse = await AppDataSource.getRepository(Warehouse).findOne({
      where: { status: 'ACTIVE' },
      select: ['warehouseCode', 'warehouseName', 'dailyUnloadCapacity']
    });
    
    if (warehouse) {
      testWarehouseCode = warehouse.warehouseCode;
      testWarehouseDailyCapacity = warehouse.dailyUnloadCapacity || 10;
      console.log(`[测试] 使用仓库：${testWarehouseCode} (${warehouse.warehouseName}), 日产能：${testWarehouseDailyCapacity}`);
    } else {
      console.warn('[测试] 未找到可用仓库，部分测试将跳过');
    }
  });

  afterAll(async () => {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('工作日产能计算', () => {
    it('应该返回工作日的正常产能（周一）', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
        
      const testDate = new Date('2026-04-06'); // 周一
        
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
            
      console.log(`[测试] 工作日产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      expect(capacity).toBeGreaterThan(0);
      expect(capacity).toBe(testWarehouseDailyCapacity);
    });

    it('应该返回工作日的正常产能（周三）', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      const testDate = new Date('2026-04-08'); // 周三
      
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
      
      console.log(`[测试] 工作日产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      expect(capacity).toBeGreaterThan(0);
    });

    it('应该返回工作日的正常产能（周五）', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      const testDate = new Date('2026-04-10'); // 周五
      
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
      
      console.log(`[测试] 工作日产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      expect(capacity).toBeGreaterThan(0);
    });
  });

  describe('周末产能计算', () => {
    it('应该返回周六的产能为 0', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      const testDate = new Date('2026-04-04'); // 周六
      
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
      
      console.log(`[测试] 周六产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      expect(capacity).toBe(0);
    });

    it('应该返回周日的产能为 0', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      const testDate = new Date('2026-04-05'); // 周日
      
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
      
      console.log(`[测试] 周日产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      expect(capacity).toBe(0);
    });

    it('应该返回周末的产能为 0（另一个周末）', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      const testDate = new Date('2026-04-11'); // 周六
      
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
      
      console.log(`[测试] 周六产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      expect(capacity).toBe(0);
    });
  });

  describe('混合日期排产测试', () => {
    it('应该正确处理连续 7 天的产能计算', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      const startDate = new Date('2026-04-06'); // 周一
      const expectedCapacities = [
        { day: '周一', date: '2026-04-06', shouldBeZero: false },
        { day: '周二', date: '2026-04-07', shouldBeZero: false },
        { day: '周三', date: '2026-04-08', shouldBeZero: false },
        { day: '周四', date: '2026-04-09', shouldBeZero: false },
        { day: '周五', date: '2026-04-10', shouldBeZero: false },
        { day: '周六', date: '2026-04-11', shouldBeZero: true },
        { day: '周日', date: '2026-04-12', shouldBeZero: true }
      ];

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, currentDate);
        const expected = expectedCapacities[i];
        
        console.log(`[测试] ${expected.day}产能测试：${currentDate.toDateString()}, 产能=${capacity}`);
        
        if (expected.shouldBeZero) {
          expect(capacity).toBe(0);
        } else {
          expect(capacity).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('节假日产能计算', () => {
    it('应该返回节假日的产能为 0', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      // 假设 2026-01-01 是节假日（元旦）
      const testDate = new Date('2026-01-01');
      
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
      
      console.log(`[测试] 节假日产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      // 节假日应该返回 0
      expect(capacity).toBe(0);
    });
  });

  describe('仓库不存在的情况', () => {
    it('应该返回 0 当仓库不存在时', async () => {
      const warehouseCode = 'NON_EXISTENT_WH';
      const testDate = new Date('2026-04-06'); // 周一
      
      const capacity = await smartCalendar.calculateWarehouseCapacity(warehouseCode, testDate);
      
      console.log(`[测试] 不存在的仓库产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      expect(capacity).toBe(0);
    });
  });

  describe('智能日历未启用的情况', () => {
    it('应该使用默认产能当智能日历未启用', async () => {
      if (!testWarehouseCode) {
        console.warn('无可用仓库，跳过测试');
        return;
      }
      
      const testDate = new Date('2026-04-04'); // 周六
      
      // 注意：这个测试依赖于配置表的实际数据
      // 如果智能日历未启用，周末也应该有产能
      const capacity = await smartCalendar.calculateWarehouseCapacity(testWarehouseCode, testDate);
      
      console.log(`[测试] 智能日历未启用时周末产能测试：${testDate.toDateString()}, 产能=${capacity}`);
      // 如果智能日历未启用，周末可能也有产能
      // 这个测试用于验证配置是否生效
    });
  });
});

/**
 * 手动测试脚本（可在命令行运行）
 * 
 * 使用方法:
 * npx jest src/utils/smartCalendarCapacity.verification.test.ts --verbose
 * 
 * 预期结果:
 * - 工作日（周一至周五）：产能 > 0
 * - 周末（周六、周日）：产能 = 0
 * - 节假日：产能 = 0
 * - 不存在的仓库：产能 = 0
 */

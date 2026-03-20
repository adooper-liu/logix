/**
 * 智能日历能力测试脚本
 * Test Smart Calendar Capacity
 */

import { smartCalendarCapacity } from '../src/utils/smartCalendarCapacity';

async function testSmartCalendar() {
  console.log('🚀 Testing Smart Calendar Capacity');
  console.log('================================');
  
  try {
    // 1. 测试配置读取
    console.log('\n1. Testing calendar config...');
    const config = await smartCalendarCapacity.getCalendarConfig();
    console.log(`   Enabled: ${config.enabled}`);
    console.log(`   Weekend days: ${config.weekendDays}`);
    console.log(`   Weekday multiplier: ${config.weekdayMultiplier}`);
    
    // 2. 测试周末判断
    console.log('\n2. Testing rest day detection...');
    const testDates = [
      new Date('2026-03-21'), // 周六
      new Date('2026-03-22'), // 周日
      new Date('2026-03-18'), // 周三
      new Date('2026-03-19'), // 周四
    ];
    
    for (const date of testDates) {
      const isRest = await smartCalendarCapacity.isRestDay(date);
      console.log(`   ${date.toISOString().split('T')[0]} (${getDayName(date)}) is rest day: ${isRest}`);
    }
    
    // 3. 测试能力计算
    console.log('\n3. Testing capacity calculation...');
    
    // 测试仓库能力
    const warehouseCapacity = await smartCalendarCapacity.calculateWarehouseCapacity(
      'WH001',
      new Date('2026-03-18') // 周三
    );
    console.log(`   Warehouse WH001 capacity on 2026-03-18 (Wednesday): ${warehouseCapacity}`);
    
    // 测试周末仓库能力
    const warehouseCapacityWeekend = await smartCalendarCapacity.calculateWarehouseCapacity(
      'WH001',
      new Date('2026-03-21') // 周六
    );
    console.log(`   Warehouse WH001 capacity on 2026-03-21 (Saturday): ${warehouseCapacityWeekend}`);
    
    // 4. 测试档期记录创建
    console.log('\n4. Testing occupancy creation...');
    
    // 测试仓库档期
    const warehouseOccupancy = await smartCalendarCapacity.ensureWarehouseOccupancy(
      'WH001',
      new Date('2026-03-18') // 周三
    );
    console.log(`   Warehouse WH001 occupancy on 2026-03-18:`);
    console.log(`   - Capacity: ${warehouseOccupancy.capacity}`);
    console.log(`   - Planned count: ${warehouseOccupancy.plannedCount}`);
    console.log(`   - Remaining: ${warehouseOccupancy.remaining}`);
    
    // 5. 测试手动覆盖
    console.log('\n5. Testing manual capacity override...');
    
    // 手动设置能力
    await smartCalendarCapacity.setManualCapacity(
      'warehouse',
      'WH001',
      new Date('2026-12-25'), // 圣诞节
      5 // 特殊能力
    );
    console.log('   Manually set warehouse WH001 capacity on 2026-12-25 to 5');
    
    // 验证手动设置
    const manualOccupancy = await smartCalendarCapacity.ensureWarehouseOccupancy(
      'WH001',
      new Date('2026-12-25')
    );
    console.log(`   Verified manual capacity: ${manualOccupancy.capacity}`);
    
    // 6. 测试批量初始化
    console.log('\n6. Testing future occupancy initialization...');
    await smartCalendarCapacity.initializeFutureOccupancy(7); // 初始化未来 7 天
    console.log('   Initialized future 7 days occupancy');
    
    console.log('\n✅ Smart calendar capacity tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

testSmartCalendar();

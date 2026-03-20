/**
 * Phase 3 测试脚本
 * 测试智能排柜优化系统的核心功能
 */

import { SchedulingCostOptimizerService } from '../src/services/schedulingCostOptimizer.service';
import { Container } from '../src/entities/Container';

// 模拟容器数据
const mockContainer: Container = {
  containerNumber: 'TEST1234567',
  countryCode: 'US',
  portCode: 'LAX',
  status: 'ARRIVED'
} as any;

// 模拟日期
const today = new Date();
const pickupDate = new Date(today);
pickupDate.setDate(today.getDate() + 1);
const lastFreeDate = new Date(today);
lastFreeDate.setDate(today.getDate() + 7);

async function testPhase3() {
  console.log('🚀 Testing Phase 3: Intelligent Container Scheduling System');
  console.log('========================================');
  
  const service = new SchedulingCostOptimizerService();
  
  try {
    // 1. 测试仓库档期查询
    console.log('\n1. Testing warehouse availability...');
    const mockWarehouse = {
      warehouseCode: 'WH001',
      warehouseName: 'Test Warehouse',
      propertyType: 'OWNED',
      country: 'US',
      status: 'ACTIVE',
      dailyUnloadCapacity: 10
    } as any;
    
    const isAvailable = await service['isWarehouseAvailable'](mockWarehouse, pickupDate);
    console.log(`   Warehouse WH001 availability: ${isAvailable}`);
    
    // 2. 测试 Drop off 方案生成
    console.log('\n2. Testing Drop off options generation...');
    const dropOffOptions = await service['generateDropOffOptions'](
      mockContainer,
      pickupDate,
      lastFreeDate
    );
    console.log(`   Generated ${dropOffOptions.length} Drop off options`);
    
    // 3. 测试 Expedited 方案生成
    console.log('\n3. Testing Expedited options generation...');
    const expeditedOptions = await service['generateExpeditedOptions'](
      mockContainer,
      lastFreeDate
    );
    console.log(`   Generated ${expeditedOptions.length} Expedited options`);
    
    // 4. 测试运输费估算
    console.log('\n4. Testing transportation cost calculation...');
    const mockWarehouseForTransport = {
      warehouseCode: 'WH001',
      warehouseName: 'Test Warehouse',
      propertyType: 'OWNED',
      country: 'US',
      status: 'ACTIVE',
      dailyUnloadCapacity: 10
    } as any;
    
    const directCost = await service['calculateTransportationCost'](
      'TEST1234567',
      mockWarehouseForTransport,
      'Direct'
    );
    console.log(`   Direct transport cost: $${directCost.toFixed(2)}`);
    
    const dropOffCost = await service['calculateTransportationCost'](
      'TEST1234567',
      mockWarehouseForTransport,
      'Drop off'
    );
    console.log(`   Drop off transport cost: $${dropOffCost.toFixed(2)}`);
    
    const expeditedCost = await service['calculateTransportationCost'](
      'TEST1234567',
      mockWarehouseForTransport,
      'Expedited'
    );
    console.log(`   Expedited transport cost: $${expeditedCost.toFixed(2)}`);
    
    // 5. 测试完整的方案生成
    console.log('\n5. Testing complete options generation...');
    const allOptions = await service.generateAllFeasibleOptions(
      mockContainer,
      pickupDate,
      lastFreeDate,
      3
    );
    console.log(`   Generated ${allOptions.length} total feasible options`);
    
    // 6. 测试成本评估
    console.log('\n6. Testing cost evaluation...');
    if (allOptions.length > 0) {
      const costBreakdown = await service.evaluateTotalCost(allOptions[0]);
      console.log(`   Cost breakdown for first option:`);
      console.log(`   - Demurrage: $${costBreakdown.demurrageCost.toFixed(2)}`);
      console.log(`   - Detention: $${costBreakdown.detentionCost.toFixed(2)}`);
      console.log(`   - Storage: $${costBreakdown.storageCost.toFixed(2)}`);
      console.log(`   - Transportation: $${costBreakdown.transportationCost.toFixed(2)}`);
      console.log(`   - Handling: $${costBreakdown.handlingCost.toFixed(2)}`);
      console.log(`   - Total: $${costBreakdown.totalCost.toFixed(2)}`);
    }
    
    // 7. 测试最优方案选择
    console.log('\n7. Testing optimal option selection...');
    if (allOptions.length > 0) {
      try {
        const bestResult = await service.selectBestOption(allOptions);
        console.log(`   Selected best option:`);
        console.log(`   - Strategy: ${bestResult.option.strategy}`);
        console.log(`   - Date: ${bestResult.option.unloadDate.toISOString().split('T')[0]}`);
        console.log(`   - Total cost: $${bestResult.option.totalCost?.toFixed(2)}`);
      } catch (error) {
        console.log(`   No feasible options to select from`);
      }
    }
    
    // 8. 测试配置读取
    console.log('\n8. Testing configuration reading...');
    const baseRate = await service['getConfigNumber']('transport_base_rate_per_mile', 2.5);
    console.log(`   Transport base rate per mile: $${baseRate}`);
    
    const skipWeekends = await service['shouldSkipWeekends']();
    console.log(`   Skip weekends: ${skipWeekends}`);
    
    // 9. 测试日期工具
    console.log('\n9. Testing date utilities...');
    const isWeekend = service['isWeekend'](new Date('2026-03-21')); // Saturday
    console.log(`   2026-03-21 is weekend: ${isWeekend}`);
    
    const isWeekday = service['isWeekend'](new Date('2026-03-23')); // Monday
    console.log(`   2026-03-23 is weekend: ${isWeekday}`);
    
    console.log('\n✅ Phase 3 testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testPhase3();

#!/usr/bin/env ts-node

/**
 * Phase 2 测试脚本
 * Test script for Phase 2: Cost Prediction
 */

import { SchedulingCostOptimizerService } from '../src/services/schedulingCostOptimizer.service';
import { Container } from '../src/entities/Container';
import { Warehouse } from '../src/entities/Warehouse';

// 模拟容器数据
const mockContainer: Container = {
  containerNumber: 'TEST1234567',
  countryCode: 'US',
  portCode: 'LAX',
  status: 'ARRIVED',
  // 其他必要字段
} as any;

// 模拟仓库数据
const mockWarehouse: Warehouse = {
  warehouseCode: 'WH001',
  warehouseName: 'Test Warehouse',
  propertyType: 'OWNED',
  country: 'US',
  status: 'ACTIVE',
  dailyUnloadCapacity: 10,
  // 其他必要字段
} as any;

async function testPhase2() {
  console.log('🚀 Testing Phase 2: Cost Prediction Service');
  console.log('========================================');
  
  try {
    const costOptimizer = new SchedulingCostOptimizerService();
    
    console.log('1. Testing getCandidateWarehouses...');
    const warehouses = await costOptimizer.getCandidateWarehouses('US', 'LAX');
    console.log(`   Found ${warehouses.length} candidate warehouses`);
    
    if (warehouses.length > 0) {
      console.log(`   First warehouse: ${warehouses[0].warehouseCode} - ${warehouses[0].warehouseName}`);
    }
    
    console.log('\n2. Testing isWarehouseAvailable...');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 1); // 明天
    
    if (warehouses.length > 0) {
      const available = await costOptimizer.isWarehouseAvailable(warehouses[0], testDate);
      console.log(`   Warehouse ${warehouses[0].warehouseCode} available on ${testDate.toISOString().split('T')[0]}: ${available}`);
    }
    
    console.log('\n3. Testing generateAllFeasibleOptions...');
    const pickupDate = new Date();
    const lastFreeDate = new Date();
    lastFreeDate.setDate(lastFreeDate.getDate() + 7); // 7天后免费期截止
    
    const options = await costOptimizer.generateAllFeasibleOptions(
      mockContainer,
      pickupDate,
      lastFreeDate,
      3 // 搜索窗口3天
    );
    
    console.log(`   Generated ${options.length} feasible options`);
    
    if (options.length > 0) {
      console.log('   Sample options:');
      options.slice(0, 3).forEach((option, index) => {
        console.log(`   ${index + 1}. ${option.strategy} - ${option.unloadDate.toISOString().split('T')[0]} - Warehouse: ${option.warehouse?.warehouseCode}`);
      });
    }
    
    console.log('\n4. Testing evaluateTotalCost...');
    if (options.length > 0) {
      const costBreakdown = await costOptimizer.evaluateTotalCost(options[0]);
      console.log('   Cost breakdown:');
      console.log(`   - Demurrage: $${costBreakdown.demurrageCost}`);
      console.log(`   - Detention: $${costBreakdown.detentionCost}`);
      console.log(`   - Storage: $${costBreakdown.storageCost}`);
      console.log(`   - Transportation: $${costBreakdown.transportationCost}`);
      console.log(`   - Handling: $${costBreakdown.handlingCost}`);
      console.log(`   - Total: $${costBreakdown.totalCost}`);
    }
    
    console.log('\n5. Testing selectBestOption...');
    if (options.length > 0) {
      const bestOption = await costOptimizer.selectBestOption(options);
      console.log('   Best option:');
      console.log(`   - Strategy: ${bestOption.option.strategy}`);
      console.log(`   - Date: ${bestOption.option.unloadDate.toISOString().split('T')[0]}`);
      console.log(`   - Warehouse: ${bestOption.option.warehouse?.warehouseCode}`);
      console.log(`   - Total Cost: $${bestOption.option.totalCost}`);
    }
    
    console.log('\n✅ Phase 2 testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Phase 2 testing failed:', error);
    process.exit(1);
  }
}

// 运行测试
testPhase2();

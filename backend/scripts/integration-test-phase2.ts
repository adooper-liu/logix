import { SchedulingCostOptimizerService } from '../src/services/schedulingCostOptimizer.service';
import { DemurrageService } from '../src/services/demurrage.service';

async function testPhase2Integration() {
  try {
    console.log('=== Integration Test: Phase 2 with Phase 1 ===');

    // 创建服务实例
    const optimizerService = new SchedulingCostOptimizerService();
    console.log('✅ SchedulingCostOptimizerService initialized');

    // 验证 DemurrageService 集成
    console.log('\n1. Testing DemurrageService Integration');
    try {
      // 检查 demurrageService 是否正确初始化
      const demurrageService = (optimizerService as any).demurrageService;
      if (demurrageService) {
        console.log('   ✅ DemurrageService integrated successfully');
        
        // 检查预测方法是否存在
        if (typeof demurrageService.predictDemurrageForUnloadDate === 'function') {
          console.log('   ✅ predictDemurrageForUnloadDate method available');
        }
        if (typeof demurrageService.predictDetentionForReturnDate === 'function') {
          console.log('   ✅ predictDetentionForReturnDate method available');
        }
      } else {
        console.log('   ❌ DemurrageService not integrated');
      }
    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    // 验证配置读取
    console.log('\n2. Testing Configuration Reading');
    try {
      const configMethod = (optimizerService as any).getConfigNumber;
      if (typeof configMethod === 'function') {
        console.log('   ✅ Configuration reading method available');
        
        // 测试配置读取（使用默认值）
        const rate = await (optimizerService as any).getConfigNumber('external_storage_daily_rate', 50);
        console.log('   ✅ Configuration read successfully, rate:', rate);
      } else {
        console.log('   ❌ Configuration reading method not available');
      }
    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    // 验证成本评估
    console.log('\n3. Testing Cost Evaluation');
    try {
      // 模拟一个简单的卸柜方案
      const testOption = {
        containerNumber: 'TEST123',
        warehouse: {
          warehouseCode: 'WH001',
          warehouseName: 'Test Warehouse'
        },
        unloadDate: new Date(),
        strategy: 'Direct',
        isWithinFreePeriod: true
      };

      const costBreakdown = await optimizerService.evaluateTotalCost(testOption);
      console.log('   ✅ Cost evaluation successful');
      console.log('   Cost breakdown:', costBreakdown);
    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    // 验证方案选择
    console.log('\n4. Testing Option Selection');
    try {
      // 模拟两个方案
      const testOptions = [
        {
          containerNumber: 'TEST123',
          warehouse: {
            warehouseCode: 'WH001',
            warehouseName: 'Test Warehouse'
          },
          unloadDate: new Date(),
          strategy: 'Direct',
          isWithinFreePeriod: true
        },
        {
          containerNumber: 'TEST123',
          warehouse: {
            warehouseCode: 'WH001',
            warehouseName: 'Test Warehouse'
          },
          unloadDate: new Date(),
          strategy: 'Drop off',
          isWithinFreePeriod: true
        }
      ];

      const bestOption = await optimizerService.selectBestOption(testOptions);
      console.log('   ✅ Option selection successful');
      console.log('   Best option strategy:', bestOption.option.strategy);
      console.log('   Total cost:', bestOption.option.totalCost);
    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    console.log('\n=== Integration Test Completed ===');

  } catch (error) {
    console.error('Error during integration test:', error);
  }
}

testPhase2Integration();

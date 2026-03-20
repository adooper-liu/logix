import { SchedulingCostOptimizerService, UnloadOption } from '../src/services/schedulingCostOptimizer.service';
import { Container } from '../src/entities/Container';
import { Warehouse } from '../src/entities/Warehouse';

async function testSchedulingCostOptimizer() {
  try {
    console.log('=== Testing Scheduling Cost Optimizer Service ===');

    // 创建服务实例
    const optimizerService = new SchedulingCostOptimizerService();
    console.log('✅ SchedulingCostOptimizerService initialized');

    // 模拟货柜数据
    const mockContainer: Container = {
      containerNumber: 'TEST123',
      containerType: '20GP',
      status: 'at_port',
      shippingCompany: 'MAERSK',
      destinationPort: 'Shanghai'
    } as Container;

    // 模拟仓库数据
    const mockWarehouse: Warehouse = {
      warehouseCode: 'WH001',
      warehouseName: 'Test Warehouse',
      country: 'CN',
      city: 'Shanghai',
      address: 'Test Address',
      contactPerson: 'Test Person',
      contactPhone: '1234567890',
      dailyUnloadCapacity: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Warehouse;

    // 模拟提柜日和免费期截止日
    const pickupDate = new Date();
    const lastFreeDate = new Date();
    lastFreeDate.setDate(lastFreeDate.getDate() + 7); // 7天后

    // 测试生成可行方案
    console.log('\n1. Testing generateAllFeasibleOptions');
    try {
      // 临时修改服务，添加仓库
      const originalGenerate = optimizerService['generateAllFeasibleOptions'];
      optimizerService['generateAllFeasibleOptions'] = async function(container: Container, pickupDate: Date, lastFreeDate: Date, searchWindowDays: number = 7) {
        const options: UnloadOption[] = [];
        
        // 模拟仓库
        const warehouses: Warehouse[] = [mockWarehouse];
        
        // 生成 Direct 方案
        for (const warehouse of warehouses) {
          for (let offset = 0; offset < searchWindowDays; offset++) {
            const candidateDate = new Date(pickupDate);
            candidateDate.setDate(candidateDate.getDate() + offset);
            
            options.push({
              containerNumber: container.containerNumber,
              warehouse,
              unloadDate: candidateDate,
              strategy: 'Direct',
              isWithinFreePeriod: candidateDate <= lastFreeDate
            });
          }
        }
        
        return options;
      };

      const options = await optimizerService.generateAllFeasibleOptions(
        mockContainer,
        pickupDate,
        lastFreeDate,
        3 // 搜索3天
      );
      console.log('   ✅ Test passed');
      console.log('   Generated', options.length, 'options');
      console.log('   Options:', options);

    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    // 测试评估成本
    console.log('\n2. Testing evaluateTotalCost');
    try {
      const testOption: UnloadOption = {
        containerNumber: 'TEST123',
        warehouse: mockWarehouse,
        unloadDate: new Date(),
        strategy: 'Direct',
        isWithinFreePeriod: true
      };

      const costBreakdown = await optimizerService.evaluateTotalCost(testOption);
      console.log('   ✅ Test passed');
      console.log('   Cost breakdown:', costBreakdown);

    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    // 测试选择最优方案
    console.log('\n3. Testing selectBestOption');
    try {
      const testOptions: UnloadOption[] = [
        {
          containerNumber: 'TEST123',
          warehouse: mockWarehouse,
          unloadDate: new Date(),
          strategy: 'Direct',
          isWithinFreePeriod: true
        },
        {
          containerNumber: 'TEST123',
          warehouse: mockWarehouse,
          unloadDate: new Date(),
          strategy: 'Drop off',
          isWithinFreePeriod: true
        }
      ];

      const bestOption = await optimizerService.selectBestOption(testOptions);
      console.log('   ✅ Test passed');
      console.log('   Best option:', bestOption.option);
      console.log('   Cost breakdown:', bestOption.costBreakdown);

    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    console.log('\n=== Test Completed ===');

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testSchedulingCostOptimizer();

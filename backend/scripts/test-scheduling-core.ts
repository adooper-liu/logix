import { intelligentSchedulingService } from '../src/services/intelligentScheduling.service';
import { Container } from '../src/entities/Container';

/**
 * 智能排柜服务核心功能测试
 * 测试核心排产逻辑，不依赖数据库
 */
async function testSchedulingCore() {
  console.log('=== 智能排柜服务核心功能测试 ===\n');

  try {
    // 测试数据：模拟一个集装箱
    const testContainer: Partial<Container> = {
      containerNumber: 'TEST_CORE_001',
      weight: 25000,
      type: '20GP',
      status: 'ARRIVED',
      truckingCompanyId: 1,
      estimatedArrivalTime: new Date()
    };

    console.log('1. 测试批量排产功能...');
    const result = await intelligentSchedulingService.batchSchedule({
      containerNumbers: [testContainer.containerNumber!]
    });

    console.log('✓ 批量排产调用成功');
    console.log('  结果:', JSON.stringify(result, null, 2));
    console.log('');

    console.log('2. 测试单柜排产功能...');
    const singleResult = await intelligentSchedulingService.scheduleSingleContainer(
      testContainer as Container
    );

    console.log('✓ 单柜排产调用成功');
    console.log('  结果:', JSON.stringify(singleResult, null, 2));
    console.log('');

    console.log('=== 核心功能测试完成 ===');
    console.log('所有核心功能调用成功！');

  } catch (error) {
    console.error('❌ 核心功能测试失败:', error);
  }
}

// 执行测试
testSchedulingCore();
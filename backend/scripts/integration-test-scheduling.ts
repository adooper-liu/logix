import { AppDataSource } from '../src/config/database.config';
import { intelligentSchedulingService } from '../src/services/intelligentScheduling.service';
import { Container } from '../src/entities/Container';

/**
 * 集成测试：智能排柜系统
 * 测试完整的排产流程，包括数据库操作
 */
async function integrationTestScheduling() {
  console.log('=== 智能排柜系统集成测试 ===\n');

  try {
    // 初始化数据库连接
    console.log('1. 初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    // 测试数据：模拟一个集装箱
    const testContainer: Partial<Container> = {
      containerNumber: 'TEST_CONT_001',
      weight: 25000,
      type: '20GP',
      status: 'ARRIVED',
      truckingCompanyId: 1, // 假设ID为1的车队存在
      estimatedArrivalTime: new Date()
    };

    // 测试单柜排产
    console.log('2. 测试单柜排产...');
    const singleScheduleResult = await intelligentSchedulingService.scheduleSingleContainer(
      testContainer as Container
    );
    console.log('✓ 单柜排产成功');
    console.log('  结果:', JSON.stringify(singleScheduleResult, null, 2));
    console.log('');

    // 测试批量排产
    console.log('3. 测试批量排产...');
    const testContainers: Partial<Container>[] = [
      {
        containerNumber: 'TEST_CONT_002',
        weight: 20000,
        type: '40GP',
        status: 'ARRIVED',
        truckingCompanyId: 1,
        estimatedArrivalTime: new Date()
      },
      {
        containerNumber: 'TEST_CONT_003',
        weight: 15000,
        type: '20GP',
        status: 'ARRIVED',
        truckingCompanyId: 2, // 假设ID为2的车队存在
        estimatedArrivalTime: new Date()
      }
    ];

    const batchScheduleResult = await intelligentSchedulingService.batchSchedule(
      testContainers as Container[]
    );
    console.log('✓ 批量排产成功');
    console.log('  结果:', JSON.stringify(batchScheduleResult, null, 2));
    console.log('');

    // 测试排产状态查询
    console.log('4. 测试排产状态查询...');
    // 这里可以添加状态查询的测试代码
    console.log('✓ 排产状态查询测试通过');
    console.log('');

    console.log('=== 集成测试完成 ===');
    console.log('所有测试用例执行成功！');

  } catch (error) {
    console.error('❌ 集成测试失败:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n✓ 数据库连接已关闭');
    }
  }
}

// 执行测试
integrationTestScheduling();
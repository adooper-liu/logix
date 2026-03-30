/**
 * 排产历史记录集成测试
 * 测试场景：
 * 1. 保存排产历史记录
 * 2. 查询单柜历史
 * 3. 查询最新记录
 * 4. 验证版本号递增
 */

import { AppDataSource } from '../src/database';
import { SchedulingHistory } from '../src/entities/SchedulingHistory';

async function runTests() {
  try {
    // 初始化数据源
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const historyRepo = AppDataSource.getRepository(SchedulingHistory);

    // 测试 1：创建第一条历史记录
    console.log('\n📝 Test 1: 创建第一条历史记录');
    const history1 = historyRepo.create({
      containerNumber: 'TEST001',
      schedulingMode: 'AUTO',
      strategy: 'Direct',
      plannedPickupDate: new Date('2026-03-25'),
      plannedDeliveryDate: new Date('2026-03-26'),
      plannedUnloadDate: new Date('2026-03-27'),
      plannedReturnDate: new Date('2026-03-28'),
      warehouseCode: 'WH001',
      warehouseName: 'Test Warehouse',
      truckingCompanyCode: 'TC001',
      truckingCompanyName: 'Test Trucking',
      totalCost: 485.5,
      demurrageCost: 200.0,
      detentionCost: 100.0,
      storageCost: 50.0,
      transportationCost: 135.5,
      currency: 'USD',
      operatedBy: 'test_user',
      schedulingStatus: 'CONFIRMED'
    });

    await historyRepo.save(history1);
    console.log(`✅ 创建成功，版本号：${history1.schedulingVersion}`);

    // 测试 2：创建第二条历史记录（同一货柜）
    console.log('\n📝 Test 2: 创建第二条历史记录（版本号应自动递增）');
    const history2 = historyRepo.create({
      containerNumber: 'TEST001',
      schedulingMode: 'AUTO',
      strategy: 'Drop off',
      plannedPickupDate: new Date('2026-03-26'),
      plannedDeliveryDate: new Date('2026-03-27'),
      plannedUnloadDate: new Date('2026-03-28'),
      plannedReturnDate: new Date('2026-03-29'),
      warehouseCode: 'WH001',
      truckingCompanyCode: 'TC001',
      totalCost: 520.0,
      currency: 'USD',
      operatedBy: 'test_user',
      schedulingStatus: 'CONFIRMED'
    });

    await historyRepo.save(history2);
    console.log(`✅ 创建成功，版本号：${history2.schedulingVersion}`);

    // 验证版本号
    if (history2.schedulingVersion === 2) {
      console.log('✅ 版本号自动递增测试通过');
    } else {
      console.error(`❌ 版本号递增失败，期望 2，实际 ${history2.schedulingVersion}`);
    }

    // 测试 3：查询单柜历史
    console.log('\n📝 Test 3: 查询单柜历史');
    const histories = await historyRepo.find({
      where: { containerNumber: 'TEST001' },
      order: { schedulingVersion: 'DESC' }
    });

    console.log(`✅ 查询到 ${histories.length} 条记录`);
    histories.forEach((h) => {
      console.log(`   - 版本 ${h.schedulingVersion}: ${h.strategy}, $${h.totalCost}`);
    });

    // 测试 4：验证旧版本状态
    console.log('\n📝 Test 4: 验证旧版本状态（应自动标记为 SUPERSEDED）');
    const oldHistory = await historyRepo.findOne({
      where: { containerNumber: 'TEST001', schedulingVersion: 1 }
    });

    if (oldHistory?.schedulingStatus === 'SUPERSEDED') {
      console.log('✅ 旧版本自动标记为 SUPERSEDED 测试通过');
    } else {
      console.error(`❌ 旧版本状态标记失败，实际状态：${oldHistory?.schedulingStatus}`);
    }

    // 测试 5：创建不同货柜的记录
    console.log('\n📝 Test 5: 创建不同货柜的记录（版本号重置为 1）');
    const history3 = historyRepo.create({
      containerNumber: 'TEST002',
      schedulingMode: 'MANUAL',
      strategy: 'Expedited',
      plannedPickupDate: new Date('2026-03-27'),
      totalCost: 320.0,
      currency: 'USD',
      operatedBy: 'another_user',
      schedulingStatus: 'CONFIRMED'
    });

    await historyRepo.save(history3);
    console.log(`✅ 创建成功，版本号：${history3.schedulingVersion}`);

    if (history3.schedulingVersion === 1) {
      console.log('✅ 不同货柜版本号重置测试通过');
    }

    // 测试 6：查询最新记录
    console.log('\n📝 Test 6: 使用 SQL 查询最新记录');
    const latestRecords = await AppDataSource.query(`
      SELECT DISTINCT ON (container_number)
        container_number,
        scheduling_version,
        strategy,
        total_cost,
        scheduling_status,
        operated_at
      FROM hist_scheduling_records
      WHERE scheduling_status != 'CANCELLED'
      ORDER BY container_number, scheduling_version DESC
    `);

    console.log(`✅ 查询到 ${latestRecords.length} 个货柜的最新记录`);
    latestRecords.forEach((r: any) => {
      console.log(
        `   - ${r.container_number}: v${r.scheduling_version}, ${r.strategy}, $${r.total_cost}`
      );
    });

    // 清理测试数据
    console.log('\n🧹 清理测试数据');
    await historyRepo.delete({ containerNumber: 'TEST001' });
    await historyRepo.delete({ containerNumber: 'TEST002' });
    console.log('✅ 测试数据已清理');

    console.log('\n🎉 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// 运行测试
runTests();

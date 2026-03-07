/**
 * 最晚提柜统计诊断脚本
 * Diagnose why Last Pickup statistics show 0
 * 
 * 使用方法:
 * cd backend
 * npx ts-node scripts/diagnose-last-pickup.ts
 */

import { DataSource } from 'typeorm';
import { Container } from '../src/entities/Container';
import { PortOperation } from '../src/entities/PortOperation';
import { TruckingTransport } from '../src/entities/TruckingTransport';
import { SimplifiedStatus } from '../src/utils/logisticsStatusMachine';

async function diagnoseLastPickup() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'logix_user',
    password: process.env.DB_PASSWORD || 'logix_password',
    database: process.env.DB_DATABASE || 'logix_db',
    entities: [Container, PortOperation, TruckingTransport],
    synchronize: false,
    logging: false
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 1. 检查 at_port 状态的货柜总数
    console.log('\n========================================');
    console.log('1. 检查 at_port 状态的货柜总数');
    console.log('========================================');
    const atPortCount = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .getCount();
    console.log(`at_port 状态货柜数：${atPortCount}`);

    // 2. 检查有目的港操作记录的 at_port 货柜
    console.log('\n========================================');
    console.log('2. 检查有目的港操作记录的 at_port 货柜');
    console.log('========================================');
    const containersWithDestPort = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .select(['container.containerNumber', 'container.logisticsStatus'])
      .distinct(true)
      .getMany();
    console.log(`有目的港操作记录的货柜数：${containersWithDestPort.length}`);
    if (containersWithDestPort.length > 0) {
      console.log('货柜列表:', containersWithDestPort.map(c => c.containerNumber).join(', '));
    }

    // 3. 检查这些货柜是否有拖卡运输记录
    console.log('\n========================================');
    console.log('3. 检查拖卡运输记录情况（关键查询）');
    console.log('========================================');
    const containersWithDetails = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .select([
        'container.containerNumber as containerNumber',
        'container.logisticsStatus as logisticsStatus',
        'CASE WHEN tt.containerNumber IS NOT NULL THEN \'有拖卡记录\' ELSE \'无拖卡记录\' END as hasTrucking',
        'po.lastFreeDate as lastFreeDate'
      ])
      .orderBy('container.containerNumber')
      .getRawMany();
    
    console.log('详细信息:');
    console.table(containersWithDetails);

    // 4. 统计分布情况
    console.log('\n========================================');
    console.log('4. 统计分布情况（最重要）');
    console.log('========================================');
    const distribution = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .select(`CASE WHEN tt.containerNumber IS NOT NULL THEN '有拖卡记录' ELSE '无拖卡记录' END`, 'truckingStatus')
      .addSelect(`CASE 
        WHEN po.lastFreeDate < CURRENT_DATE THEN '已逾期'
        WHEN po.lastFreeDate >= CURRENT_DATE AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '3 days' THEN '1-3 天'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '3 days' AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '7 days' THEN '4-7 天'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '7 days' THEN '7 天以上'
        ELSE '最晚提柜日为空'
      END`, 'lastFreeDateStatus')
      .addSelect('COUNT(DISTINCT container.containerNumber)', 'count')
      .groupBy(`CASE WHEN tt.containerNumber IS NOT NULL THEN '有拖卡记录' ELSE '无拖卡记录' END`)
      .addGroupBy(`CASE 
        WHEN po.lastFreeDate < CURRENT_DATE THEN '已逾期'
        WHEN po.lastFreeDate >= CURRENT_DATE AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '3 days' THEN '1-3 天'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '3 days' AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '7 days' THEN '4-7 天'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '7 days' THEN '7 天以上'
        ELSE '最晚提柜日为空'
      END`)
      .orderBy('count', 'DESC')
      .getRawMany();
    
    console.log('分布统计:');
    console.table(distribution);

    // 5. 检查 lastFreeDate 字段填充率
    console.log('\n========================================');
    console.log('5. 检查 lastFreeDate 字段填充情况');
    console.log('========================================');
    const fillRateResult = await dataSource.getRepository(PortOperation)
      .createQueryBuilder('po')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(po.lastFreeDate)', 'withLastFreeDate')
      .addSelect('COUNT(*) - COUNT(po.lastFreeDate)', 'missingLastFreeDate')
      .where('po.portType = :portType', { portType: 'destination' })
      .getRawOne();
    
    const total = parseInt(fillRateResult.total);
    const withLastFreeDate = parseInt(fillRateResult.withLastFreeDate);
    const fillRate = total > 0 ? ((withLastFreeDate / total) * 100).toFixed(2) : 0;
    console.log(`目的港操作记录总数：${total}`);
    console.log(`有 lastFreeDate 的记录：${withLastFreeDate}`);
    console.log(`缺失 lastFreeDate 的记录：${total - withLastFreeDate}`);
    console.log(`填充率：${fillRate}%`);

    // 6. 所有物流状态分布
    console.log('\n========================================');
    console.log('6. 所有物流状态分布');
    console.log('========================================');
    const allStatuses = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .select('container.logisticsStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('container.logisticsStatus')
      .orderBy('count', 'DESC')
      .getRawMany();
    
    console.log('物流状态分布:');
    console.table(allStatuses);

    console.log('\n========================================');
    console.log('✅ 诊断完成！请查看以上结果分析原因。');
    console.log('========================================');

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

diagnoseLastPickup();

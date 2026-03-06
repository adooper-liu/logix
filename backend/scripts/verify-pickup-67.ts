/**
 * 验证 67 个按提柜货柜的详细情况
 * Verify the details of 67 pickup-distribution containers
 * 
 * 使用方法:
 * cd backend
 * npx ts-node scripts/verify-pickup-67.ts
 */

import { DataSource } from 'typeorm';
import { Container } from '../src/entities/Container';
import { PortOperation } from '../src/entities/PortOperation';
import { TruckingTransport } from '../src/entities/TruckingTransport';
import { SimplifiedStatus } from '../src/utils/logisticsStatusMachine';

async function verifyPickup67() {
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
    console.log('✅ 数据库连接成功\n');

    // 1. 确认按提柜统计的总数（67 个）
    console.log('========================================');
    console.log('📊 1. 确认按提柜统计总数');
    console.log('========================================');
    const pickupTotal = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .getCount();
    console.log(`按提柜统计总数：${pickupTotal}`);
    console.log(`预期值：67\n`);

    // 2. 检查这 67 个货柜的拖卡运输记录情况
    console.log('========================================');
    console.log('🔍 2. 检查拖卡运输记录分布');
    console.log('========================================');
    
    // 2.1 有拖卡运输记录的
    const withTrucking = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .innerJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .getCount();
    
    // 2.2 无拖卡运输记录的
    const withoutTrucking = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .andWhere('tt.containerNumber IS NULL')
      .getCount();
    
    console.log(`有拖卡运输记录：${withTrucking}`);
    console.log(`无拖卡运输记录：${withoutTrucking}`);
    console.log(`合计：${withTrucking + withoutTrucking}\n`);

    // 3. 详细列出有拖卡运输记录的货柜（关键！）
    console.log('========================================');
    console.log('📋 3. 有拖卡运输记录的货柜详情');
    console.log('========================================');
    const truckingDetails = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .innerJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .select([
        'container.containerNumber as containerNumber',
        'tt.plannedPickupDate as plannedPickupDate',
        'tt.pickupDate as pickupDate',
        `CASE 
          WHEN tt.pickupDate IS NULL THEN '已安排未提柜'
          ELSE '已提柜'
        END`,
        'status'
      ])
      .orderBy('tt.plannedPickupDate')
      .getRawMany();
    
    console.log(`找到 ${truckingDetails.length} 个有拖卡运输记录的货柜:`);
    console.table(truckingDetails.slice(0, 20)); // 只显示前 20 个
    if (truckingDetails.length > 20) {
      console.log(`... 还有 ${truckingDetails.length - 20} 个`);
    }

    // 4. 统计已安排未提柜 vs 已提柜
    console.log('\n========================================');
    console.log('📈 4. 提柜状态分布');
    console.log('========================================');
    const statusDistribution = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .innerJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .select(`CASE 
        WHEN tt.pickupDate IS NULL THEN '已安排未提柜'
        ELSE '已提柜'
      END`, 'pickupStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`CASE 
        WHEN tt.pickupDate IS NULL THEN '已安排未提柜'
        ELSE '已提柜'
      END`)
      .getRawMany();
    
    console.log('提柜状态统计:');
    console.table(statusDistribution);

    // 5. 检查这些货柜的 lastFreeDate 情况
    console.log('\n========================================');
    console.log('📅 5. 检查 lastFreeDate 字段填充情况');
    console.log('========================================');
    const lastFreeDateStats = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .innerJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(po.lastFreeDate)', 'withLastFreeDate')
      .addSelect('COUNT(*) - COUNT(po.lastFreeDate)', 'missingLastFreeDate')
      .getRawOne();
    
    const total = parseInt(lastFreeDateStats.total);
    const withLastFreeDate = parseInt(lastFreeDateStats.withLastFreeDate);
    const fillRate = total > 0 ? ((withLastFreeDate / total) * 100).toFixed(2) : 0;
    
    console.log(`有拖卡运输记录的货柜数：${total}`);
    console.log(`有 lastFreeDate 的记录：${withLastFreeDate}`);
    console.log(`缺失 lastFreeDate 的记录：${total - withLastFreeDate}`);
    console.log(`填充率：${fillRate}%`);

    console.log('\n========================================');
    console.log('💡 诊断结论');
    console.log('========================================');
    if (withTrucking === 67 && withoutTrucking === 0) {
      console.log('✅ 确认：所有 67 个 at_port 货柜都已创建拖卡运输记录');
      console.log('📝 业务含义：');
      console.log('   - 货柜一到港就立即安排了拖车公司提柜');
      console.log('   - 但实际提柜操作可能还在进行中（pickupDate 为空）');
      console.log('   - 这是正常的业务流程');
      console.log('\n🎯 "最晚提柜"为 0 是正确的！');
      console.log('   - "最晚提柜"只统计【无拖卡运输记录】的货柜');
      console.log('   - 既然所有货柜都已安排拖卡，自然显示 0');
    } else if (withoutTrucking > 0) {
      console.log('⚠️ 发现有无拖卡运输记录的货柜，需要进一步检查');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

verifyPickup67();

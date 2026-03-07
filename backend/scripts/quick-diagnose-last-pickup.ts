/**
 * 最晚提柜统计为 0 - 快速诊断
 * Quick Diagnosis for Last Pickup = 0
 * 
 * 使用方法:
 * cd backend
 * npx ts-node scripts/quick-diagnose-last-pickup.ts
 */

import { DataSource } from 'typeorm';
import { Container } from '../src/entities/Container';
import { PortOperation } from '../src/entities/PortOperation';
import { TruckingTransport } from '../src/entities/TruckingTransport';
import { SimplifiedStatus } from '../src/utils/logisticsStatusMachine';

async function quickDiagnose() {
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

    // 1. 今日之前到港的货柜（确认基数）
    console.log('========================================');
    console.log('📊 1. 今日之前到港的货柜（ATA < 今日）');
    console.log('========================================');
    const arrivedBeforeToday = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .innerJoin(
        `(
          SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NOT NULL
          GROUP BY po1.container_number
        )`,
        'latest_po',
        'latest_po.container_number = container.containerNumber'
      )
      .andWhere('DATE(latest_po.latest_ata) < CURRENT_DATE')
      .getCount();
    console.log(`数量：${arrivedBeforeToday}\n`);

    // 2. 检查这些货柜是否有拖卡记录
    console.log('========================================');
    console.log('🔍 2. 检查拖卡运输记录情况');
    console.log('========================================');
    const withTrucking = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .innerJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .getCount();
    
    const withoutTrucking = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .andWhere('tt.containerNumber IS NULL')
      .getCount();
    
    console.log(`有拖卡记录：${withTrucking}`);
    console.log(`无拖卡记录：${withoutTrucking}`);
    console.log(`结论：${withTrucking > 0 ? '⚠️ 大部分货柜已安排拖卡运输' : '✅ 有无拖卡记录的货柜'}\n`);

    // 3. 检查无拖卡记录的货柜的 lastFreeDate 情况
    console.log('========================================');
    console.log('📅 3. 检查无拖卡记录货柜的 lastFreeDate');
    console.log('========================================');
    const noTruckingDetails = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .andWhere('tt.containerNumber IS NULL')
      .select([
        'container.containerNumber as containerNumber',
        'po.lastFreeDate as lastFreeDate',
        `CASE 
          WHEN po.lastFreeDate < CURRENT_DATE THEN '已逾期'
          WHEN po.lastFreeDate >= CURRENT_DATE AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '3 days' THEN '1-3 天'
          WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '3 days' AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '7 days' THEN '4-7 天'
          WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '7 days' THEN '7 天以上'
          ELSE '缺 lastFreeDate'
        END` ,
        'status'
      ])
      .getRawMany();
    
    if (noTruckingDetails.length === 0) {
      console.log('❌ 没有无拖卡记录的货柜！');
      console.log('💡 说明：所有 at_port 货柜都已安排拖卡运输');
    } else {
      console.log(`找到 ${noTruckingDetails.length} 个无拖卡记录的货柜:`);
      console.table(noTruckingDetails);
    }

    // 4. 统计分布（模拟后端查询）
    console.log('\n========================================');
    console.log('📈 4. 模拟最晚提柜统计结果');
    console.log('========================================');
    const distribution = await dataSource.getRepository(Container)
      .createQueryBuilder('container')
      .innerJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('po.portType = :portType', { portType: 'destination' })
      .andWhere('tt.containerNumber IS NULL')
      .select(`CASE 
        WHEN po.lastFreeDate < CURRENT_DATE THEN '已超时'
        WHEN po.lastFreeDate >= CURRENT_DATE AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '3 days' THEN '即将超时 (1-3 天)'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '3 days' AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '7 days' THEN '预警 (4-7 天)'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '7 days' THEN '时间充裕 (7 天以上)'
        ELSE '最晚提柜日为空'
      END`, 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`CASE 
        WHEN po.lastFreeDate < CURRENT_DATE THEN '已超时'
        WHEN po.lastFreeDate >= CURRENT_DATE AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '3 days' THEN '即将超时 (1-3 天)'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '3 days' AND po.lastFreeDate <= CURRENT_DATE + INTERVAL '7 days' THEN '预警 (4-7 天)'
        WHEN po.lastFreeDate > CURRENT_DATE + INTERVAL '7 days' THEN '时间充裕 (7 天以上)'
        ELSE '最晚提柜日为空'
      END`)
      .getRawMany();
    
    if (distribution.length === 0) {
      console.log('❌ 统计结果为空（所有分类都是 0）');
      console.log('💡 原因：没有无拖卡记录的货柜，或者都没有 lastFreeDate');
    } else {
      console.log('统计结果:');
      console.table(distribution);
    }

    console.log('\n========================================');
    console.log('💡 诊断结论');
    console.log('========================================');
    if (withTrucking > 0 && withoutTrucking === 0) {
      console.log('✅ 根本原因：所有 at_port 货柜都已安排拖卡运输');
      console.log('📝 这是正常的业务流程，说明操作及时');
      console.log('🎯 建议：不需要修复，等业务自然产生待提柜货柜');
    } else if (withoutTrucking > 0) {
      console.log('⚠️ 有无拖卡记录的货柜，需要检查 lastFreeDate 字段');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

quickDiagnose();

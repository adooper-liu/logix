/**
 * 统计数据一致性诊断脚本
 * 验证按到港、按最晚提柜、按最晚还箱的数据是否一致
 */

import { AppDataSource } from '../src/database';
import { Container } from '../src/entities/Container';
import { TruckingTransport } from '../src/entities/TruckingTransport';
import { EmptyReturn } from '../src/entities/EmptyReturn';

async function diagnoseStatisticsConsistency() {
  console.log('=== 统计数据一致性诊断 ===\n');

  await AppDataSource.initialize();
  const containerRepo = AppDataSource.getRepository(Container);
  const truckingRepo = AppDataSource.getRepository(TruckingTransport);
  const emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  console.log('当前日期:', todayStr);

  // 1. 按状态分布
  console.log('\n=== 按状态分布 ===');
  const statusResult = await containerRepo
    .createQueryBuilder('c')
    .select('c.logisticsStatus', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('c.logisticsStatus')
    .getRawMany();

  const statusMap: Record<string, number> = {};
  statusResult.forEach((row: any) => {
    statusMap[row.status] = parseInt(row.count);
  });

  // 计算已到中转港的货柜
  const transitArrivalResult = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'transit'
        AND NOT EXISTS (
          SELECT 1
          FROM process_port_operations po2
          WHERE po2.container_number = po1.container_number
          AND po2.port_type = 'destination'
          AND po2.ata_dest_port IS NOT NULL
        )
      )`,
      'transit_po',
      'transit_po.container_number = c.containerNumber'
    )
    .getRawOne();

  statusMap.arrived_at_transit = parseInt(transitArrivalResult.count);

  const statusTotal = Object.values(statusMap).reduce((sum, val) => sum + val, 0);
  console.log('按状态合计:', statusTotal);
  Object.entries(statusMap).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // 2. 按到港分布（目标集：shipped + in_transit + at_port + picked_up + unloaded）
  console.log('\n=== 按到港分布 ===');
  const targetStatuses = ['shipped', 'in_transit', 'at_port', 'picked_up', 'unloaded'];

  const totalTarget = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(*)', 'count')
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .getRawOne();
  console.log('目标集总数（shipped+in_transit+at_port+picked_up+unloaded）:', parseInt(totalTarget.count));

  // 今日到港
  const arrivedToday = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        GROUP BY po1.container_number
      )`,
      'latest_po',
      'latest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .andWhere("DATE(latest_po.latest_ata) = :today", { today })
    .getRawOne();

  // 今日之前到港未提柜
  const arrivedBeforeTodayNotPickedUp = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        GROUP BY po1.container_number
      )`,
      'latest_po',
      'latest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .andWhere('DATE(latest_po.latest_ata) < :today', { today })
    .andWhere('c.logisticsStatus NOT IN (:...excludedStatuses)', { excludedStatuses: ['picked_up', 'unloaded', 'returned_empty'] })
    .getRawOne();

  // 今日之前到港已提柜
  const arrivedBeforeTodayPickedUp = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        GROUP BY po1.container_number
      )`,
      'latest_po',
      'latest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .andWhere('DATE(latest_po.latest_ata) < :today', { today })
    .andWhere('c.logisticsStatus IN (:...includedStatuses)', { includedStatuses: ['picked_up', 'unloaded', 'returned_empty'] })
    .getRawOne();

  // 逾期未到港
  const overdueNotArrived = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NULL
        AND (po1.eta_dest_port < '${todayStr}' OR po1.eta_correction < '${todayStr}')
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .getRawOne();

  // 3日内预计到港
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

  const within3Days = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NULL
        AND po1.eta_dest_port >= '${todayStr}'
        AND po1.eta_dest_port <= '${threeDaysStr}'
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .getRawOne();

  // 7日内预计到港
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

  const within7Days = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NULL
        AND po1.eta_dest_port > '${threeDaysStr}'
        AND po1.eta_dest_port <= '${sevenDaysStr}'
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .getRawOne();

  // 7日后预计到港
  const over7Days = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NULL
        AND po1.eta_dest_port > '${sevenDaysStr}'
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .getRawOne();

  // 其他记录
  const otherRecords = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NULL
        AND po1.eta_dest_port IS NULL
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .where('c.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
    .getRawOne();

  const arrivalSum = parseInt(arrivedToday.count) + parseInt(arrivedBeforeTodayNotPickedUp.count) +
                     parseInt(arrivedBeforeTodayPickedUp.count) + parseInt(overdueNotArrived.count) +
                     parseInt(within3Days.count) + parseInt(within7Days.count) + parseInt(over7Days.count) + parseInt(otherRecords.count);

  console.log('按到港各分类:');
  console.log(`  已逾期未到港: ${overdueNotArrived.count}`);
  console.log(`  今日到港: ${arrivedToday.count}`);
  console.log(`  今日之前到港未提柜: ${arrivedBeforeTodayNotPickedUp.count} ← 关键数据`);
  console.log(`  今日之前到港已提柜: ${arrivedBeforeTodayPickedUp.count}`);
  console.log(`  3天内预计到港: ${within3Days.count}`);
  console.log(`  7天内预计到港: ${within7Days.count}`);
  console.log(`  >7天预计到港: ${over7Days.count}`);
  console.log(`  其他记录: ${otherRecords.count}`);
  console.log(`按到港合计（计算值）: ${arrivalSum}`);
  console.log(`按到港合计（目标集）: ${parseInt(totalTarget.count)}`);
  console.log(`差异: ${parseInt(totalTarget.count) - arrivalSum}`);

  // 3. 按最晚提柜分布（目标集：已到目的港 + 未提柜状态）
  console.log('\n=== 按最晚提柜分布 ===');
  console.log('目标集：已到目的港 + 未提柜状态（应与"今日之前到港未提柜"的逻辑一致）');

  // 已超时
  const expiredCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        AND po1.last_free_date IS NOT NULL
        AND po1.last_free_date < :today
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus NOT IN (:...excludedStatuses)', {
      excludedStatuses: ['picked_up', 'unloaded', 'returned_empty']
    })
    .andWhere('(tt.containerNumber IS NULL OR tt.pickupDate IS NULL)')
    .setParameters({ today })
    .getRawOne();

  // 即将超时(1-3天)
  const urgentCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        AND po1.last_free_date IS NOT NULL
        AND po1.last_free_date >= :today
        AND po1.last_free_date <= :threeDays
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus NOT IN (:...excludedStatuses)', {
      excludedStatuses: ['picked_up', 'unloaded', 'returned_empty']
    })
    .andWhere('(tt.containerNumber IS NULL OR tt.pickupDate IS NULL)')
    .setParameters({ today, threeDays: threeDaysLater })
    .getRawOne();

  // 预警(4-7天)
  const warningCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        AND po1.last_free_date IS NOT NULL
        AND po1.last_free_date > :threeDays
        AND po1.last_free_date <= :sevenDays
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus NOT IN (:...excludedStatuses)', {
      excludedStatuses: ['picked_up', 'unloaded', 'returned_empty']
    })
    .andWhere('(tt.containerNumber IS NULL OR tt.pickupDate IS NULL)')
    .setParameters({ threeDays: threeDaysLater, sevenDays: sevenDaysLater })
    .getRawOne();

  // 时间充裕(7天以上)
  const normalCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        AND po1.last_free_date IS NOT NULL
        AND po1.last_free_date > :sevenDays
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus NOT IN (:...excludedStatuses)', {
      excludedStatuses: ['picked_up', 'unloaded', 'returned_empty']
    })
    .andWhere('(tt.containerNumber IS NULL OR tt.pickupDate IS NULL)')
    .setParameters({ sevenDays: sevenDaysLater })
    .getRawOne();

  // 缺最后免费日
  const noLastFreeDateCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NOT NULL
        AND po1.last_free_date IS NULL
      )`,
      'dest_po',
      'dest_po.container_number = c.containerNumber'
    )
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus NOT IN (:...excludedStatuses)', {
      excludedStatuses: ['picked_up', 'unloaded', 'returned_empty']
    })
    .andWhere('(tt.containerNumber IS NULL OR tt.pickupDate IS NULL)')
    .getRawOne();

  const lastPickupSum = parseInt(expiredCount.count) + parseInt(urgentCount.count) +
                        parseInt(warningCount.count) + parseInt(normalCount.count) + parseInt(noLastFreeDateCount.count);

  console.log('按最晚提柜各分类:');
  console.log(`  已超时: ${expiredCount.count}`);
  console.log(`  即将超时(1-3天): ${urgentCount.count}`);
  console.log(`  预警(4-7天): ${warningCount.count}`);
  console.log(`  时间充裕(7天以上): ${normalCount.count}`);
  console.log(`  缺最后免费日: ${noLastFreeDateCount.count}`);
  console.log(`按最晚提柜合计: ${lastPickupSum}`);

  // 4. 按最晚还箱分布（目标集：已提柜或有拖卡记录 + 未还箱状态）
  console.log('\n=== 按最晚还箱分布 ===');
  console.log('目标集：已提柜或有拖卡记录 + 未还箱状态');

  // 已超时
  const returnExpiredCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .leftJoin(EmptyReturn, 'er', 'er.containerNumber = c.containerNumber')
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus != :status', { status: 'returned_empty' })
    .andWhere('(c.logisticsStatus IN (:...statuses) OR tt.containerNumber IS NOT NULL)', {
      statuses: ['picked_up', 'unloaded']
    })
    .andWhere('er.returnTime IS NULL')
    .andWhere('er.lastReturnDate < :today', { today })
    .getRawOne();

  // 即将超时(1-3天)
  const returnUrgentCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .leftJoin(EmptyReturn, 'er', 'er.containerNumber = c.containerNumber')
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus != :status', { status: 'returned_empty' })
    .andWhere('(c.logisticsStatus IN (:...statuses) OR tt.containerNumber IS NOT NULL)', {
      statuses: ['picked_up', 'unloaded']
    })
    .andWhere('er.returnTime IS NULL')
    .andWhere('er.lastReturnDate >= :today', { today })
    .andWhere('er.lastReturnDate <= :threeDays', { threeDays: threeDaysLater })
    .getRawOne();

  // 预警(4-7天)
  const returnWarningCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .leftJoin(EmptyReturn, 'er', 'er.containerNumber = c.containerNumber')
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus != :status', { status: 'returned_empty' })
    .andWhere('(c.logisticsStatus IN (:...statuses) OR tt.containerNumber IS NOT NULL)', {
      statuses: ['picked_up', 'unloaded']
    })
    .andWhere('er.returnTime IS NULL')
    .andWhere('er.lastReturnDate > :threeDays', { threeDays: threeDaysLater })
    .andWhere('er.lastReturnDate <= :sevenDays', { sevenDays: sevenDaysLater })
    .getRawOne();

  // 还箱日倒计时>7天
  const returnNormalCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .leftJoin(EmptyReturn, 'er', 'er.containerNumber = c.containerNumber')
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus != :status', { status: 'returned_empty' })
    .andWhere('(c.logisticsStatus IN (:...statuses) OR tt.containerNumber IS NOT NULL)', {
      statuses: ['picked_up', 'unloaded']
    })
    .andWhere('er.returnTime IS NULL')
    .andWhere('er.lastReturnDate > :sevenDays', { sevenDays: sevenDaysLater })
    .getRawOne();

  // 缺最后还箱日
  const returnNoLastReturnDateCount = await containerRepo
    .createQueryBuilder('c')
    .select('COUNT(DISTINCT c.containerNumber)', 'count')
    .leftJoin(EmptyReturn, 'er', 'er.containerNumber = c.containerNumber')
    .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = c.containerNumber')
    .where('c.logisticsStatus != :status', { status: 'returned_empty' })
    .andWhere('(c.logisticsStatus IN (:...statuses) OR tt.containerNumber IS NOT NULL)', {
      statuses: ['picked_up', 'unloaded']
    })
    .andWhere('er.returnTime IS NULL')
    .andWhere('er.lastReturnDate IS NULL')
    .getRawOne();

  const returnSum = parseInt(returnExpiredCount.count) + parseInt(returnUrgentCount.count) +
                   parseInt(returnWarningCount.count) + parseInt(returnNormalCount.count) + parseInt(returnNoLastReturnDateCount.count);

  console.log('按最晚还箱各分类:');
  console.log(`  已超时: ${returnExpiredCount.count}`);
  console.log(`  即将超时(1-3天): ${returnUrgentCount.count}`);
  console.log(`  预警(4-7天): ${returnWarningCount.count}`);
  console.log(`  还箱日倒计时>7天: ${returnNormalCount.count}`);
  console.log(`  缺最后还箱日: ${returnNoLastReturnDateCount.count}`);
  console.log(`按最晚还箱合计: ${returnSum}`);

  // 5. 一致性检查
  console.log('\n=== 一致性检查 ===');

  // 检查1：按到港的"今日之前到港未提柜"应该包含在按最晚提柜中
  console.log('\n检查1：按到港的"今日之前到港未提柜" vs 按最晚提柜合计');
  console.log(`  按到港 - 今日之前到港未提柜: ${arrivedBeforeTodayNotPickedUp.count}`);
  console.log(`  按最晚提柜 - 合计: ${lastPickupSum}`);
  const diff1 = parseInt(arrivedBeforeTodayNotPickedUp.count) - lastPickupSum;
  console.log(`  差异: ${diff1}`);

  if (diff1 !== 0) {
    console.log(`  ❌ 不一致！差异为 ${diff1}`);
  } else {
    console.log(`  ✅ 一致`);
  }

  // 检查2：按到港的"今日之前到港已提柜"应该与按最晚还箱的基数相关
  console.log('\n检查2：按到港的"今日之前到港已提柜" vs 按最晚还箱合计');
  console.log(`  按到港 - 今日之前到港已提柜: ${arrivedBeforeTodayPickedUp.count}`);
  console.log(`  按最晚还箱 - 合计: ${returnSum}`);
  const diff2 = parseInt(arrivedBeforeTodayPickedUp.count) - returnSum;
  console.log(`  差异: ${diff2}`);

  if (diff2 !== 0) {
    console.log(`  ⚠️  注意：这两个数不一定完全一致，因为还箱统计还包括有拖卡记录的货柜`);
  } else {
    console.log(`  ✅ 一致`);
  }

  // 检查3：按到港合计
  console.log('\n检查3：按到港各分类合计');
  const diff3 = parseInt(totalTarget.count) - arrivalSum;
  if (diff3 !== 0) {
    console.log(`  ❌ 不一致！目标集 ${parseInt(totalTarget.count)} != 计算值 ${arrivalSum}，差异 ${diff3}`);
  } else {
    console.log(`  ✅ 一致`);
  }

  await AppDataSource.destroy();
  console.log('\n诊断完成！');
}

diagnoseStatisticsConsistency().catch(console.error);

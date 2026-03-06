/**
 * 统计数据差异诊断脚本
 * 用于检查各维度统计数据与实际数据的不一致问题
 */

import { AppDataSource } from '../src/database';
import { Container } from '../src/entities/Container';
import { TruckingTransport } from '../src/entities/TruckingTransport';
import { EmptyReturn } from '../src/entities/EmptyReturn';

interface DiagnosisResult {
  testName: string;
  expected: string;
  actual: number;
  diff: string;
  details: string;
}

async function diagnoseStatistics() {
  console.log('='.repeat(80));
  console.log('统计数据差异诊断');
  console.log('='.repeat(80));

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const containerRepository = AppDataSource.getRepository(Container);
  const truckingRepository = AppDataSource.getRepository(TruckingTransport);
  const emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

  const results: DiagnosisResult[] = [];

  // ========== 问题1: 3天内预计到港 vs 7天内预计到港 ==========
  console.log('\n📌 问题1: ETA分组统计差异');
  console.log('-'.repeat(80));

  // 3天内预计到港 - 实际查询
  const within3DaysQuery = `
    SELECT COUNT(DISTINCT c.container_number)
    FROM containers c
    INNER JOIN (
      SELECT DISTINCT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NULL
      AND po1.eta_dest_port IS NOT NULL
      AND po1.eta_dest_port >= '${todayStr}'
      AND po1.eta_dest_port <= '${threeDaysStr}'
    ) dest_po ON dest_po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  `;

  const within3DaysResult = await AppDataSource.query(within3DaysQuery);
  const within3DaysActual = parseInt(within3DaysResult[0].count);

  console.log(`3天内预计到港 (实际查询): ${within3DaysActual}`);

  // 7天内预计到港 - 实际查询
  const within7DaysQuery = `
    SELECT COUNT(DISTINCT c.container_number)
    FROM containers c
    INNER JOIN (
      SELECT DISTINCT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NULL
      AND po1.eta_dest_port IS NOT NULL
      AND po1.eta_dest_port > '${threeDaysStr}'
      AND po1.eta_dest_port <= '${sevenDaysStr}'
    ) dest_po ON dest_po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  `;

  const within7DaysResult = await AppDataSource.query(within7DaysQuery);
  const within7DaysActual = parseInt(within7DaysResult[0].count);

  console.log(`7天内预计到港 (实际查询): ${within7DaysActual}`);

  // 详细查看ETA数据
  console.log('\n📊 ETA数据详情 (shipped/in_transit/at_port, port_type=destination):');
  const etaDetailQuery = `
    SELECT
      c.container_number,
      c.logistics_status,
      po.eta_dest_port,
      po.ata_dest_port,
      po.port_type,
      po.port_sequence
    FROM containers c
    INNER JOIN process_port_operations po ON po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
    AND po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NOT NULL
    ORDER BY po.eta_dest_port ASC
    LIMIT 20
  `;

  const etaDetails = await AppDataSource.query(etaDetailQuery);
  console.log('前20条ETA记录:');
  etaDetails.forEach((row: any, idx: number) => {
    console.log(`  ${idx + 1}. ${row.container_number} | ${row.logistics_status} | ETA: ${row.eta_dest_port?.toISOString?.split?.('T')?.[0] || row.eta_dest_port} | port_sequence: ${row.port_sequence}`);
  });

  results.push({
    testName: '3天内预计到港',
    expected: '应该有46条',
    actual: within3DaysActual,
    diff: `${within3DaysActual - 46}`,
    details: `实际查询: ${within3DaysActual}, 用户报告: 22`
  });

  results.push({
    testName: '7天内预计到港',
    expected: '应该有15条',
    actual: within7DaysActual,
    diff: `${within7DaysActual - 15}`,
    details: `实际查询: ${within7DaysActual}, 用户报告: 3`
  });

  // ========== 问题2: 已逾期未到港 ==========
  console.log('\n📌 问题2: 已逾期未到港统计差异');
  console.log('-'.repeat(80));

  const overdueQuery = `
    SELECT COUNT(DISTINCT c.container_number)
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NULL
      AND po1.eta_dest_port IS NOT NULL
      AND (po1.eta_dest_port < '${todayStr}' OR po1.eta_correction < '${todayStr}')
      AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
      )
    ) dest_po ON dest_po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  `;

  const overdueResult = await AppDataSource.query(overdueQuery);
  const overdueActual = parseInt(overdueResult[0].count);

  console.log(`已逾期未到港 (实际查询): ${overdueActual}`);

  // 查看逾期详情
  console.log('\n📊 逾期ETA详情:');
  const overdueDetailQuery = `
    SELECT
      c.container_number,
      c.logistics_status,
      po.eta_dest_port,
      po.ata_dest_port,
      po.port_type,
      po.port_sequence
    FROM containers c
    INNER JOIN process_port_operations po ON po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
    AND po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NOT NULL
    AND po.eta_dest_port < '${todayStr}'
    ORDER BY po.eta_dest_port ASC
    LIMIT 20
  `;

  const overdueDetails = await AppDataSource.query(overdueDetailQuery);
  console.log('前20条逾期记录:');
  overdueDetails.forEach((row: any, idx: number) => {
    console.log(`  ${idx + 1}. ${row.container_number} | ${row.logistics_status} | ETA: ${row.eta_dest_port?.toISOString?.split?.('T')?.[0] || row.eta_dest_port} | port_sequence: ${row.port_sequence}`);
  });

  results.push({
    testName: '已逾期未到港',
    expected: '应该有34条',
    actual: overdueActual,
    diff: `${overdueActual - 34}`,
    details: `实际查询: ${overdueActual}, 用户报告: 42`
  });

  // ========== 问题3: 今日之前到港已提柜 ==========
  console.log('\n📌 问题3: 今日之前到港已提柜统计差异');
  console.log('-'.repeat(80));

  // 已到目的港的货柜总数
  const arrivedBeforeTodayQuery = `
    SELECT COUNT(DISTINCT c.container_number)
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    WHERE DATE(latest_po.latest_ata) < '${todayStr}'
  `;

  const arrivedBeforeTodayResult = await AppDataSource.query(arrivedBeforeTodayQuery);
  const arrivedBeforeTodayTotal = parseInt(arrivedBeforeTodayResult[0].count);

  console.log(`今日之前到港的总数: ${arrivedBeforeTodayTotal}`);

  // 今日之前到港已提柜
  const arrivedBeforeTodayPickedUpQuery = `
    SELECT COUNT(DISTINCT c.container_number)
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    WHERE DATE(latest_po.latest_ata) < '${todayStr}'
    AND c.logistics_status IN ('picked_up', 'unloaded', 'returned_empty')
  `;

  const arrivedBeforeTodayPickedUpResult = await AppDataSource.query(arrivedBeforeTodayPickedUpQuery);
  const arrivedBeforeTodayPickedUpActual = parseInt(arrivedBeforeTodayPickedUpResult[0].count);

  console.log(`今日之前到港已提柜 (实际查询): ${arrivedBeforeTodayPickedUpActual}`);

  // 今日之前到港未提柜
  const arrivedBeforeTodayNotPickedUpQuery = `
    SELECT COUNT(DISTINCT c.container_number)
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    WHERE DATE(latest_po.latest_ata) < '${todayStr}'
    AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')
  `;

  const arrivedBeforeTodayNotPickedUpResult = await AppDataSource.query(arrivedBeforeTodayNotPickedUpQuery);
  const arrivedBeforeTodayNotPickedUpActual = parseInt(arrivedBeforeTodayNotPickedUpResult[0].count);

  console.log(`今日之前到港未提柜 (实际查询): ${arrivedBeforeTodayNotPickedUpActual}`);
  console.log(`验证总和: ${arrivedBeforeTodayPickedUpActual} + ${arrivedBeforeTodayNotPickedUpActual} = ${arrivedBeforeTodayPickedUpActual + arrivedBeforeTodayNotPickedUpActual}`);

  // 状态为at_port的货柜数
  const atPortQuery = `SELECT COUNT(*) as count FROM containers WHERE logistics_status = 'at_port'`;
  const atPortResult = await AppDataSource.query(atPortQuery);
  const atPortCount = parseInt(atPortResult[0].count);

  console.log(`\n状态为at_port的货柜数: ${atPortCount}`);

  // 查看今日之前到港货柜的状态分布
  console.log('\n📊 今日之前到港货柜的状态分布:');
  const statusDistributionQuery = `
    SELECT
      c.logistics_status,
      COUNT(DISTINCT c.container_number) as count
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    WHERE DATE(latest_po.latest_ata) < '${todayStr}'
    GROUP BY c.logistics_status
    ORDER BY count DESC
  `;

  const statusDistribution = await AppDataSource.query(statusDistributionQuery);
  console.log('状态分布:');
  statusDistribution.forEach((row: any) => {
    console.log(`  ${row.logistics_status}: ${row.count}`);
  });

  results.push({
    testName: '今日之前到港已提柜',
    expected: '应该有173条',
    actual: arrivedBeforeTodayPickedUpActual,
    diff: `${arrivedBeforeTodayPickedUpActual - 173}`,
    details: `实际查询: ${arrivedBeforeTodayPickedUpActual}, 用户报告: 空值`
  });

  // ========== 问题4: 已到目的港92条 vs 今日之前到港未提柜46条 ==========
  console.log('\n📌 问题4: 已到目的港状态差异');
  console.log('-'.repeat(80));

  // 已到目的港的货柜 (状态为at_port)
  const atPortCount2 = parseInt(atPortResult[0].count);
  console.log(`已到目的港状态 (at_port): ${atPortCount2}`);

  // 今日之前到港未提柜
  console.log(`今日之前到港未提柜: ${arrivedBeforeTodayNotPickedUpActual}`);

  // 查看at_port状态货柜的详细情况
  console.log('\n📊 at_port状态货柜的ATA分布:');
  const atPortDetailQuery = `
    SELECT
      c.container_number,
      c.logistics_status,
      po.ata_dest_port,
      po.port_type,
      po.port_sequence
    FROM containers c
    INNER JOIN process_port_operations po ON po.container_number = c.container_number
    WHERE c.logistics_status = 'at_port'
    AND po.port_type = 'destination'
    ORDER BY po.ata_dest_port DESC
    LIMIT 20
  `;

  const atPortDetails = await AppDataSource.query(atPortDetailQuery);
  console.log('前20条at_port记录:');
  atPortDetails.forEach((row: any, idx: number) => {
    console.log(`  ${idx + 1}. ${row.container_number} | ATA: ${row.ata_dest_port?.toISOString?.split?.('T')?.[0] || row.ata_dest_port} | port_sequence: ${row.port_sequence}`);
  });

  const difference = atPortCount2 - arrivedBeforeTodayNotPickedUpActual;
  console.log(`\n差异分析: ${atPortCount2} (at_port) - ${arrivedBeforeTodayNotPickedUpActual} (今日之前到港未提柜) = ${difference}`);

  // 查找那些at_port但不在"今日之前到港"中的货柜
  console.log('\n📊 at_port但不在今日之前到港未提柜中的货柜:');
  const atPortButNotIncludedQuery = `
    SELECT
      c.container_number,
      c.logistics_status,
      po.ata_dest_port,
      po.port_type,
      po.port_sequence
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    INNER JOIN process_port_operations po ON po.container_number = c.container_number
    WHERE c.logistics_status = 'at_port'
    AND po.port_type = 'destination'
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = c.container_number
      AND po2.port_type = 'destination'
    )
    AND (DATE(latest_po.latest_ata) >= '${todayStr}' OR latest_po.latest_ata IS NULL)
    ORDER BY po.ata_dest_port DESC
    LIMIT 20
  `;

  const atPortButNotIncluded = await AppDataSource.query(atPortButNotIncludedQuery);
  console.log(`找到 ${atPortButNotIncluded.length} 条记录:`);
  atPortButNotIncluded.forEach((row: any, idx: number) => {
    console.log(`  ${idx + 1}. ${row.container_number} | ATA: ${row.ata_dest_port?.toISOString?.split?.('T')?.[0] || row.ata_dest_port || 'NULL'} | port_sequence: ${row.port_sequence}`);
  });

  results.push({
    testName: 'at_port vs 今日之前到港未提柜',
    expected: `at_port(${atPortCount2}) 应该等于 今日之前到港未提柜`,
    actual: arrivedBeforeTodayNotPickedUpActual,
    diff: `${difference}`,
    details: `at_port: ${atPortCount2}, 今日之前到港未提柜: ${arrivedBeforeTodayNotPickedUpActual}, 差异: ${difference}`
  });

  // ========== 输出总结 ==========
  console.log('\n' + '='.repeat(80));
  console.log('诊断总结');
  console.log('='.repeat(80));
  console.log('');

  results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.testName}`);
    console.log(`   预期: ${result.expected}`);
    console.log(`   实际: ${result.actual}`);
    console.log(`   差异: ${result.diff}`);
    console.log(`   详情: ${result.details}`);
    console.log('');
  });

  await AppDataSource.destroy();
}

diagnoseStatistics().catch(console.error);

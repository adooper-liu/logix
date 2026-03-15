/**
 * 单柜排柜流程模拟
 * 用一条柜子模拟智能排柜全流程（可 dry-run 或实际执行）
 *
 * 运行:
 *   cd backend && npx tsx scripts/simulate-schedule-one.ts [柜号]
 *   cd backend && npx tsx scripts/simulate-schedule-one.ts [柜号] --execute  # 实际写库
 *
 * 示例:
 *   npx tsx scripts/simulate-schedule-one.ts
 *   npx tsx scripts/simulate-schedule-one.ts TEMU1234567
 *   npx tsx scripts/simulate-schedule-one.ts TEMU1234567 --execute
 */

import path from 'path';
import * as dotenv from 'dotenv';

const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);
dotenv.config({ path: path.join(backendDir, '..', '.env') });
dotenv.config({ path: path.join(backendDir, '.env.dev'), override: true });
if (process.env.DB_HOST === 'postgres') process.env.DB_HOST = 'localhost';

async function main() {
  const containerNumber = process.argv[2] || null;
  const execute = process.argv.includes('--execute');

  const { AppDataSource, Container } = await import('../src/database');
  const { intelligentSchedulingService } = await import('../src/services/intelligentScheduling.service');

  await AppDataSource.initialize();

  console.log('\n========== 排柜流程模拟 ==========\n');
  console.log(`模式: ${execute ? '实际执行（写库）' : 'Dry-run（仅模拟，不写库）'}`);
  if (containerNumber) {
    console.log(`指定柜号: ${containerNumber}`);
  } else {
    console.log('未指定柜号，将查找第一条符合条件的待排产柜');
  }
  console.log('');

  try {
    // 1. 查找待排产货柜
    const containerRepo = AppDataSource.getRepository(Container);
    let query = containerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.portOperations', 'po')
      .leftJoinAndSelect('c.seaFreight', 'sf')
      .leftJoinAndSelect('c.replenishmentOrders', 'o')
      .where('c.scheduleStatus = :status', { status: 'initial' });

    if (containerNumber) {
      query = query.andWhere('c.containerNumber = :cn', { cn: containerNumber });
    }

    const containers = await query.getMany();

    // 过滤：必须有目的港 ATA 或 ETA
    const eligible = containers.filter((c) => {
      const destPo = c.portOperations?.find((p: any) => p.portType === 'destination');
      return destPo && (destPo.ataDestPort || destPo.etaDestPort);
    });

    if (eligible.length === 0) {
      console.log('❌ 未找到符合条件的货柜。');
      console.log('   条件: schedule_status=initial，且有目的港 ATA 或 ETA');
      if (containerNumber) {
        console.log(`   指定柜号 ${containerNumber} 可能不存在、已排产、或无到港日期`);
      }
      process.exit(1);
    }

    const target = containerNumber ? eligible.find((c) => c.containerNumber === containerNumber) : eligible[0];
    if (!target) {
      console.log(`❌ 柜号 ${containerNumber} 不符合排产条件`);
      process.exit(1);
    }

    const destPo = target.portOperations?.find((p: any) => p.portType === 'destination') as any;
    const clearanceDate = destPo?.ataDestPort || destPo?.etaDestPort;

    console.log('--- 输入货柜 ---');
    console.log(`柜号: ${target.containerNumber}`);
    console.log(`目的国: ${(target as any).replenishmentOrders?.[0]?.sellToCountry || '-'}`);
    console.log(`目的港: ${destPo?.portCode || target.seaFreight?.portOfDischarge || '-'}`);
    console.log(`清关可放行日(ATA/ETA): ${clearanceDate ? new Date(clearanceDate).toISOString().split('T')[0] : '-'}`);
    console.log(`最晚提柜日: ${destPo?.lastFreeDate ? new Date(destPo.lastFreeDate).toISOString().split('T')[0] : '-'}`);
    console.log('');

    if (!execute) {
      console.log('--- Dry-run: 将执行以下逻辑 ---');
      console.log('1. 计划清关日 = 清关可放行日');
      console.log('2. 计划提柜日 = 清关日 + 1 天，且 ≤ last_free_date');
      console.log('3. 按国家选候选仓库 → 找最早可用卸柜日');
      console.log('4. 计划送仓日 = 卸柜日 - 1 天 (Drop off)');
      console.log('5. 计划还箱日 = 卸柜日 + 1 天');
      console.log('6. 按仓库×港口映射选车队');
      console.log('7. 写回 process_* 表，扣减资源占用');
      console.log('');
      console.log('如需实际执行，请加参数: --execute');
      process.exit(0);
    }

    // 2. 实际执行：仅排这一柜
    const dateStr = clearanceDate ? new Date(clearanceDate).toISOString().split('T')[0] : '';
    const result = await intelligentSchedulingService.batchSchedule({
      startDate: dateStr,
      endDate: dateStr,
      country: (target as any).replenishmentOrders?.[0]?.sellToCountry,
      containerNumbers: [target.containerNumber]
    });

    console.log('--- 执行结果 ---');
    console.log(`总数: ${result.total}, 成功: ${result.successCount}, 失败: ${result.failedCount}`);
    const thisResult = result.results.find((r) => r.containerNumber === target.containerNumber);
    if (thisResult) {
      if (thisResult.success) {
        console.log(`✅ 柜号 ${thisResult.containerNumber} 排产成功`);
        if (thisResult.plannedData) {
          console.log('   计划数据:');
          Object.entries(thisResult.plannedData).forEach(([k, v]) => {
            if (v) console.log(`     ${k}: ${v}`);
          });
        }
      } else {
        console.log(`❌ 柜号 ${thisResult.containerNumber} 排产失败: ${thisResult.message}`);
      }
    }
    console.log('\n========== 模拟结束 ==========\n');
  } catch (err: any) {
    console.error('模拟失败:', err.message);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main();

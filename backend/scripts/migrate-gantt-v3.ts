/**
 * 甘特图 gantt-v3 数据迁移脚本
 * 批量更新所有货柜的 gantt_derived 字段，应用反向链式依赖逻辑
 *
 * 使用方法:
 * cd backend
 * npx ts-node scripts/migrate-gantt-v3.ts
 */

// 加载环境变量
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { AppDataSource } from '../src/database';
import { Container } from '../src/entities/Container';
import { EmptyReturn } from '../src/entities/EmptyReturn';
import { PortOperation } from '../src/entities/PortOperation';
import { TruckingTransport } from '../src/entities/TruckingTransport';
import { WarehouseOperation } from '../src/entities/WarehouseOperation';
import { buildGanttDerived } from '../src/utils/ganttDerivedBuilder';
import { logger } from '../src/utils/logger';

async function migrateGanttV3() {
  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    logger.info('数据库连接成功');

    // 查询所有货柜
    const containers = await AppDataSource.manager.find(Container);

    logger.info(`找到 ${containers.length} 个货柜`);

    // 测试货柜列表（用于调试）
    const sampleContainers = [
      'HMMU6855127',
      'GAOU6195045',
      'KOCU5129260',
      'HMMU6232153',
      'HMMU6019657'
    ];

    let updatedCount = 0;
    let skippedCount = 0;

    for (const container of containers) {
      // 手动查询关联的流程表数据
      const portOperations = await AppDataSource.manager.find(PortOperation, {
        where: { containerNumber: container.containerNumber }
      });
      const truckingTransports = await AppDataSource.manager.find(TruckingTransport, {
        where: { containerNumber: container.containerNumber }
      });
      const warehouseOperations = await AppDataSource.manager.find(WarehouseOperation, {
        where: { containerNumber: container.containerNumber }
      });
      const emptyReturns = await AppDataSource.manager.find(EmptyReturn, {
        where: { containerNumber: container.containerNumber }
      });

      // 构建 ganttDerived
      const ganttDerived = buildGanttDerived(
        portOperations,
        truckingTransports?.[0] || null,
        warehouseOperations?.[0] || null,
        emptyReturns?.[0] || null
      );

      // 检查是否需要更新（比较 ruleVersion）
      const prevGantt = container.ganttDerived as any;

      // 修复：强制重新计算所有货柜，因为即使 ruleVersion 是 gantt-v3，数据也可能是旧的
      // 我们需要应用新的反向链式依赖逻辑
      const needsUpdate = true; // 强制更新

      if (!needsUpdate) {
        skippedCount++;
        continue;
      }

      // 更新 ganttDerived
      container.ganttDerived = ganttDerived as any;
      await AppDataSource.manager.save(container);
      updatedCount++;

      // 调试：如果是测试货柜，立即打印新计算的结果
      if (sampleContainers.includes(container.containerNumber)) {
        const customsNode = ganttDerived.nodes?.find((n: any) => n.key === 'customs');
        logger.info(`\n[DEBUG] ${container.containerNumber} 新计算结果:`);
        logger.info(`  pickupDate: ${truckingTransports?.[0]?.pickupDate}`);
        logger.info(`  deliveryDate: ${truckingTransports?.[0]?.deliveryDate}`);
        logger.info(`  customs taskRole: ${customsNode?.taskRole}`);
      }

      if (updatedCount % 100 === 0) {
        logger.info(`已更新 ${updatedCount} 个货柜...`);
      }
    }

    logger.info(`迁移完成！`);
    logger.info(`  更新: ${updatedCount}`);
    logger.info(`  跳过: ${skippedCount}`);
    logger.info(`  总计: ${containers.length}`);

    // 验证几个示例货柜
    for (const containerNumber of sampleContainers) {
      const container = await AppDataSource.manager.findOne(Container, {
        where: { containerNumber }
      });

      if (container) {
        const gantt = container.ganttDerived as any;
        const customsNode = gantt?.nodes?.find((n: any) => n.key === 'customs');

        logger.info(`\n货柜 ${containerNumber}:`);
        logger.info(`  Phase: ${gantt?.phase}`);
        logger.info(`  Rule Version: ${gantt?.ruleVersion}`);
        logger.info(`  Customs Node:`);
        logger.info(`    taskRole: ${customsNode?.taskRole}`);
        logger.info(`    completed: ${customsNode?.completed}`);
      }
    }
  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await AppDataSource.destroy();
    logger.info('数据库连接已关闭');
  }
}

// 执行迁移
migrateGanttV3().catch((error) => {
  logger.error('未捕获的错误:', error);
  process.exit(1);
});

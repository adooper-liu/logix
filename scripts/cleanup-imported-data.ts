/**
 * 清理导入的数据脚本
 * 用于删除指定订单或货柜的所有相关数据
 *
 * 使用方法:
 * npx tsx scripts/cleanup-imported-data.ts <containerNumber|orderNumber> [--force]
 *
 * 示例:
 * npx tsx scripts/cleanup-imported-data.ts FANU3376528
 * npx tsx scripts/cleanup-imported-data.ts 24DSC4914
 * npx tsx scripts/cleanup-imported-data.ts FANU3376528 --force
 */

import { AppDataSource } from '../src/database';
import {
  Container,
  ReplenishmentOrder,
  SeaFreight,
  PortOperation,
  TruckingTransport,
  WarehouseOperation,
  EmptyReturn
} from '../src/entities';
import { logger } from '../src/utils/logger';

interface CleanupResult {
  identifier: string;
  type: 'container' | 'order';
  affectedTables: {
    tableName: string;
    deletedCount: number;
  }[];
  success: boolean;
  errors: string[];
}

/**
 * 清理货柜的所有相关数据
 */
async function cleanupContainerData(containerNumber: string, force: boolean): Promise<CleanupResult> {
  const result: CleanupResult = {
    identifier: containerNumber,
    type: 'container',
    affectedTables: [],
    success: true,
    errors: []
  };

  try {
    // 开启事务
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // 记录删除的货柜号（用于删除备货单）
      let orderNumber: string | null = null;

      // 1. 删除货柜（获取关联的备货单号）
      const container = await manager.findOne(Container, { where: { containerNumber } });
      if (container) {
        orderNumber = container.orderNumber;
        const deleteResult = await manager.delete(Container, { containerNumber });
        result.affectedTables.push({
          tableName: 'biz_containers',
          deletedCount: deleteResult.affected || 0
        });
      }

      // 2. 删除海运信息
      const seaFreight = await manager.delete(SeaFreight, { containerNumber });
      result.affectedTables.push({
        tableName: 'process_sea_freight',
        deletedCount: seaFreight.affected || 0
      });

      // 3. 删除港口操作
      const portOps = await manager.delete(PortOperation, { containerNumber });
      result.affectedTables.push({
        tableName: 'process_port_operations',
        deletedCount: portOps.affected || 0
      });

      // 4. 删除拖车运输
      const trucking = await manager.delete(TruckingTransport, { containerNumber });
      result.affectedTables.push({
        tableName: 'process_trucking_transport',
        deletedCount: trucking.affected || 0
      });

      // 5. 删除仓库操作
      const warehouse = await manager.delete(WarehouseOperation, { containerNumber });
      result.affectedTables.push({
        tableName: 'process_warehouse_operations',
        deletedCount: warehouse.affected || 0
      });

      // 6. 删除还空箱
      const emptyReturn = await manager.delete(EmptyReturn, { containerNumber: containerNumber });
      result.affectedTables.push({
        tableName: 'process_empty_returns',
        deletedCount: emptyReturn.affected || 0
      });

      // 7. 删除备货单（如果 --force 或备货单下没有其他货柜）
      if (orderNumber) {
        // 检查备货单下是否还有其他货柜
        const remainingContainers = await manager.count(Container, {
          where: { orderNumber }
        });

        if (force || remainingContainers === 0) {
          const deleteOrder = await manager.delete(ReplenishmentOrder, { orderNumber });
          result.affectedTables.push({
            tableName: 'biz_replenishment_orders',
            deletedCount: deleteOrder.affected || 0
          });
        } else {
          result.errors.push(`备货单 ${orderNumber} 下还有其他 ${remainingContainers} 个货柜，未删除（使用 --force 强制删除）`);
        }
      }

      await queryRunner.commitTransaction();

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`清理失败: ${error}`);
  }

  return result;
}

/**
 * 清理备货单的所有相关数据（包括下所有货柜）
 */
async function cleanupOrderData(orderNumber: string, force: boolean): Promise<CleanupResult> {
  const result: CleanupResult = {
    identifier: orderNumber,
    type: 'order',
    affectedTables: [],
    success: true,
    errors: []
  };

  try {
    // 开启事务
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // 1. 查询备货单下的所有货柜
      const containers = await manager.find(Container, {
        where: { orderNumber },
        select: ['containerNumber']
      });

      if (containers.length === 0) {
        result.errors.push(`备货单 ${orderNumber} 下没有货柜`);
        result.success = false;
        return result;
      }

      console.log(`\n备货单 ${orderNumber} 下有 ${containers.length} 个货柜:`);
      containers.forEach(c => console.log(`  - ${c.containerNumber}`));

      if (!force) {
        console.log('\n提示: 使用 --force 参数确认删除备货单及其所有货柜的完整数据');
        result.success = false;
        result.errors.push('未使用 --force 参数');
        return result;
      }

      // 2. 删除所有货柜的相关数据
      for (const container of containers) {
        // 删除海运
        await manager.delete(SeaFreight, { containerNumber: container.containerNumber });
        // 删除港口操作
        await manager.delete(PortOperation, { containerNumber: container.containerNumber });
        // 删除拖车
        await manager.delete(TruckingTransport, { containerNumber: container.containerNumber });
        // 删除仓库
        await manager.delete(WarehouseOperation, { containerNumber: container.containerNumber });
        // 删除还空箱
        await manager.delete(EmptyReturn, { containerNumber: container.containerNumber });

        result.affectedTables.push({
          tableName: `货柜 ${container.containerNumber} 的子表`,
          deletedCount: 5
        });
      }

      // 3. 删除所有货柜
      const deleteContainers = await manager.delete(Container, { orderNumber });
      result.affectedTables.push({
        tableName: 'biz_containers',
        deletedCount: deleteContainers.affected || 0
      });

      // 4. 删除备货单
      const deleteOrder = await manager.delete(ReplenishmentOrder, { orderNumber });
      result.affectedTables.push({
        tableName: 'biz_replenishment_orders',
        deletedCount: deleteOrder.affected || 0
      });

      await queryRunner.commitTransaction();

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`清理失败: ${error}`);
  }

  return result;
}

/**
 * 格式化输出清理结果
 */
function formatCleanupResult(result: CleanupResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('数据清理结果');
  console.log('='.repeat(80));
  console.log(`标识符: ${result.identifier} (${result.type === 'container' ? '货柜' : '备货单'})`);
  console.log('');

  if (result.success) {
    console.log('✅ 清理成功\n');

    console.log('受影响的表:');
    let totalDeleted = 0;
    result.affectedTables.forEach(table => {
      console.log(`  - ${table.tableName}: 删除 ${table.deletedCount} 条记录`);
      totalDeleted += table.deletedCount;
    });
    console.log(`\n总计删除: ${totalDeleted} 条记录`);

  } else {
    console.log('❌ 清理失败\n');

    console.log('错误信息:');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  npx tsx scripts/cleanup-imported-data.ts <containerNumber|orderNumber> [--force]');
    console.log('');
    console.log('示例:');
    console.log('  npx tsx scripts/cleanup-imported-data.ts FANU3376528');
    console.log('  npx tsx scripts/cleanup-imported-data.ts 24DSC4914');
    console.log('  npx tsx scripts/cleanup-imported-data.ts FANU3376528 --force');
    console.log('');
    console.log('说明:');
    console.log('  --force: 强制删除（用于删除备货单时，会删除备货单下所有货柜）');
    process.exit(1);
  }

  const identifier = args[0];
  const force = args.includes('--force');

  // 二次确认
  if (!force) {
    console.log(`\n⚠️  即将删除: ${identifier}`);
    console.log('此操作不可逆！');
    console.log('确认删除? (输入 YES 继续):');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('> ', resolve);
    });
    rl.close();

    if (answer !== 'YES') {
      console.log('操作已取消');
      process.exit(0);
    }
  }

  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    logger.info('数据库连接成功');

    let result: CleanupResult;

    // 判断是货柜号还是订单号
    if (identifier.match(/^[A-Z]{4}\d{7}$/i)) {
      // 货柜号格式: 4字母+7数字
      result = await cleanupContainerData(identifier, force);
    } else {
      // 订单号
      result = await cleanupOrderData(identifier, force);
    }

    // 输出清理结果
    formatCleanupResult(result);

    // 根据结果设置退出码
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    logger.error('清理失败:', error);
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// 运行主函数
main();

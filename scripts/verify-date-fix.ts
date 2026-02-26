/**
 * 验证重新导入后的日期准确性
 * 集装箱号: FANU3376528
 * 修复日期: 2026-02-26
 */

import { AppDataSource } from '../backend/src/database';

async function verifyDateAccuracy() {
  await AppDataSource.initialize();
  console.log('数据库连接成功\n');

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('='.repeat(80));
    console.log('日期准确性验证报告 - 集装箱 FANU3376528');
    console.log('='.repeat(80));
    console.log('');

    let totalFields = 0;
    let accurateFields = 0;
    let inaccurateFields = 0;

    const comparisons = [
      // 海运表
      {
        table: '海运表',
        field: 'shipment_date',
        sql: `SELECT shipment_date FROM process_sea_freight WHERE container_number = 'FANU3376528'`,
        excelValue: '2025-03-30 00:00:00'
      },
      {
        table: '海运表',
        field: 'eta',
        sql: `SELECT eta FROM process_sea_freight WHERE container_number = 'FANU3376528'`,
        excelValue: '2025-05-09 00:00:00'
      },
      {
        table: '海运表',
        field: 'mother_shipment_date',
        sql: `SELECT mother_shipment_date FROM process_sea_freight WHERE container_number = 'FANU3376528'`,
        excelValue: '2025-04-07 00:00:00'
      },

      // 港口操作表
      {
        table: '港口操作表',
        field: 'eta_dest_port',
        sql: `SELECT eta_dest_port FROM process_port_operations WHERE container_number = 'FANU3376528' AND port_type = 'destination'`,
        excelValue: '2025-05-09 00:00:00'
      },
      {
        table: '港口操作表',
        field: 'ata_dest_port',
        sql: `SELECT ata_dest_port FROM process_port_operations WHERE container_number = 'FANU3376528' AND port_type = 'destination'`,
        excelValue: '2025-05-17 00:18:00'
      },
      {
        table: '港口操作表',
        field: 'dest_port_unload_date',
        sql: `SELECT dest_port_unload_date FROM process_port_operations WHERE container_number = 'FANU3376528' AND port_type = 'destination'`,
        excelValue: '2025-05-17 00:18:00'
      },
      {
        table: '港口操作表',
        field: 'planned_customs_date',
        sql: `SELECT planned_customs_date FROM process_port_operations WHERE container_number = 'FANU3376528' AND port_type = 'destination'`,
        excelValue: '2025-05-06 00:00:00'
      },
      {
        table: '港口操作表',
        field: 'isf_declaration_date',
        sql: `SELECT isf_declaration_date FROM process_port_operations WHERE container_number = 'FANU3376528' AND port_type = 'destination'`,
        excelValue: '2025-03-26 21:00:23'
      },

      // 仓库操作表
      {
        table: '仓库操作表',
        field: 'warehouse_arrival_date',
        sql: `SELECT warehouse_arrival_date FROM process_warehouse_operations WHERE container_number = 'FANU3376528'`,
        excelValue: '2025-05-31 11:38:58'
      },
      {
        table: '仓库操作表',
        field: 'planned_unload_date',
        sql: `SELECT planned_unload_date FROM process_warehouse_operations WHERE container_number = 'FANU3376528'`,
        excelValue: '2025-05-28 00:00:00'
      },
      {
        table: '仓库操作表',
        field: 'wms_confirm_date',
        sql: `SELECT wms_confirm_date FROM process_warehouse_operations WHERE container_number = 'FANU3376528'`,
        excelValue: '2025-05-28 05:00:47'
      },

      // 还空箱表
      {
        table: '还空箱表',
        field: 'last_return_date',
        sql: `SELECT last_return_date FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'`,
        excelValue: '2025-05-30 00:00:00'
      },
      {
        table: '还空箱表',
        field: 'planned_return_date',
        sql: `SELECT planned_return_date FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'`,
        excelValue: '2025-05-28 00:00:00'
      },
      {
        table: '还空箱表',
        field: 'return_time',
        sql: `SELECT return_time FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'`,
        excelValue: '2025-06-29 20:52:47'
      }
    ];

    for (const comp of comparisons) {
      const result = await queryRunner.query(comp.sql);
      const dbValue = result[0] ? result[0][Object.keys(result[0])[0]] : null;

      // 转换为字符串进行比较
      const dbValueStr = dbValue ? dbValue.toISOString().replace('T', ' ').substring(0, 19) : '(空)';
      const isMatch = dbValueStr === comp.excelValue;

      totalFields++;
      if (isMatch) {
        accurateFields++;
      } else {
        inaccurateFields++;
      }

      const status = isMatch ? '✅ 准确' : '❌ 偏差';
      console.log(`${status} ${comp.table}.${comp.field}`);
      console.log(`   Excel值: ${comp.excelValue}`);
      console.log(`   数据库值: ${dbValueStr}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('汇总统计');
    console.log('='.repeat(80));
    console.log(`总字段数: ${totalFields}`);
    console.log(`准确字段: ${accurateFields} (${((accurateFields / totalFields) * 100).toFixed(1)}%)`);
    console.log(`偏差字段: ${inaccurateFields} (${((inaccurateFields / totalFields) * 100).toFixed(1)}%)`);
    console.log('');

    if (inaccurateFields === 0) {
      console.log('🎉 所有日期字段验证通过! Excel与数据库完全一致!');
    } else {
      console.log('⚠️  存在偏差的字段,请检查日期解析逻辑');
    }

  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

verifyDateAccuracy().catch(console.error);

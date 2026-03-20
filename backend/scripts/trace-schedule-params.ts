/**
 * 智能排柜参数追踪
 * 根据柜号查找所有排柜所用参数，描述整个流程
 *
 * 运行: cd backend && npx tsx scripts/trace-schedule-params.ts MRSU3454770
 */

import path from 'path';
import * as dotenv from 'dotenv';

const backendDir = path.join(__dirname, '..');
process.chdir(backendDir);
dotenv.config({ path: path.join(backendDir, '..', '.env') });
dotenv.config({ path: path.join(backendDir, '.env.dev'), override: true });
if (process.env.DB_HOST === 'postgres') process.env.DB_HOST = 'localhost';

const CONTAINER = process.argv[2] || 'MRSU3454770';

async function main() {
  const { AppDataSource } = await import('../src/database');
  await AppDataSource.initialize();

  console.log('\n========== 智能排柜参数追踪 ==========');
  console.log(`柜号: ${CONTAINER}\n`);

  // 1. 货柜
  const container = await AppDataSource.query(
    `SELECT container_number, bill_of_lading_number, container_type_code, logistics_status, schedule_status
     FROM biz_containers WHERE container_number = $1`,
    [CONTAINER]
  );
  if (!container.length) {
    console.log('❌ 未找到该货柜');
    await AppDataSource.destroy();
    return;
  }
  console.log('1. 货柜基础信息:', container[0]);

  // 2. 备货单
  const orders = await AppDataSource.query(
    `SELECT order_number, sell_to_country, customer_code, customer_name
     FROM biz_replenishment_orders WHERE container_number = $1`,
    [CONTAINER]
  );
  console.log('\n2. 备货单 (sell_to_country → 国家):', orders);

  // 3. 客户 → country（与 resolveCountryCode 一致：customer_code 优先，否则 customer_name = sell_to_country）
  let countryCode: string | null = null;
  const countryByCode = await AppDataSource.query(
    `SELECT cust.country, cust.customer_name
     FROM biz_replenishment_orders o
     LEFT JOIN biz_customers cust ON cust.customer_code = o.customer_code
     WHERE o.container_number = $1 LIMIT 1`,
    [CONTAINER]
  );
  countryCode = countryByCode[0]?.country || null;
  if (!countryCode && orders[0]?.sell_to_country) {
    const byName = await AppDataSource.query(
      `SELECT country FROM biz_customers WHERE customer_name = $1`,
      [orders[0].sell_to_country]
    );
    countryCode = byName[0]?.country || null;
  }
  console.log('\n3. 国家代码 (countryCode):', countryCode, countryCode ? `(来自 ${orders[0]?.sell_to_country || 'customer_code'})` : '');

  // 4. 目的港操作
  const destPo = await AppDataSource.query(
    `SELECT port_code, port_name, eta, ata, last_free_date
     FROM process_port_operations
     WHERE container_number = $1 AND port_type = 'destination'`,
    [CONTAINER]
  );
  console.log('\n4. 目的港操作 (port_code, ATA/ETA, last_free_date):', destPo);

  const portCode = destPo[0]?.port_code;
  const clearanceDate = destPo[0]?.ata || destPo[0]?.eta;
  const lastFreeDate = destPo[0]?.last_free_date;

  // 5. 车队-港口映射
  const portMappings = countryCode && portCode
    ? await AppDataSource.query(
        `SELECT trucking_company_id, trucking_company_name FROM dict_trucking_port_mapping
         WHERE country = $1 AND port_code = $2 AND is_active = true`,
        [countryCode, portCode]
      )
    : [];
  console.log('\n5. 该国×港口 车队映射:', portMappings);

  // 6. 仓库-车队映射 → 候选仓库
  const truckingIds = portMappings.map((r: any) => r.trucking_company_id);
  let warehouses: any[] = [];
  if (countryCode) {
    if (truckingIds.length > 0) {
      const whCodes = await AppDataSource.query(
        `SELECT DISTINCT warehouse_code FROM dict_warehouse_trucking_mapping
         WHERE country = $1 AND trucking_company_id = ANY($2) AND is_active = true`,
        [countryCode, truckingIds]
      );
      const codes = whCodes.map((r: any) => r.warehouse_code);
      if (codes.length > 0) {
        warehouses = await AppDataSource.query(
          `SELECT warehouse_code, warehouse_name, country FROM dict_warehouses
           WHERE country = $1 AND warehouse_code = ANY($2) AND status = 'ACTIVE'`,
          [countryCode, codes]
        );
      }
    }
    if (warehouses.length === 0) {
      warehouses = await AppDataSource.query(
        `SELECT warehouse_code, warehouse_name, country FROM dict_warehouses
         WHERE country = $1 AND status = 'ACTIVE' LIMIT 10`,
        [countryCode]
      );
    }
  }
  console.log('\n6. 候选仓库:', warehouses);

  // 7. 还箱
  const emptyReturn = await AppDataSource.query(
    `SELECT last_return_date FROM process_empty_return WHERE container_number = $1`,
    [CONTAINER]
  );
  console.log('\n7. 还箱 last_return_date:', emptyReturn[0]?.last_return_date ?? '(无)');

  // 8. 清关行
  const brokers = countryCode
    ? await AppDataSource.query(
        `SELECT broker_code, broker_name FROM dict_customs_brokers
         WHERE country = $1 AND status = 'ACTIVE'`,
        [countryCode]
      )
    : [];
  const countryName = countryCode
    ? (await AppDataSource.query(`SELECT name_cn FROM dict_countries WHERE code = $1`, [countryCode]))[0]?.name_cn
    : null;
  console.log('\n8. 清关行:', brokers.length ? brokers : `无记录 → 占位符「${countryName || '未知'}清关行」`);

  // 流程摘要
  console.log('\n========== 流程摘要 ==========');
  console.log(`
输入参数:
  - container_number: ${CONTAINER}
  - countryCode: ${countryCode} (来自 sell_to_country → biz_customers.country)
  - portCode: ${portCode}
  - clearanceDate: ${clearanceDate} (ATA 或 ETA)
  - lastFreeDate: ${lastFreeDate}

计算步骤:
  1. 计划清关日 = clearanceDate
  2. 计划提柜日 = 清关日 + 1 天，且 ≤ lastFreeDate
  3. 候选仓库 = dict_warehouses(country) ∩ 港口→车队→仓库推导
  4. 计划卸柜日 = findEarliestAvailableDay(仓库日产能)
  5. 计划送仓日 = 卸柜日或前一日 (Drop off)
  6. 计划还箱日 = 卸柜后 + 1 天，且 ≤ lastReturnDate
  7. 车队 = dict_warehouse_trucking_mapping(warehouse, country) 取有剩余能力者
  8. 清关行 = dict_customs_brokers(country) 或 「${countryName || 'XX'}清关行」
`);

  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

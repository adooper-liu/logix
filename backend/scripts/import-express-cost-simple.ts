/**
 * 全球快递费拒收超标标准数据导入脚本（简化版）
 *
 * 功能：将 Excel 文件中的数据直接通过 SQL 插入到数据库
 *
 * 使用方法：
 * npx ts-node scripts/import-express-cost-simple.ts [Excel文件路径]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';
import * as XLSX from 'xlsx';

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// PostgreSQL 连接配置（从 .env 读取或使用默认值）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'logix_db',
  user: process.env.DB_USERNAME || 'logix_user',
  password: process.env.DB_PASSWORD || 'LogiX@2024!Secure'
};

// 解析数值（处理 '×' 和空值）
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === '×') {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

// 标准化快递方式名称
function normalizeCarrierName(carrier: string): string {
  return carrier.replace(/-/g, ' ').trim();
}

// 规范化费用类型名称
function normalizeType(typeRaw: string): string {
  const lower = typeRaw.toLowerCase().trim();

  // 拒收类
  if (lower.includes('reject') || lower.includes('拒收')) return 'REJECT';

  // AHS 类
  if (lower.includes('ahs') && lower.includes('dimension')) return 'AHS_DIM';
  if (lower.includes('ahs') && lower.includes('weight')) return 'AHS_WEIGHT';
  if (lower.includes('ahs') && lower.includes('packaging')) return 'PACKAGING';

  // Oversize 类
  if (lower === 'oversize charge' || lower === 'oversize') return 'OVERSIZE';
  if (lower.includes('unauthorized')) return 'UNAUTH_OS';
  if (lower.includes('large package')) return 'LARGE_PACKAGE_RESI';
  if (lower.includes('over maximum')) return 'OVER_MAX';

  // Additional Handling
  if (lower.includes('additional handling')) return 'ADDITIONAL_HANDLING';

  // Extra Care
  if (lower.includes('extra care')) return 'EXTRA_CARE';

  // 超标费等级（中文和英文混合）
  if (lower.includes('超标费1') || lower.includes('oversize-1') || lower.includes('超标1'))
    return 'OVERSIZE_1';
  if (lower.includes('超标费2') || lower.includes('oversize-2') || lower.includes('超标2'))
    return 'OVERSIZE_2';
  if (lower.includes('超标费3')) return 'OVERSIZE_3';
  if (lower.includes('超标费')) return 'OVERSIZE';

  // Over weight (Canpar)
  if (lower === 'over weight') return 'AHS_WEIGHT';

  // FBA/FBW 无费用
  if (lower === '无' || lower === 'none') return 'NONE';

  // 默认：转大写并替换空格
  return typeRaw.toUpperCase().replace(/\s+/g, '_');
}

// 解析数值（支持文本比较符，如 ">120", "<175"）
function parseValueWithLiteral(value: any): { numeric: number | null; literal: string | null } {
  if (value === null || value === undefined || value === '' || value === '×') {
    return { numeric: null, literal: null };
  }

  const str = String(value).trim();

  // 检测文本比较符
  const match = str.match(/^([><=!]+)\s*(\d+\.?\d*)$/);
  if (match) {
    return { numeric: null, literal: str };
  }

  // 纯数字
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return { numeric: num, literal: null };
  }

  return { numeric: null, literal: str };
}

// 提取 IF_THEN_DISABLE 策略
interface DisablePolicy {
  if_triggered: string[];
  disable: string[];
}

function extractDisablePolicies(remark: string): DisablePolicy[] {
  const policies: DisablePolicy[] = [];

  if (!remark) return policies;

  // 规则 1：超标费或超大件费后不再收AHS费用
  if ((remark.includes('超标费') || remark.includes('超大件费')) && remark.includes('不再收AHS')) {
    policies.push({
      if_triggered: ['OVERSIZE'],
      disable: ['AHS_DIM', 'AHS_WEIGHT']
    });
  }

  // 规则 2：收超大件费后不再收超标费
  if (remark.includes('超大件费后不再收超标费')) {
    policies.push({
      if_triggered: ['OVERSIZE'],
      disable: ['REJECT']
    });
  }

  // 规则 3：如果收了AHS-Weight，就不再收AHS-Size
  if (remark.includes('AHS-Weight') && remark.includes('AHS-Size') && remark.includes('不再收')) {
    policies.push({
      if_triggered: ['AHS_WEIGHT'],
      disable: ['AHS_DIM']
    });
  }

  // 规则 4：收large超标费后不再收AHS费用
  if (remark.includes('large超标') && remark.includes('不再收AHS')) {
    policies.push({
      if_triggered: ['LARGE_PACKAGE_RESI'],
      disable: ['AHS_DIM', 'AHS_WEIGHT']
    });
  }

  // 规则 5：收超大件费后不再收large超标费
  if (remark.includes('超大件费后不再收large超标费')) {
    policies.push({
      if_triggered: ['OVERSIZE'],
      disable: ['LARGE_PACKAGE_RESI']
    });
  }

  // 规则 6：收取超标费2后不再收超标费1
  if (remark.includes('超标费2') && remark.includes('不再收超标费1')) {
    policies.push({
      if_triggered: ['OVERSIZE_2'],
      disable: ['OVERSIZE_1']
    });
  }

  return policies;
}

// 提取 MAX_GROUP 策略
interface MaxGroupPolicy {
  max_group: string[];
}

function extractMaxGroupPolicies(remark: string): MaxGroupPolicy[] {
  const policies: MaxGroupPolicy[] = [];

  if (!remark) return policies;

  // 规则 7：AHS费用以最高的一笔为准
  if (
    remark.includes('AHS') &&
    (remark.includes('以最高的一笔为准') || remark.includes('只取最高'))
  ) {
    policies.push({
      max_group: ['AHS_DIM', 'AHS_WEIGHT']
    });
  }

  // 规则 8：over weight和over length同时满足时取较大值
  if (
    remark.includes('over weight') &&
    remark.includes('over length') &&
    remark.includes('取较大值')
  ) {
    policies.push({
      max_group: ['OVERSIZE_WEIGHT', 'OVERSIZE_LENGTH']
    });
  }

  return policies;
}

async function importExpressCostData(filePath: string) {
  console.log('=== 全球快递费数据导入工具（简化版）===\n');
  console.log('Excel 文件:', filePath);
  console.log('数据库配置:', `${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log('');

  // 读取 Excel 文件
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(filePath);
    console.log('✓ Excel 文件读取成功');
  } catch (error: any) {
    console.error('✗ 读取 Excel 文件失败:', error.message);
    process.exit(1);
  }

  // 获取第一个 Sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 转换为 JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (rawData.length < 2) {
    console.error('✗ Excel 文件中没有数据');
    process.exit(1);
  }

  const dataRows = rawData
    .slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined));
  console.log(`找到 ${dataRows.length} 条数据记录`);
  console.log('');

  // 连接数据库
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✓ 数据库连接成功\n');

    // 开始事务
    await client.query('BEGIN');
    console.log('✓ 事务已开启\n');

    // 清空现有数据
    console.log('正在清空现有数据...');
    await client.query('DELETE FROM dict_express_surcharge_rule');
    await client.query('DELETE FROM dict_express_stack_policy');
    await client.query('DELETE FROM dict_express_carrier_service');
    console.log('✓ 数据清空完成\n');

    // 第一步：创建默认的 version（如果不存在）
    console.log('正在创建版本记录...');
    const versionResult = await client.query(
      `
      INSERT INTO dict_express_surcharge_version (version_key, effective_from, imported_by, remarks)
      VALUES ($1, CURRENT_DATE, $2, $3)
      ON CONFLICT (version_key) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `,
      ['v1.0-20260214', 'system', '从 Excel 导入的全球快递费规则']
    );

    const versionId = versionResult.rows[0].id;
    console.log(`✓ 版本 ID: ${versionId}\n`);

    // 第二步：导入承运商服务并收集映射
    console.log('正在导入承运商服务...');
    const carrierServiceMap = new Map<string, number>();

    // 提取唯一的国别+快递方式组合
    const uniqueCarriers = new Set<string>();
    dataRows.forEach((row) => {
      const countryCode = row[0]?.toString().trim();
      const carrierRaw = row[1]?.toString().trim();

      if (countryCode && carrierRaw) {
        const carrier = normalizeCarrierName(carrierRaw);
        uniqueCarriers.add(`${countryCode}|${carrier}`);
      }
    });

    // 插入承运商服务
    for (const key of uniqueCarriers) {
      const [countryCode, serviceName] = key.split('|');

      const result = await client.query(
        `
        INSERT INTO dict_express_carrier_service (
          country_code, service_name, default_length_unit, 
          default_weight_unit, is_active
        )
        VALUES ($1, $2, 'in', 'lb', TRUE)
        ON CONFLICT (country_code, service_name) 
        DO UPDATE SET updated_at = NOW()
        RETURNING id
      `,
        [countryCode, serviceName]
      );

      carrierServiceMap.set(key, result.rows[0].id);
    }

    console.log(`✓ 成功导入 ${carrierServiceMap.size} 个承运商服务\n`);

    // 第三步：导入附加费规则
    console.log('正在导入附加费规则...');
    let ruleCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      const countryCode = row[0]?.toString().trim();
      const carrierRaw = row[1]?.toString().trim();
      const typeRaw = row[2]?.toString().trim();

      if (!countryCode || !carrierRaw || !typeRaw) {
        continue;
      }

      const carrier = normalizeCarrierName(carrierRaw);
      const carrierKey = `${countryCode}|${carrier}`;
      const carrierServiceId = carrierServiceMap.get(carrierKey);

      if (!carrierServiceId) {
        console.warn(`⚠ 警告: 未找到承运商服务 ${carrierKey}，跳过第 ${i + 2} 行`);
        continue;
      }

      // 解析尺寸和重量（支持文本比较符）
      const longest = parseValueWithLiteral(row[3]);
      const second = parseValueWithLiteral(row[4]);
      const shortest = parseValueWithLiteral(row[5]);
      const girth = parseValueWithLiteral(row[6]);
      const lPlusS = parseValueWithLiteral(row[7]);
      const threeSides = parseValueWithLiteral(row[8]);
      const diagonal = parseValueWithLiteral(row[9]);
      const volM3 = parseValueWithLiteral(row[10]);
      const grossWt = parseValueWithLiteral(row[11]);
      const rateWtSingle = parseValueWithLiteral(row[12]);
      const rateWtMulti = parseValueWithLiteral(row[13]);
      const minBillable = parseValueWithLiteral(row[14]);

      // 收集所有文本比较符（过滤掉 "x" 等无效值），保留字段名供计费引擎判断。
      const literals =
        [
          { field: 'longest_in', literal: longest.literal },
          { field: 'second_in', literal: second.literal },
          { field: 'shortest_in', literal: shortest.literal },
          { field: 'girth_in', literal: girth.literal },
          { field: 'l_plus_s_in', literal: lPlusS.literal },
          { field: 'three_sides_sum_in', literal: threeSides.literal },
          { field: 'gross_wt_value', literal: grossWt.literal },
          { field: 'billable_weight', literal: minBillable.literal }
        ]
          .filter((item) => item.literal && item.literal !== 'x' && item.literal !== 'X') // 过滤掉 x/X
          .map((item) => `${item.field} ${item.literal}`)
          .join('; ') || null;

      // 解析金额（支持区间格式 "5.2-8.8"）
      let amountFixed: number | null = null;
      let amountMin: number | null = null;
      let amountMax: number | null = null;
      const amountStr = String(row[15] || '').trim();

      if (amountStr && amountStr !== '×') {
        const rangeMatch = amountStr.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
        if (rangeMatch) {
          amountMin = parseFloat(rangeMatch[1]);
          amountMax = parseFloat(rangeMatch[2]);
        } else {
          const num = parseFloat(amountStr);
          if (!isNaN(num)) {
            amountFixed = num;
          }
        }
      }

      // 构建插入语句
      await client.query(
        `
        INSERT INTO dict_express_surcharge_rule (
          version_id, carrier_service_id, source_line_number,
          type_raw, type_normalized,
          longest_in, second_in, shortest_in, girth_in,
          l_plus_s_in, three_sides_sum_in, diagonal_in, vol_m3_threshold,
          gross_wt_value, rate_wt_single, rate_wt_multi, min_billable_lbs,
          weight_input_unit, dim_unit,
          amount_fixed, amount_min, amount_max,
          min_base_price, condition_literal,
          notes, ingest_completeness
        )
        VALUES (
          $1, $2, $3,
          $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17,
          'lb', 'in',
          $18, $19, $20,
          $21, $22,
          $23, 'FULL'
        )
      `,
        [
          versionId,
          carrierServiceId,
          i + 2, // Excel 行号（从 2 开始，因为第 1 行是标题）
          typeRaw,
          normalizeType(typeRaw), // 使用规范化函数
          longest.numeric, // 最长边
          second.numeric, // 次长边
          shortest.numeric, // 最短边
          girth.numeric, // 周长
          lPlusS.numeric, // 最长边+次长边
          threeSides.numeric, // 三边和
          diagonal.numeric, // 对角线
          volM3.numeric, // 体积M³
          grossWt.numeric, // 毛重
          rateWtSingle.numeric, // 计价重（单箱）
          rateWtMulti.numeric, // 计价重（多箱）
          minBillable.numeric, // 最低计价重LBS
          amountFixed, // 金额（固定）
          amountMin, // 金额（最小值）
          amountMax, // 金额（最大值）
          parseNumeric(row[16]), // 最低基础价
          literals, // 文本比较符
          row[17] || null // 备注
        ]
      );

      ruleCount++;
    }

    console.log(`✓ 成功导入 ${ruleCount} 条规则\n`);

    // 第四步：从备注中提取并导入策略
    console.log('正在导入堆叠策略...');
    let policyCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const remark = row[17];

      if (!remark) continue;

      const countryCode = row[0]?.toString().trim();
      const carrierRaw = row[1]?.toString().trim();

      if (!countryCode || !carrierRaw) continue;

      const carrier = normalizeCarrierName(carrierRaw);
      const carrierKey = `${countryCode}|${carrier}`;
      const carrierServiceId = carrierServiceMap.get(carrierKey);

      if (!carrierServiceId) continue;

      // 检测 IF_THEN_DISABLE 策略（条件禁用）
      const disablePolicies = extractDisablePolicies(remark);
      for (const policy of disablePolicies) {
        await client.query(
          `
          INSERT INTO dict_express_stack_policy (
            version_id, country_code, carrier_service_id,
            policy_type, policy_json
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
          ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
          DO UPDATE SET 
            policy_json = EXCLUDED.policy_json,
            updated_at = NOW()
        `,
          [
            versionId,
            countryCode,
            carrierServiceId,
            'IF_THEN_DISABLE',
            JSON.stringify({
              if_triggered: policy.if_triggered,
              disable: policy.disable
            })
          ]
        );
        policyCount++;
      }

      // 检测 MAX_GROUP 策略（取最高一笔）
      const maxGroupPolicies = extractMaxGroupPolicies(remark);
      for (const policy of maxGroupPolicies) {
        await client.query(
          `
          INSERT INTO dict_express_stack_policy (
            version_id, country_code, carrier_service_id,
            policy_type, policy_json
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
          ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
          DO UPDATE SET 
            policy_json = EXCLUDED.policy_json,
            updated_at = NOW()
        `,
          [
            versionId,
            countryCode,
            carrierServiceId,
            'MAX_GROUP',
            JSON.stringify({
              max_group: policy.max_group
            })
          ]
        );
        policyCount++;
      }
    }

    console.log(`✓ 成功导入 ${policyCount} 条策略\n`);

    // 提交事务
    await client.query('COMMIT');
    console.log('✓ 事务已提交\n');

    console.log('=== 导入完成 ===\n');
    console.log('统计信息:');
    console.log(`  - 版本 ID: ${versionId}`);
    console.log(`  - 承运商服务: ${carrierServiceMap.size}`);
    console.log(`  - 附加费规则: ${ruleCount}`);
    console.log(`  - 堆叠策略: ${policyCount}`);
    console.log('');
    console.log('建议操作:');
    console.log('  1. 访问 /express-cost/import 页面验证数据');
    console.log('  2. 使用 /express-cost/calculator 进行试算测试');
    console.log('  3. 检查策略是否正确提取');
  } catch (error: any) {
    // 回滚事务
    try {
      await client.query('ROLLBACK');
      console.log('\n✗ 事务已回滚');
    } catch (rollbackError) {
      console.error('\n✗ 回滚失败:', rollbackError);
    }

    console.error('\n✗ 导入失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await client.end();
    console.log('\n✓ 数据库连接已关闭');
  }
}

// 主函数
const excelPath = process.argv[2] || 'D:/aosom/Downloads/全球快递费拒收超标标准20260214.xlsx';

importExpressCostData(excelPath).catch((error) => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});

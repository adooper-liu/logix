/**
 * 从 Excel 生成快递费规则 SQL 脚本
 *
 * 功能：读取 Excel 文件，提取数据并生成可直接执行的 SQL 文件
 *
 * 使用方法：
 * npx ts-node scripts/generate-express-cost-sql.ts [Excel文件路径] [输出SQL文件路径]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// 解析数值（处理 '×' 和空值）
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === '×' || value === 'x') {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

// 标准化快递方式名称
function normalizeCarrierName(carrier: string): string {
  return carrier.replace(/-/g, ' ').trim();
}

// 解析数值（支持文本比较符，如 ">120", "<175"）
function parseValueWithLiteral(value: any): { numeric: number | null; literal: string | null } {
  if (value === null || value === undefined || value === '' || value === '×' || value === 'x') {
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

// 规范化类型名称
function normalizeType(typeRaw: string): string {
  if (!typeRaw) return 'UNKNOWN';

  const lower = typeRaw.toLowerCase();

  if (lower.includes('reject') || lower.includes('拒收')) return 'REJECT';
  if (lower.includes('ahs') && (lower.includes('dim') || lower.includes('dimension')))
    return 'AHS_DIM';
  if (lower.includes('ahs') && lower.includes('weight')) return 'AHS_WEIGHT';
  if (lower.includes('ahs') && lower.includes('packag')) return 'PACKAGING';
  if (lower.includes('oversize') || lower.includes('超大')) return 'OVERSIZE';
  if (lower.includes('unauth') || lower.includes('未经授权')) return 'UNAUTH_OS';
  if (lower.includes('large package')) return 'LARGE_PACKAGE_RESI';
  if (lower.includes('additional handling')) return 'ADDITIONAL_HANDLING';
  if (lower.includes('over max')) return 'OVER_MAX';
  if (lower.includes('extra care')) return 'EXTRA_CARE';

  // 清理特殊字符，转换为大写+下划线格式
  return typeRaw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_');
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

// 转义 SQL 字符串
function escapeSql(str: string | null): string {
  if (str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

// 生成 SQL 文件
async function generateSql(filePath: string, outputPath: string) {
  console.log('=== 全球快递费 SQL 生成工具 ===\n');
  console.log('Excel 文件:', filePath);
  console.log('输出文件:', outputPath);
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

  // 收集数据
  const versions = new Set<string>();
  const carrierServices = new Map<string, { countryCode: string; serviceName: string }>();
  const rules: any[] = [];
  const policies: any[] = [];

  console.log('正在解析数据...');

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // Excel 行号（从 2 开始）

    const countryCode = row[0]?.toString().trim();
    const carrierRaw = row[1]?.toString().trim();
    const typeRaw = row[2]?.toString().trim();

    if (!countryCode || !carrierRaw || !typeRaw) {
      continue;
    }

    const carrier = normalizeCarrierName(carrierRaw);
    const carrierKey = `${countryCode}|${carrier}`;
    const typeNormalized = normalizeType(typeRaw);

    // 收集版本
    versions.add('v1.0-20260214');

    // 收集承运商服务
    if (!carrierServices.has(carrierKey)) {
      carrierServices.set(carrierKey, { countryCode, serviceName: carrier });
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

    // 收集所有文本比较符，保留字段名供计费引擎判断。
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
        .filter((item) => item.literal)
        .map((item) => `${item.field} ${item.literal}`)
        .join('; ') || null;

    // 解析金额（支持区间格式 "5.2-8.8"）
    let amountFixed: number | null = null;
    let amountMin: number | null = null;
    let amountMax: number | null = null;
    const amountStr = String(row[15] || '').trim();

    if (amountStr && amountStr !== '×' && amountStr !== 'x') {
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

    // 收集规则
    rules.push({
      rowNumber,
      countryCode,
      carrier,
      typeRaw,
      typeNormalized,
      longest: longest.numeric,
      second: second.numeric,
      shortest: shortest.numeric,
      girth: girth.numeric,
      lPlusS: lPlusS.numeric,
      threeSides: threeSides.numeric,
      diagonal: diagonal.numeric,
      volM3: volM3.numeric,
      grossWt: grossWt.numeric,
      rateWtSingle: rateWtSingle.numeric,
      rateWtMulti: rateWtMulti.numeric,
      minBillable: minBillable.numeric,
      amountFixed,
      amountMin,
      amountMax,
      minBasePrice: parseNumeric(row[16]),
      literals,
      notes: row[17] || null
    });

    // 提取策略
    const remark = row[17];
    if (remark) {
      const disablePolicies = extractDisablePolicies(remark);
      for (const policy of disablePolicies) {
        policies.push({
          countryCode,
          carrier,
          policyType: 'IF_THEN_DISABLE',
          policyJson: JSON.stringify({
            if_triggered: policy.if_triggered,
            disable: policy.disable
          })
        });
      }

      const maxGroupPolicies = extractMaxGroupPolicies(remark);
      for (const policy of maxGroupPolicies) {
        policies.push({
          countryCode,
          carrier,
          policyType: 'MAX_GROUP',
          policyJson: JSON.stringify({
            max_group: policy.max_group
          })
        });
      }
    }
  }

  console.log(`✓ 数据解析完成`);
  console.log(`  - 版本: ${versions.size}`);
  console.log(`  - 承运商服务: ${carrierServices.size}`);
  console.log(`  - 规则: ${rules.length}`);
  console.log(`  - 策略: ${policies.length}`);
  console.log('');

  // 生成 SQL
  console.log('正在生成 SQL...');

  let sql = `-- ============================================================
-- LogiX 全球快递费规则数据导入脚本
-- Generated from Excel: ${path.basename(filePath)}
-- Generated at: ${new Date().toISOString()}
-- ============================================================

-- 开启事务
BEGIN;

-- ============================================================
-- 1. 插入版本记录
-- ============================================================
`;

  for (const version of versions) {
    sql += `INSERT INTO dict_express_surcharge_version (version_key, effective_from, imported_by, remarks)
VALUES (${escapeSql(version)}, CURRENT_DATE, 'system', '从 Excel 导入的全球快递费规则')
ON CONFLICT (version_key) DO UPDATE SET updated_at = NOW();

`;
  }

  sql += `-- ============================================================
-- 2. 插入承运商服务
-- ============================================================
`;

  for (const [key, service] of carrierServices) {
    sql += `INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES (${escapeSql(service.countryCode)}, ${escapeSql(service.serviceName)}, 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

`;
  }

  sql += `-- ============================================================
-- 3. 插入附加费规则
-- ============================================================
`;

  for (const rule of rules) {
    sql += `-- Row ${rule.rowNumber}: ${rule.countryCode} | ${rule.carrier} | ${rule.typeRaw}
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
SELECT
  v.id, cs.id, ${rule.rowNumber},
  ${escapeSql(rule.typeRaw)}, ${escapeSql(rule.typeNormalized)},
  ${rule.longest}, ${rule.second}, ${rule.shortest}, ${rule.girth},
  ${rule.lPlusS}, ${rule.threeSides}, ${rule.diagonal}, ${rule.volM3},
  ${rule.grossWt}, ${rule.rateWtSingle}, ${rule.rateWtMulti}, ${rule.minBillable},
  'lb', 'in',
  ${rule.amountFixed}, ${rule.amountMin}, ${rule.amountMax},
  ${rule.minBasePrice}, ${escapeSql(rule.literals)},
  ${escapeSql(rule.notes)}, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = ${escapeSql(rule.countryCode)}
  AND cs.service_name = ${escapeSql(rule.carrier)}
ON CONFLICT DO NOTHING;

`;
  }

  sql += `-- ============================================================
-- 4. 插入堆叠策略
-- ============================================================
`;

  for (const policy of policies) {
    sql += `INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, ${escapeSql(policy.countryCode)}, cs.id,
  ${escapeSql(policy.policyType)}, ${escapeSql(policy.policyJson)}::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = ${escapeSql(policy.countryCode)}
  AND cs.service_name = ${escapeSql(policy.carrier)}
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

`;
  }

  sql += `-- ============================================================
-- 5. 验证数据
-- ============================================================
-- 查询版本
SELECT 'Version' as type, COUNT(*) as count FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214'
UNION ALL
-- 查询承运商服务（仅统计本次导入的国别）
SELECT 'Carrier Service', COUNT(*) FROM dict_express_carrier_service
WHERE country_code IN (${Array.from(new Set(rules.map((r) => r.countryCode)))
    .map((c) => `'${c}'`)
    .join(', ')})
UNION ALL
-- 查询规则
SELECT 'Rules', COUNT(*) FROM dict_express_surcharge_rule
WHERE version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214')
UNION ALL
-- 查询策略
SELECT 'Policies', COUNT(*) FROM dict_express_stack_policy
WHERE version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214');

-- 提交事务
COMMIT;
`;

  // 写入文件
  try {
    fs.writeFileSync(outputPath, sql, 'utf-8');
    console.log('✓ SQL 文件生成成功');
    console.log(`  - 输出路径: ${outputPath}`);
    console.log('');
    console.log('建议操作:');
    console.log('  1. 检查生成的 SQL 文件');
    console.log('  2. 使用以下命令执行:');
    console.log(`     psql -U postgres -d logix -f ${outputPath}`);
    console.log('  3. 或使用前端导入功能验证数据');
  } catch (error: any) {
    console.error('✗ 写入 SQL 文件失败:', error.message);
    process.exit(1);
  }
}

// 主函数
const excelPath = process.argv[2] || 'D:/aosom/Downloads/全球快递费拒收超标标准20260214.xlsx';
const defaultOutput = path.join(
  path.dirname(excelPath),
  `express_cost_import_${new Date().toISOString().slice(0, 10)}.sql`
);
const outputPath = process.argv[3] || defaultOutput;

generateSql(excelPath, outputPath).catch((error) => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});

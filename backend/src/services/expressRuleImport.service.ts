/**
 * 快递费规则 Excel 导入服务
 * Express Rule Excel Import Service
 *
 * 负责：
 * 1. 解析 Excel 多 Sheet（surcharge_rules、stack_policies、metadata）
 * 2. 处理边界情况（金额区间、文本比较符、× 标记）
 * 3. 在单事务中写入版本/承运商/规则/互斥，失败全量回滚
 */

import { EntityManager } from 'typeorm';
import * as XLSX from 'xlsx';
import { AppDataSource } from '../database';
import { ExpressCarrierService } from '../entities/ExpressCarrierService';
import { ExpressStackPolicy } from '../entities/ExpressStackPolicy';
import { ExpressSurchargeRule } from '../entities/ExpressSurchargeRule';
import { ExpressSurchargeVersion } from '../entities/ExpressSurchargeVersion';
import { logger } from '../utils/logger';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  versionId?: number;
}

/** 行级错误导致整次导入在数据库层全量回滚，并在 API 层返回明细 */
const IMPORT_ROW_ERROR_CODE = 'EXPRESS_IMPORT_ROW_ERRORS';

export class ExpressRuleImportService {
  /**
   * 从 Excel 文件导入规则
   *
   * 语义：在**单个数据库事务**中完成版本、承运商、规则、互斥策略写入。
   * 任一行规则行或策略行解析/插入失败，则**整次导入回滚**，不会留下残缺版本；API 可返回行级 `errors`。
   */
  async importFromExcel(fileBuffer: Buffer, fileName: string): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      logger.info('[ExpressRuleImport] 开始导入 Excel', { fileName });

      // Step 1: 解析 Excel（在事务外，避免无效文件也占库连接）
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      logger.info('[ExpressRuleImport] Excel Sheets:', workbook.SheetNames);

      // Step 2: 读取元数据 Sheet
      const metadataSheet = workbook.Sheets['metadata'];
      if (!metadataSheet) {
        throw new Error('Excel 文件缺少 metadata Sheet');
      }
      const metadata = XLSX.utils.sheet_to_json(metadataSheet) as Record<string, any>[];

      if (metadata.length === 0) {
        throw new Error('metadata Sheet 为空');
      }

      const versionKey =
        metadata[0]?.version_key || new Date().toISOString().slice(0, 10).replace(/-/g, '');

      // Step 3: 规则与策略数据
      const rulesSheet = workbook.Sheets['surcharge_rules'];
      if (!rulesSheet) {
        throw new Error('Excel 文件缺少 surcharge_rules Sheet');
      }
      const rulesData = XLSX.utils.sheet_to_json(rulesSheet) as Record<string, any>[];
      if (rulesData.length === 0) {
        throw new Error('surcharge_rules Sheet 为空');
      }
      const policiesSheet = workbook.Sheets['stack_policies'];
      const policiesData = policiesSheet
        ? (XLSX.utils.sheet_to_json(policiesSheet) as Record<string, any>[])
        : [];

      await AppDataSource.transaction(async (manager) => {
        const versionRepo = manager.getRepository(ExpressSurchargeVersion);
        const version = await versionRepo.save({
          versionKey,
          sourceFileName: fileName,
          effectiveFrom: metadata[0]?.effective_from ? new Date(metadata[0].effective_from) : null,
          importedBy: metadata[0]?.imported_by || 'system',
          remarks: metadata[0]?.remarks || ''
        });
        result.versionId = version.id;
        result.success = 0;
        result.failed = 0;
        result.errors = [];

        logger.info('[ExpressRuleImport] 创建版本记录(事务中)', {
          versionKey,
          versionId: version.id
        });

        logger.info('[ExpressRuleImport] 开始导入规则', { totalRows: rulesData.length });

        for (let i = 0; i < rulesData.length; i++) {
          const row = rulesData[i];
          const rowNumber = i + 2;

          try {
            await this.importRuleRow(manager, version.id, row, rowNumber);
            result.success++;

            if ((i + 1) % 50 === 0) {
              logger.info('[ExpressRuleImport] 进度', {
                processed: i + 1,
                total: rulesData.length
              });
            }
          } catch (error: any) {
            result.failed++;
            result.errors.push({
              row: rowNumber,
              message: error.message || '未知错误'
            });
            logger.error(`[ExpressRuleImport] 第 ${rowNumber} 行解析/插入失败:`, error);
          }
        }

        if (policiesData.length > 0) {
          logger.info('[ExpressRuleImport] 开始导入互斥策略', {
            totalPolicies: policiesData.length
          });
          for (let i = 0; i < policiesData.length; i++) {
            const row = policiesData[i];
            const rowNumber = i + 2;
            try {
              await this.importPolicyRow(manager, version.id, row, rowNumber);
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                row: rowNumber,
                message: `[stack_policies] ${error.message || '未知错误'}`
              });
              logger.error(`[ExpressRuleImport] stack_policies 第 ${rowNumber} 行失败:`, error);
            }
          }
        } else {
          logger.info('[ExpressRuleImport] 无 stack_policies 数据，跳过');
        }

        if (result.failed > 0) {
          const err: Error & { code?: string; importResult?: ImportResult } = new Error(
            `行级数据未通过：${result.failed} 行失败，已全量回滚`
          );
          err.code = IMPORT_ROW_ERROR_CODE;
          err.importResult = {
            success: 0,
            failed: result.failed,
            errors: result.errors,
            versionId: undefined
          };
          throw err;
        }
      });

      logger.info('[ExpressRuleImport] 导入完成', {
        success: result.success,
        failed: result.failed,
        versionId: result.versionId
      });

      return result;
    } catch (error: any) {
      if (error?.code === IMPORT_ROW_ERROR_CODE && error.importResult) {
        return error.importResult;
      }
      logger.error('[ExpressRuleImport] 导入异常:', error);
      throw error;
    }
  }

  /**
   * 导入单行规则
   */
  private async importRuleRow(
    manager: EntityManager,
    versionId: number,
    row: Record<string, any>,
    rowNumber: number
  ): Promise<void> {
    const carrierServiceRepo = manager.getRepository(ExpressCarrierService);
    const ruleRepo = manager.getRepository(ExpressSurchargeRule);
    // 1. 提取国别和承运商
    const countryCode = String(row['国别'] || '').trim();
    const carrierServiceName = String(row['快递方式'] || '').trim();

    if (!countryCode || !carrierServiceName) {
      throw new Error('国别和快递方式为必填项');
    }

    // 2. 获取或创建承运商服务记录
    let carrierService = await carrierServiceRepo.findOne({
      where: { countryCode, serviceName: carrierServiceName }
    });

    if (!carrierService) {
      carrierService = await carrierServiceRepo.save({
        countryCode,
        serviceName: carrierServiceName,
        defaultLengthUnit: 'in', // 默认英制
        defaultWeightUnit: 'lb'
      });
      logger.debug('[ExpressRuleImport] 创建新承运商服务', { countryCode, carrierServiceName });
    }

    // 3. 解析类型字段
    const typeRaw = String(row['类型'] || '').trim();
    const typeNormalized = this.normalizeType(typeRaw);

    // 4. 解析尺寸阈值（处理 × 和文本比较符）
    const dimensions = this.parseDimensions(row);

    // 5. 解析金额（支持区间）
    const amountInfo = this.parseAmount(row);

    // 6. 判断完整性
    const ingestCompleteness = amountInfo.isComplete ? 'FULL' : 'INCOMPLETE';

    // 7. 构建 conditions_json（如 Seller Flex 三条件 AND）
    const conditionsJson = this.buildConditionsJson(row, typeNormalized);

    // 8. 插入规则
    await ruleRepo.save({
      versionId,
      carrierServiceId: carrierService.id,
      sourceLineNumber: rowNumber,
      typeRaw,
      typeNormalized,
      ...dimensions,
      amountFixed: amountInfo.amountFixed,
      amountMin: amountInfo.amountMin,
      amountMax: amountInfo.amountMax,
      minBasePrice: row['最低基础价'] ? parseFloat(String(row['最低基础价'])) : null,
      currency: 'USD', // 默认 USD，EU 行可根据实际情况调整
      chargeBasis: amountInfo.chargeBasis,
      ingestCompleteness,
      conditionsJson,
      notes: row['备注'] ? String(row['备注']) : null
    });
  }

  /**
   * 规范化类型名称
   */
  private normalizeType(typeRaw: string): string {
    if (!typeRaw) return 'UNKNOWN';

    const lower = typeRaw.toLowerCase();

    if (lower.includes('reject') || lower.includes('拒收')) return 'REJECT';
    if (lower.includes('ahs') && (lower.includes('dim') || lower.includes('dimension')))
      return 'AHS_DIM';
    if (lower.includes('ahs') && lower.includes('weight')) return 'AHS_WEIGHT';
    if (lower.includes('oversize') || lower.includes('超大')) return 'OVERSIZE';
    if (lower.includes('unauth') || lower.includes('未经授权')) return 'UNAUTH_OS';
    if (lower.includes('packag') || lower.includes('打包')) return 'PACKAGING';
    if (lower.includes('large package') && lower.includes('residential'))
      return 'LARGE_PACKAGE_RESI';
    if (lower.includes('seller flex')) return 'SELLER_FLEX_OVERSIZE';
    if (lower.includes('additional handling')) return 'ADDITIONAL_HANDLING';

    // 清理特殊字符，转换为大写+下划线格式
    return typeRaw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_');
  }

  /**
   * 解析尺寸阈值
   */
  private parseDimensions(row: Record<string, any>): any {
    const parseValue = (value: any): { numeric: number | null; literal: string | null } => {
      if (!value || value === '×' || value === 'x' || value === '') {
        return { numeric: null, literal: null };
      }

      const str = String(value).trim();

      // 文本比较符（如 >120, <175）
      const match = str.match(/^([><=]+)(\d+\.?\d*)$/);
      if (match) {
        return {
          numeric: null,
          literal: str // 存入 condition_literal
        };
      }

      // 纯数字
      const num = parseFloat(str);
      if (!isNaN(num)) {
        return { numeric: num, literal: null };
      }

      return { numeric: null, literal: str };
    };

    const longest = parseValue(row['最长边(in)']);
    const second = parseValue(row['次长边(in)']);
    const shortest = parseValue(row['最短边(in)']);
    const girth = parseValue(row['周长(in)']);
    const lPlusS = parseValue(row['最长边+次长边(in)']);
    const threeSides = parseValue(row['三边和(in)']);
    const diagonal = parseValue(row['对角线(in)']);
    const volM3 = parseValue(row['体积M³']);
    const grossWt = parseValue(row['毛重(lb)']);
    const rateWtSingle = parseValue(row['计价重（单箱）']);
    const rateWtMulti = parseValue(row['计价重（多箱）']);
    const minBillable = parseValue(row['最低计价重LBS']);

    // 收集所有文本比较符
    const literals =
      [longest.literal, second.literal, girth.literal].filter(Boolean).join('; ') || null;

    return {
      longestIn: longest.numeric,
      secondIn: second.numeric,
      shortestIn: shortest.numeric,
      girthIn: girth.numeric,
      lPlusSIn: lPlusS.numeric,
      threeSidesSumIn: threeSides.numeric,
      diagonalIn: diagonal.numeric,
      volM3Threshold: volM3.numeric,
      grossWtValue: grossWt.numeric,
      rateWtSingle: rateWtSingle.numeric,
      rateWtMulti: rateWtMulti.numeric,
      minBillableLbs: minBillable.numeric,
      weightInputUnit: 'lb',
      dimUnit: 'in',
      conditionLiteral: literals
    };
  }

  /**
   * 解析金额
   */
  private parseAmount(row: Record<string, any>): {
    amountFixed: number | null;
    amountMin: number | null;
    amountMax: number | null;
    chargeBasis: string | null;
    isComplete: boolean;
  } {
    const amountStr = String(row['金额'] || '').trim();

    if (!amountStr || amountStr === '×' || amountStr === 'x') {
      return {
        amountFixed: null,
        amountMin: null,
        amountMax: null,
        chargeBasis: null,
        isComplete: false
      };
    }

    // 区间格式：4.87-6.25
    const rangeMatch = amountStr.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
    if (rangeMatch) {
      return {
        amountFixed: null,
        amountMin: parseFloat(rangeMatch[1]),
        amountMax: parseFloat(rangeMatch[2]),
        chargeBasis: 'RANGE',
        isComplete: true
      };
    }

    // 固定金额
    const fixed = parseFloat(amountStr);
    if (!isNaN(fixed)) {
      return {
        amountFixed: fixed,
        amountMin: null,
        amountMax: null,
        chargeBasis: 'FIXED',
        isComplete: true
      };
    }

    return {
      amountFixed: null,
      amountMin: null,
      amountMax: null,
      chargeBasis: null,
      isComplete: false
    };
  }

  /**
   * 构建 conditions_json
   */
  private buildConditionsJson(row: Record<string, any>, typeNormalized: string): any {
    // Seller Flex 特殊情况：备注写明"最长边、周长、毛重为且"
    if (typeNormalized === 'SELLER_FLEX_OVERSIZE' || row['备注']?.includes('且')) {
      const conditions: any[] = [];

      if (row['最长边(in)'] && row['最长边(in)'] !== '×') {
        const val = parseFloat(String(row['最长边(in)']));
        if (!isNaN(val)) {
          conditions.push({
            field: 'longest_in',
            operator: '>',
            value: val
          });
        }
      }

      if (row['周长(in)'] && row['周长(in)'] !== '×') {
        const val = parseFloat(String(row['周长(in)']));
        if (!isNaN(val)) {
          conditions.push({
            field: 'girth_in',
            operator: '>',
            value: val
          });
        }
      }

      if (row['毛重(lb)'] && row['毛重(lb)'] !== '×') {
        const val = parseFloat(String(row['毛重(lb)']));
        if (!isNaN(val)) {
          conditions.push({
            field: 'gross_wt_value',
            operator: '>',
            value: val
          });
        }
      }

      if (conditions.length > 1) {
        return { operator: 'AND', conditions };
      }
    }

    // DHL "任意两边>80" 等复杂逻辑
    if (row['备注']?.includes('任意两边')) {
      return {
        operator: 'OR',
        conditions: [
          { field: 'longest_in', operator: '>', value: 80 },
          { field: 'second_in', operator: '>', value: 80 }
        ]
      };
    }

    return null;
  }

  /**
   * 导入互斥策略行
   */
  private async importPolicyRow(
    manager: EntityManager,
    versionId: number,
    row: Record<string, any>,
    rowNumber: number
  ): Promise<void> {
    const policyRepo = manager.getRepository(ExpressStackPolicy);
    const carrierServiceRepo = manager.getRepository(ExpressCarrierService);
    const countryCode = String(row['国别'] || '').trim();
    const carrierServiceName = String(row['快递方式'] || '').trim();
    const policyType = String(row['策略类型'] || '').trim();
    const policyJsonStr = row['policy_json'];

    if (!countryCode || !carrierServiceName || !policyType) {
      throw new Error(`stack_policies 第 ${rowNumber} 行：国别、快递方式、策略类型为必填项`);
    }

    const carrierService = await carrierServiceRepo.findOne({
      where: { countryCode, serviceName: carrierServiceName }
    });

    if (!carrierService) {
      throw new Error(`未找到承运商服务: ${countryCode} - ${carrierServiceName}`);
    }

    // 解析 policy_json（可能是字符串或对象）
    let policyJson: any;
    if (typeof policyJsonStr === 'string') {
      try {
        policyJson = JSON.parse(policyJsonStr);
      } catch (error) {
        throw new Error(`policy_json 格式错误: ${policyJsonStr}`);
      }
    } else {
      policyJson = policyJsonStr;
    }

    await policyRepo.save({
      versionId,
      countryCode,
      carrierServiceId: carrierService.id,
      policyType,
      policyJson
    });
  }
}

export const expressRuleImportService = new ExpressRuleImportService();

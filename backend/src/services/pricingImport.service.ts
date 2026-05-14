import * as XLSX from 'xlsx';
import { EntityManager } from 'typeorm';
import { AppDataSource } from '../database';
import { BaseRateRow } from '../entities/BaseRateRow';
import { PricingScheme } from '../entities/PricingScheme';
import { PricingVersion } from '../entities/PricingVersion';
import { ZoneLaneMapping } from '../entities/ZoneLaneMapping';

interface PricingImportError {
  sheet: string;
  row: number;
  field?: string;
  code: string;
  message: string;
}

interface PricingImportResult {
  success: number;
  failed: number;
  errors: PricingImportError[];
  versionId?: number;
}

const PRICING_IMPORT_ROW_ERROR = 'PRICING_IMPORT_ROW_ERROR';

export class PricingImportService {
  async importFromExcel(fileBuffer: Buffer, fileName: string): Promise<PricingImportResult> {
    const result: PricingImportResult = { success: 0, failed: 0, errors: [] };
    try {
      const wb = XLSX.read(fileBuffer, { type: 'buffer' });

      const requiredSheets = ['metadata', 'pricing_scheme', 'zone_lane_mapping', 'base_rate_rows'];
      for (const sheetName of requiredSheets) {
        if (!wb.Sheets[sheetName]) {
          throw new Error(`Excel 文件缺少 ${sheetName} Sheet`);
        }
      }

      const metadataRows = XLSX.utils.sheet_to_json(wb.Sheets.metadata) as Record<string, any>[];
      const schemeRows = XLSX.utils.sheet_to_json(wb.Sheets.pricing_scheme) as Record<string, any>[];
      const mappingRows = XLSX.utils.sheet_to_json(wb.Sheets.zone_lane_mapping) as Record<string, any>[];
      const baseRows = XLSX.utils.sheet_to_json(wb.Sheets.base_rate_rows) as Record<string, any>[];

      if (metadataRows.length === 0) {
        throw new Error('metadata Sheet 为空');
      }

      await AppDataSource.manager.transaction(async (manager) => {
        const version = await this.createVersion(manager, metadataRows[0], fileName);
        result.versionId = version.id;
        const schemeRefMap = await this.insertSchemes(manager, version.id, schemeRows, result);
        await this.insertMappings(manager, version.id, mappingRows, result);
        await this.insertBaseRates(manager, baseRows, schemeRefMap, result);

        if (result.failed > 0) {
          const rollbackError: Error & { code?: string; importResult?: PricingImportResult } = new Error(
            `定价导入存在 ${result.failed} 条错误，已全量回滚`
          );
          rollbackError.code = PRICING_IMPORT_ROW_ERROR;
          rollbackError.importResult = {
            success: 0,
            failed: result.failed,
            errors: result.errors,
            versionId: undefined
          };
          throw rollbackError;
        }
      });

      return result;
    } catch (error: any) {
      if (error?.code === PRICING_IMPORT_ROW_ERROR && error.importResult) {
        return error.importResult;
      }
      throw error;
    }
  }

  private async createVersion(
    manager: EntityManager,
    metadata: Record<string, any>,
    fileName: string
  ): Promise<PricingVersion> {
    const repo = manager.getRepository(PricingVersion);
    const versionKey = String(metadata.version_key || '').trim();
    const effectiveFrom = metadata.effective_from ? new Date(metadata.effective_from) : null;
    if (!versionKey || !effectiveFrom) {
      throw new Error('metadata 缺少 version_key 或 effective_from');
    }
    return repo.save({
      versionKey,
      effectiveFrom,
      effectiveTo: metadata.effective_to ? new Date(metadata.effective_to) : null,
      status: String(metadata.status || 'ACTIVE'),
      sourceFileName: String(metadata.source_file_name || fileName || ''),
      importedBy: String(metadata.imported_by || 'system'),
      remarks: metadata.remarks ? String(metadata.remarks) : null
    });
  }

  private async insertSchemes(
    manager: EntityManager,
    versionId: number,
    rows: Record<string, any>[],
    result: PricingImportResult
  ): Promise<Map<string, number>> {
    const repo = manager.getRepository(PricingScheme);
    const map = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2;
      try {
        const schemeRef = String(row.scheme_ref || `${row.country_code}|${row.carrier_code}|${row.service_code}`)
          .trim();
        const entity = await repo.save({
          versionId,
          countryCode: String(row.country_code || '').trim(),
          carrierCode: String(row.carrier_code || '').trim(),
          serviceCode: String(row.service_code || '').trim(),
          productLine: String(row.product_line || 'PARCEL_EXPRESS').trim(),
          currency: String(row.currency || 'USD').trim(),
          priority: this.parseNumberOrDefault(row.priority, 100, 'priority'),
          calcMode: String(row.calc_mode || '').trim(),
          conditionsJson: this.tryParseJson(row.conditions_json),
          isActive: row.is_active === undefined ? true : this.toBoolean(row.is_active)
        });
        if (!entity.countryCode || !entity.carrierCode || !entity.serviceCode || !entity.calcMode) {
          throw new Error('pricing_scheme 必填字段缺失');
        }
        map.set(schemeRef, entity.id);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          sheet: 'pricing_scheme',
          row: rowNo,
          code: 'INVALID_SCHEME_ROW',
          message: error.message || '无效 pricing_scheme 行'
        });
      }
    }
    return map;
  }

  private async insertMappings(
    manager: EntityManager,
    versionId: number,
    rows: Record<string, any>[],
    result: PricingImportResult
  ): Promise<void> {
    const repo = manager.getRepository(ZoneLaneMapping);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2;
      try {
        const entity = repo.create({
          versionId,
          countryCode: String(row.country_code || '').trim(),
          mappingType: String(row.mapping_type || '').trim(),
          originCode: row.origin_code ? String(row.origin_code).trim() : null,
          destinationCode: row.destination_code ? String(row.destination_code).trim() : null,
          postalPrefixFrom: row.postal_prefix_from ? String(row.postal_prefix_from).trim() : null,
          postalPrefixTo: row.postal_prefix_to ? String(row.postal_prefix_to).trim() : null,
          zoneCode: row.zone_code ? String(row.zone_code).trim() : null,
          laneCode: row.lane_code ? String(row.lane_code).trim() : null,
          distanceKm: this.parseOptionalNumber(row.distance_km, 'distance_km'),
          conditionsJson: this.tryParseJson(row.conditions_json),
          priority: this.parseNumberOrDefault(row.priority, 100, 'priority')
        });
        if (!entity.countryCode || !entity.mappingType) {
          throw new Error('zone_lane_mapping 必填字段缺失');
        }
        await repo.save(entity);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          sheet: 'zone_lane_mapping',
          row: rowNo,
          code: 'INVALID_ZONE_LANE_ROW',
          message: error.message || '无效 zone_lane_mapping 行'
        });
      }
    }
  }

  private async insertBaseRates(
    manager: EntityManager,
    rows: Record<string, any>[],
    schemeRefMap: Map<string, number>,
    result: PricingImportResult
  ): Promise<void> {
    const repo = manager.getRepository(BaseRateRow);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2;
      try {
        const schemeRef = String(row.scheme_ref || '').trim();
        const schemeId = schemeRefMap.get(schemeRef);
        if (!schemeId) {
          throw new Error(`base_rate_rows 未找到 scheme_ref: ${schemeRef}`);
        }
        const entity = repo.create({
          schemeId,
          zoneCode: row.zone_code ? String(row.zone_code).trim() : null,
          laneCode: row.lane_code ? String(row.lane_code).trim() : null,
          weightFrom: this.parseOptionalNumber(row.weight_from, 'weight_from'),
          weightTo: this.parseOptionalNumber(row.weight_to, 'weight_to'),
          firstWeight: this.parseOptionalNumber(row.first_weight, 'first_weight'),
          firstFee: this.parseOptionalNumber(row.first_fee, 'first_fee'),
          additionalStepWeight: this.parseOptionalNumber(
            row.additional_step_weight,
            'additional_step_weight'
          ),
          additionalFeePerStep: this.parseOptionalNumber(
            row.additional_fee_per_step,
            'additional_fee_per_step'
          ),
          flatFee: this.parseOptionalNumber(row.flat_fee, 'flat_fee'),
          unitPricePerKg: this.parseOptionalNumber(row.unit_price_per_kg, 'unit_price_per_kg'),
          minCharge: this.parseOptionalNumber(row.min_charge, 'min_charge'),
          maxCharge: this.parseOptionalNumber(row.max_charge, 'max_charge'),
          billableWeightRounding: row.billable_weight_rounding
            ? String(row.billable_weight_rounding).trim()
            : null,
          paramsJson: this.tryParseJson(row.params_json)
        });
        await repo.save(entity);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          sheet: 'base_rate_rows',
          row: rowNo,
          code: 'INVALID_BASE_RATE_ROW',
          message: error.message || '无效 base_rate_rows 行'
        });
      }
    }
  }

  private tryParseJson(value: any): Record<string, any> {
    if (!value) {
      return {};
    }
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(String(value));
    } catch {
      return {};
    }
  }

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', '是'].includes(normalized);
  }

  private parseNumberOrDefault(value: any, defaultValue: number, field: string): number {
    const parsed = this.parseOptionalNumber(value, field);
    return parsed === null ? defaultValue : parsed;
  }

  private parseOptionalNumber(value: any, field: string): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`${field} 必须是数字`);
    }
    return parsed;
  }
}

export const pricingImportService = new PricingImportService();


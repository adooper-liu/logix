/**
 * 滞港费标准业务主键：用于导入幂等（upsert）与重复行清理。
 *
 * 计费侧会对「四字段 + 有效期内 + is_chargeable=N」匹配到的全部标准求和；
 * 若同一业务键被重复插入，会产生翻倍计费。
 */

import { Repository } from 'typeorm';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';

export type DemurrageStandardIdentity = {
  foreignCompanyCode: string | null;
  destinationPortCode: string | null;
  shippingCompanyCode: string | null;
  originForwarderCode: string | null;
  chargeTypeCode: string | null;
  chargeName: string | null;
  sequenceNumber: number | null;
  terminal: string | null;
  transportModeCode: string | null;
  /** YYYY-MM-DD，或 null */
  effectiveDate: string | null;
};

/**
 * 规范化文本主键字段。
 * - null/undefined → null
 * - 其余 trim 后原样保留（含空串），以便与历史导入写入的 '' 对齐
 */
export function normalizeDemurrageIdentityText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return String(value).trim();
}

export function normalizeDemurrageIdentityNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 将 Date / ISO / YYYY-MM-DD 规范为日期字符串（按 UTC 日期部分，匹配 PG date 列常见驱动行为） */
export function toDemurrageEffectiveDateKey(
  value: Date | string | null | undefined
): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildDemurrageStandardIdentity(input: {
  foreignCompanyCode?: unknown;
  destinationPortCode?: unknown;
  shippingCompanyCode?: unknown;
  originForwarderCode?: unknown;
  chargeTypeCode?: unknown;
  chargeName?: unknown;
  sequenceNumber?: unknown;
  terminal?: unknown;
  transportModeCode?: unknown;
  effectiveDate?: Date | string | null;
}): DemurrageStandardIdentity {
  return {
    foreignCompanyCode: normalizeDemurrageIdentityText(input.foreignCompanyCode),
    destinationPortCode: normalizeDemurrageIdentityText(input.destinationPortCode),
    shippingCompanyCode: normalizeDemurrageIdentityText(input.shippingCompanyCode),
    originForwarderCode: normalizeDemurrageIdentityText(input.originForwarderCode),
    chargeTypeCode: normalizeDemurrageIdentityText(input.chargeTypeCode),
    chargeName: normalizeDemurrageIdentityText(input.chargeName),
    sequenceNumber: normalizeDemurrageIdentityNumber(input.sequenceNumber),
    terminal: normalizeDemurrageIdentityText(input.terminal),
    transportModeCode: normalizeDemurrageIdentityText(input.transportModeCode),
    effectiveDate: toDemurrageEffectiveDateKey(input.effectiveDate)
  };
}

export function demurrageStandardIdentitiesEqual(
  a: DemurrageStandardIdentity,
  b: DemurrageStandardIdentity
): boolean {
  return (
    a.foreignCompanyCode === b.foreignCompanyCode &&
    a.destinationPortCode === b.destinationPortCode &&
    a.shippingCompanyCode === b.shippingCompanyCode &&
    a.originForwarderCode === b.originForwarderCode &&
    a.chargeTypeCode === b.chargeTypeCode &&
    a.chargeName === b.chargeName &&
    a.sequenceNumber === b.sequenceNumber &&
    a.terminal === b.terminal &&
    a.transportModeCode === b.transportModeCode &&
    a.effectiveDate === b.effectiveDate
  );
}

/**
 * 按业务键查找已存在的标准（按 id 升序）。
 * 返回多条时，调用方应保留第一条并删除其余重复项。
 */
export async function findDemurrageStandardsByIdentity(
  repo: Repository<ExtDemurrageStandard>,
  identity: DemurrageStandardIdentity
): Promise<ExtDemurrageStandard[]> {
  const qb = repo.createQueryBuilder('s');

  const eqOrNull = (column: string, param: string, value: string | number | null) => {
    if (value === null) {
      qb.andWhere(`s.${column} IS NULL`);
    } else {
      qb.andWhere(`s.${column} = :${param}`, { [param]: value });
    }
  };

  eqOrNull('foreign_company_code', 'fcc', identity.foreignCompanyCode);
  eqOrNull('destination_port_code', 'dpc', identity.destinationPortCode);
  eqOrNull('shipping_company_code', 'scc', identity.shippingCompanyCode);
  eqOrNull('origin_forwarder_code', 'ofc', identity.originForwarderCode);
  eqOrNull('charge_type_code', 'ctc', identity.chargeTypeCode);
  eqOrNull('charge_name', 'cn', identity.chargeName);
  eqOrNull('sequence_number', 'seq', identity.sequenceNumber);
  eqOrNull('terminal', 'term', identity.terminal);
  eqOrNull('transport_mode_code', 'tmc', identity.transportModeCode);

  if (identity.effectiveDate === null) {
    qb.andWhere('s.effective_date IS NULL');
  } else {
    qb.andWhere('s.effective_date = CAST(:eff AS date)', { eff: identity.effectiveDate });
  }

  return qb.orderBy('s.id', 'ASC').getMany();
}

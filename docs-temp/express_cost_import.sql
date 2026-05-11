-- ============================================================
-- LogiX 全球快递费规则数据导入脚本
-- Generated from Excel: 全球快递费拒收超标标准20260214.xlsx
-- Generated at: 2026-04-23T08:59:29.200Z
-- ============================================================

-- 开启事务
BEGIN;

-- ============================================================
-- 1. 插入版本记录
-- ============================================================
INSERT INTO dict_express_surcharge_version (version_key, effective_from, imported_by, remarks)
VALUES ('v1.0-20260214', CURRENT_DATE, 'system', '从 Excel 导入的全球快递费规则')
ON CONFLICT (version_key) DO UPDATE SET updated_at = NOW();

-- ============================================================
-- 2. 插入承运商服务
-- ============================================================
INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'FedEx Ground', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'FedEx Home Delivery Cope', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'FedEx Home Delivery LC', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'FedEx Home Delivery', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'UPS Ground', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'USPS', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'FBA', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'FBW', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'Ontrac', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('US', 'Amazon shipping', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('CA', 'FedEx Ground', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('CA', 'UPS Standard', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('CA', 'Canpar', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('CA', 'FBA', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('CA', 'FBW', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('DE', 'GLS', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('DE', 'DPD Standardpaket', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('DE', 'DPD Prime', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('DE', 'GEL', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('DE', 'Hellmann', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('DE', 'Hermes Standardpaket', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('DE', 'Seller Flex', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Hermes_Next Day', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'DX Express', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'DX Shipping service', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'XDP Economy', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Amazon Next Day', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Amazon Two Day', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Palletway H&M', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Palletway McGregor', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Palletway Howard', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Palletway Cross Country', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'DHL Next Day', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'DX 2M', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('UK', 'Winit DPD', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'DPD Standardpaket/DPD Prime', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'GLS', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'GEODIS', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'Chonopost（J+1)/REG', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'M Relay', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'DPD CLASSIC Europe', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'Amazon Prime', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('FR', 'Amazon shipping', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'BRT', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'GLS National Standard', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'TNT Libero', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'BRT Prime', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'BRT DIRECT INFEED', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'IT TNT Standard', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'POSTE ITALIANE', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IT', 'IT FedEx', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('ES', 'SEUR 24   Amazon Prime', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('ES', 'SEUR', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('ES', 'Envialia', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('ES', 'SEUR CLASSIC EUROPE', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

INSERT INTO dict_express_carrier_service (country_code, service_name, default_length_unit, default_weight_unit, is_active)
VALUES ('IE', 'RWB', 'in', 'lb', TRUE)
ON CONFLICT (country_code, service_name) DO UPDATE SET updated_at = NOW();

-- ============================================================
-- 3. 插入附加费规则
-- ============================================================
-- Row 2: US | FedEx Ground | 拒收
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
  v.id, cs.id, 2,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Peak Surcharge:
https://www.fedex.com/en-us/shipping/current-rates/surcharges-and-fees.html#peak-surcharge', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 3: US | FedEx Ground | AHS - Dimensions
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
  v.id, cs.id, 3,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, 105,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  7.85, null, null,
  null, NULL,
  '收超标费或超大件费后不再收AHS费用；以最高的一笔为准；', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 4: US | FedEx Ground | AHS - Weight
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
  v.id, cs.id, 4,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  9.82, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 5: US | FedEx Ground | Oversize Charge
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
  v.id, cs.id, 5,
  'Oversize Charge', 'OVERSIZE',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  75.67, null, null,
  null, NULL,
  '收超大件费后不再收超标费;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 6: US | FedEx Ground | Unauthorized OS
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
  v.id, cs.id, 6,
  'Unauthorized OS', 'UNAUTH_OS',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1700, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 7: US | FedEx Ground | Additional Handling
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
  v.id, cs.id, 7,
  'Additional Handling', 'ADDITIONAL_HANDLING',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, 4.87, 6.25,
  null, NULL,
  '打包费收取的情况包含：
5)未完全装入外部集装箱;
6)非用波纹纤维板(纸板)材料制成的外装集装箱，包括但不限于金属、木材、帆布、皮革、硬塑料、软塑料(如塑料袋)或发泡聚苯乙烯泡沫塑料(如聚苯乙烯泡沫塑料);
7)被装在用收缩包装或拉伸包装的外箱中;
8)以软面包裹(例如速递包、塑料袋及气泡邮件)，其最长边超过18英寸或第二最长边超过13英寸或高度超过5英寸;
9)圆柱形，包括(但不限于)邮寄管、罐、桶、桶、桶或桶;
10)用金属、塑料或布条捆扎，或有轮子、脚轮、把手或带(包括外表面包裹松散或外表面凸出的包裹);或
11)可能卷入或损坏其他包裹或联邦快递分拣系统。', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 8: US | FedEx Home Delivery Cope | 拒收
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
  v.id, cs.id, 8,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Peak Surcharge:
https://www.fedex.com/en-us/shipping/current-rates/surcharges-and-fees.html#peak-surcharge', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT DO NOTHING;

-- Row 9: US | FedEx Home Delivery Cope | AHS - Dimensions
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
  v.id, cs.id, 9,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, 105,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  6.48, null, null,
  null, NULL,
  '收超标费或超大件费后不再收AHS费用；以最高的一笔为准；', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT DO NOTHING;

-- Row 10: US | FedEx Home Delivery Cope | AHS - Weight
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
  v.id, cs.id, 10,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  7.78, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT DO NOTHING;

-- Row 11: US | FedEx Home Delivery Cope | Oversize Charge
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
  v.id, cs.id, 11,
  'Oversize Charge', 'OVERSIZE',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  75.11, null, null,
  null, NULL,
  '收超大件费后不再收超标费;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT DO NOTHING;

-- Row 12: US | FedEx Home Delivery Cope | Unauthorized OS
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
  v.id, cs.id, 12,
  'Unauthorized OS', 'UNAUTH_OS',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1093.75, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT DO NOTHING;

-- Row 13: US | FedEx Home Delivery Cope | Additional Handling
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
  v.id, cs.id, 13,
  'Additional Handling', 'ADDITIONAL_HANDLING',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, 2.01, 2.57,
  null, NULL,
  '打包费收取的情况包含：
5)未完全装入外部集装箱;
6)非用波纹纤维板(纸板)材料制成的外装集装箱，包括但不限于金属、木材、帆布、皮革、硬塑料、软塑料(如塑料袋)或发泡聚苯乙烯泡沫塑料(如聚苯乙烯泡沫塑料);
7)被装在用收缩包装或拉伸包装的外箱中;
8)以软面包裹(例如速递包、塑料袋及气泡邮件)，其最长边超过18英寸或第二最长边超过13英寸或高度超过5英寸;
9)圆柱形，包括(但不限于)邮寄管、罐、桶、桶、桶或桶;
10)用金属、塑料或布条捆扎，或有轮子、脚轮、把手或带(包括外表面包裹松散或外表面凸出的包裹);或
11)可能卷入或损坏其他包裹或联邦快递分拣系统。', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT DO NOTHING;

-- Row 14: US | FedEx Home Delivery LC | 拒收
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
  v.id, cs.id, 14,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Peak Surcharge:
https://www.fedex.com/en-us/shipping/current-rates/surcharges-and-fees.html#peak-surcharge', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT DO NOTHING;

-- Row 15: US | FedEx Home Delivery LC | AHS - Dimensions
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
  v.id, cs.id, 15,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, 105,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  7.9, null, null,
  null, NULL,
  '收超标费或超大件费后不再收AHS费用；以最高的一笔为准；', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT DO NOTHING;

-- Row 16: US | FedEx Home Delivery LC | AHS - Weight
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
  v.id, cs.id, 16,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  9.86, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT DO NOTHING;

-- Row 17: US | FedEx Home Delivery LC | Oversize Charge
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
  v.id, cs.id, 17,
  'Oversize Charge', 'OVERSIZE',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  76.38, null, null,
  null, NULL,
  '收超大件费后不再收超标费;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT DO NOTHING;

-- Row 18: US | FedEx Home Delivery LC | Unauthorized OS
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
  v.id, cs.id, 18,
  'Unauthorized OS', 'UNAUTH_OS',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1107.25, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT DO NOTHING;

-- Row 19: US | FedEx Home Delivery LC | Additional Handling
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
  v.id, cs.id, 19,
  'Additional Handling', 'ADDITIONAL_HANDLING',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, 2.05, 2.63,
  null, NULL,
  '打包费收取的情况包含：
5)未完全装入外部集装箱;
6)非用波纹纤维板(纸板)材料制成的外装集装箱，包括但不限于金属、木材、帆布、皮革、硬塑料、软塑料(如塑料袋)或发泡聚苯乙烯泡沫塑料(如聚苯乙烯泡沫塑料);
7)被装在用收缩包装或拉伸包装的外箱中;
8)以软面包裹(例如速递包、塑料袋及气泡邮件)，其最长边超过18英寸或第二最长边超过13英寸或高度超过5英寸;
9)圆柱形，包括(但不限于)邮寄管、罐、桶、桶、桶或桶;
10)用金属、塑料或布条捆扎，或有轮子、脚轮、把手或带(包括外表面包裹松散或外表面凸出的包裹);或
11)可能卷入或损坏其他包裹或联邦快递分拣系统。', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT DO NOTHING;

-- Row 20: US | FedEx Home Delivery | 拒收
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
  v.id, cs.id, 20,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Peak Surcharge:
https://www.fedex.com/en-us/shipping/current-rates/surcharges-and-fees.html#peak-surcharge', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT DO NOTHING;

-- Row 21: US | FedEx Home Delivery | AHS - Dimensions
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
  v.id, cs.id, 21,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, 105,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  7.85, null, null,
  null, NULL,
  '收超标费或超大件费后不再收AHS费用；以最高的一笔为准；', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT DO NOTHING;

-- Row 22: US | FedEx Home Delivery | AHS - Weight
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
  v.id, cs.id, 22,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  9.82, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT DO NOTHING;

-- Row 23: US | FedEx Home Delivery | Oversize Charge
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
  v.id, cs.id, 23,
  'Oversize Charge', 'OVERSIZE',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  75.67, null, null,
  null, NULL,
  '收超大件费后不再收超标费;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT DO NOTHING;

-- Row 24: US | FedEx Home Delivery | Unauthorized OS
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
  v.id, cs.id, 24,
  'Unauthorized OS', 'UNAUTH_OS',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1700, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT DO NOTHING;

-- Row 25: US | FedEx Home Delivery | Additional Handling
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
  v.id, cs.id, 25,
  'Additional Handling', 'ADDITIONAL_HANDLING',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  19.5, null, null,
  null, NULL,
  '打包费收取的情况包含：
5)未完全装入外部集装箱;
6)非用波纹纤维板(纸板)材料制成的外装集装箱，包括但不限于金属、木材、帆布、皮革、硬塑料、软塑料(如塑料袋)或发泡聚苯乙烯泡沫塑料(如聚苯乙烯泡沫塑料);
7)被装在用收缩包装或拉伸包装的外箱中;
8)以软面包裹(例如速递包、塑料袋及气泡邮件)，其最长边超过18英寸或第二最长边超过13英寸或高度超过5英寸;
9)圆柱形，包括(但不限于)邮寄管、罐、桶、桶、桶或桶;
10)用金属、塑料或布条捆扎，或有轮子、脚轮、把手或带(包括外表面包裹松散或外表面凸出的包裹);或
11)可能卷入或损坏其他包裹或联邦快递分拣系统。', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT DO NOTHING;

-- Row 26: US | UPS Ground | 拒收
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
  v.id, cs.id, 26,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Peak Surcharge:
https://www.ups.com/assets/resources/webcontent/en_US/2022_UPS_Peak_Demand_Surcharges.pdf', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT DO NOTHING;

-- Row 27: US | UPS Ground | AHS - Dimensions
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
  v.id, cs.id, 27,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, 105,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  18.52, null, null,
  null, NULL,
  '收超标费或超大件费后不再收AHS费用；以最高的一笔为准；', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT DO NOTHING;

-- Row 28: US | UPS Ground | AHS - Weight
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
  v.id, cs.id, 28,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  21.73, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT DO NOTHING;

-- Row 29: US | UPS Ground | Large Package Surcharge Residential
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
  v.id, cs.id, 29,
  'Large Package Surcharge Residential', 'LARGE_PACKAGE_RESI',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  154.34, null, null,
  null, NULL,
  '收超大件费后不再收超标费;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT DO NOTHING;

-- Row 30: US | UPS Ground | Over Maximum Limits
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
  v.id, cs.id, 30,
  'Over Maximum Limits', 'OVER_MAX',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1695, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT DO NOTHING;

-- Row 31: US | UPS Ground | Additional Handling
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
  v.id, cs.id, 31,
  'Additional Handling', 'ADDITIONAL_HANDLING',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, 3.9, 4.9,
  null, NULL,
  '打包费收取：
-任何未完全包裹在瓦楞纸板集装箱内的物品,包括轮胎。
-任何装有非瓦楞纸板制成的外箱的包装,包括但不限于帆布、皮革、金属、木材、硬塑料、软塑料如塑料袋或膨胀的聚苯乙烯泡沫如聚苯乙烯泡沫。
-任何以软面包装例如塑胶袋及气泡邮筒包裹的物品,超过最长的边长为18英寸,第二长的边长为14英寸,高度为6英寸。
-任何外箱覆盖有收缩包装或拉伸包装的包装。
-任何用金属、塑料或布条捆扎的包裹,或有轮子、脚轮、把手的包裹或打包带包括包裹外表面松散的包裹或在包装上 内容物凸出容器表面。
-任何圆柱形物品,包括但不限于桶,桶,罐,桶,邮寄管或桶。
-任何通过UPS不规则的包裹分拣流程的包裹。
-任何其他包裹需要特殊处理,由UPS自行决定。
-适用于国内和国际服务。
-凡符合上述多项条件的包裹,只会收取一项额外的手续费评估,按以下顺序:重量,长度加周长,长度,宽度,包装。
-当使用大包裹附加费时,额外的处理费用将不被评估。', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT DO NOTHING;

-- Row 32: US | USPS | 拒收
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
  v.id, cs.id, 32,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  16, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  '毛重单位：盎司', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'USPS'
ON CONFLICT DO NOTHING;

-- Row 33: US | FBA | 无
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
  v.id, cs.id, 33,
  '无', '_',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'FBA无拒收上限', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FBA'
ON CONFLICT DO NOTHING;

-- Row 34: US | FBW | Oversize-1
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
  v.id, cs.id, 34,
  'Oversize-1', 'OVERSIZE',
  48, 30, null, 105,
  null, null, null, null,
  150, null, null, null,
  'lb', 'in',
  3, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FBW'
ON CONFLICT DO NOTHING;

-- Row 35: US | FBW | Oversize-2
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
  v.id, cs.id, 35,
  'Oversize-2', 'OVERSIZE',
  96, null, null, 130,
  null, null, null, null,
  150, null, null, null,
  'lb', 'in',
  25, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FBW'
ON CONFLICT DO NOTHING;

-- Row 36: US | FBW | 拒收
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
  v.id, cs.id, 36,
  '拒收', 'REJECT',
  120, null, null, null,
  null, null, null, null,
  500, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FBW'
ON CONFLICT DO NOTHING;

-- Row 37: US | Ontrac | AHS - Dimensions
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
  v.id, cs.id, 37,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  22, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Ontrac'
ON CONFLICT DO NOTHING;

-- Row 38: US | Ontrac | AHS - Weight
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
  v.id, cs.id, 38,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  70, null, null, null,
  'lb', 'in',
  22, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Ontrac'
ON CONFLICT DO NOTHING;

-- Row 39: US | Ontrac | Oversize Charge
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
  v.id, cs.id, 39,
  'Oversize Charge', 'OVERSIZE',
  72, null, null, 130,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  190, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Ontrac'
ON CONFLICT DO NOTHING;

-- Row 40: US | Ontrac | Unauthorized OS
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
  v.id, cs.id, 40,
  'Unauthorized OS', 'UNAUTH_OS',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  1250, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Ontrac'
ON CONFLICT DO NOTHING;

-- Row 41: US | Ontrac | 拒收
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
  v.id, cs.id, 41,
  '拒收', 'REJECT',
  42, 42, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Ontrac'
ON CONFLICT DO NOTHING;

-- Row 42: US | Amazon shipping | AHS - Dimensions
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
  v.id, cs.id, 42,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, 105,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  26, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Amazon shipping'
ON CONFLICT DO NOTHING;

-- Row 43: US | Amazon shipping | AHS - Weight
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
  v.id, cs.id, 43,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  38.97, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Amazon shipping'
ON CONFLICT DO NOTHING;

-- Row 44: US | Amazon shipping | Oversize Charge
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
  v.id, cs.id, 44,
  'Oversize Charge', 'OVERSIZE',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  184.01, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Amazon shipping'
ON CONFLICT DO NOTHING;

-- Row 45: US | Amazon shipping | Unauthorized OS
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
  v.id, cs.id, 45,
  'Unauthorized OS', 'UNAUTH_OS',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  1250, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Amazon shipping'
ON CONFLICT DO NOTHING;

-- Row 46: US | Amazon shipping | 拒收
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
  v.id, cs.id, 46,
  '拒收', 'REJECT',
  59, 33, null, 130,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'Amazon shipping'
ON CONFLICT DO NOTHING;

-- Row 47: CA | FedEx Ground | 拒收
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
  v.id, cs.id, 47,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, 1000, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 48: CA | FedEx Ground | AHS - Dimensions
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
  v.id, cs.id, 48,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, 105,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  4.83, null, null,
  null, NULL,
  '收超标费或超大件费后不再收AHS费用；', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 49: CA | FedEx Ground | AHS - Weight
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
  v.id, cs.id, 49,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  55, null, null, null,
  'lb', 'in',
  5.31, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 50: CA | FedEx Ground | Oversize Charge
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
  v.id, cs.id, 50,
  'Oversize Charge', 'OVERSIZE',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  25.2, null, null,
  null, NULL,
  '收超大件费后不再收超标费;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 51: CA | FedEx Ground | Unauthorized OS
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
  v.id, cs.id, 51,
  'Unauthorized OS', 'UNAUTH_OS',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1255, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 52: CA | FedEx Ground | AHS-Packaging
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
  v.id, cs.id, 52,
  'AHS-Packaging', 'PACKAGING',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  3.03, null, null,
  null, NULL,
  '收取打包费：
5)未完全装入外部集装箱;
6)非用波纹纤维板(纸板)材料制成的外装集装箱，包括但不限于金属、木材、帆布、皮革、硬塑料、软塑料(如塑料袋)或发泡聚苯乙烯泡沫塑料(如聚苯乙烯泡沫塑料);
7)被装在用收缩包装或拉伸包装的外箱中;
8)以软面包(例如速递包、胶袋及气泡邮件)包裹，其最长边超过18英寸(45厘米)，第二最长边超过13英寸(33厘米)或高度超过5英寸(12厘米);
9)圆柱形，包括(但不限于)邮寄管、罐、桶、桶、桶或桶;
10)用金属、塑料或布条捆扎，或有轮子、脚轮、把手或带(包括外表面包裹松散或外表面凸出的包裹);或
11)可能卷入或损坏其他包裹或联邦快递分拣系统。', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT DO NOTHING;

-- Row 53: CA | UPS Standard | 拒收
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
  v.id, cs.id, 53,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Peak网址：https://www.ups.com/ca/en/shipping/peak-surcharges.page', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT DO NOTHING;

-- Row 54: CA | UPS Standard | AHS - Dimensions
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
  v.id, cs.id, 54,
  'AHS - Dimensions', 'AHS_DIM',
  48, 30, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  4.72, null, null,
  null, NULL,
  '如果收了AHS-Weight，就不再收AHS-Size; 收large超标费或超大件费后不再收AHS费用；', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT DO NOTHING;

-- Row 55: CA | UPS Standard | AHS - Weight
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
  v.id, cs.id, 55,
  'AHS - Weight', 'AHS_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  4.72, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT DO NOTHING;

-- Row 56: CA | UPS Standard | Large Package Surcharge Residential
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
  v.id, cs.id, 56,
  'Large Package Surcharge Residential', 'LARGE_PACKAGE_RESI',
  96, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  0.14, null, null,
  null, NULL,
  '收超大件费后不再收large超标费;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT DO NOTHING;

-- Row 57: CA | UPS Standard | Over Maximum Limits
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
  v.id, cs.id, 57,
  'Over Maximum Limits', 'OVER_MAX',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  28.1, null, null,
  null, NULL,
  '金额=最低基础价格+peak', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT DO NOTHING;

-- Row 58: CA | UPS Standard | Over Maximum Limits
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
  v.id, cs.id, 58,
  'Over Maximum Limits', 'OVER_MAX',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1318.75, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT DO NOTHING;

-- Row 59: CA | UPS Standard | Additional Handling - Packaging
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
  v.id, cs.id, 59,
  'Additional Handling - Packaging', 'ADDITIONAL_HANDLING',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  3.67, null, null,
  null, NULL,
  '打包费', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT DO NOTHING;

-- Row 60: CA | Canpar | 拒收
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
  v.id, cs.id, 60,
  '拒收', 'REJECT',
  108, null, null, 165,
  null, null, null, null,
  null, 150, 1000, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT DO NOTHING;

-- Row 61: CA | Canpar | Extra Care-Over length
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
  v.id, cs.id, 61,
  'Extra Care-Over length', 'EXTRA_CARE',
  60, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  17.5, null, null,
  null, NULL,
  '超标1：over weight和over length同时满足时取较大值;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT DO NOTHING;

-- Row 62: CA | Canpar | Over weight
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
  v.id, cs.id, 62,
  'Over weight', 'OVER_WEIGHT',
  null, null, null, null,
  null, null, null, null,
  70, null, null, null,
  'lb', 'in',
  32, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT DO NOTHING;

-- Row 63: CA | Canpar | Oversize
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
  v.id, cs.id, 63,
  'Oversize', 'OVERSIZE',
  null, null, null, 130,
  null, null, null, null,
  null, null, null, 90,
  'lb', 'in',
  94.91, null, null,
  null, NULL,
  '收取超标费2后不再收超标费1;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT DO NOTHING;

-- Row 64: CA | Canpar | Over Max
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
  v.id, cs.id, 64,
  'Over Max', 'OVER_MAX',
  108, null, null, 165,
  null, null, null, null,
  150, null, null, 90,
  'lb', 'in',
  1250, null, null,
  null, NULL,
  '超标费3独立收取，（即收取3后仍可收2或1）;', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT DO NOTHING;

-- Row 65: CA | Canpar | Extra Care-Irregular
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
  v.id, cs.id, 65,
  'Extra Care-Irregular', 'EXTRA_CARE',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  17.5, null, null,
  null, NULL,
  '打包费', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT DO NOTHING;

-- Row 66: CA | FBA | 无
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
  v.id, cs.id, 66,
  '无', '_',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'FBA无拒收上限', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FBA'
ON CONFLICT DO NOTHING;

-- Row 67: CA | FBW | 无
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
  v.id, cs.id, 67,
  '无', '_',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'FBW无拒收上限', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FBW'
ON CONFLICT DO NOTHING;

-- Row 68: DE | GLS | 超标费1
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
  v.id, cs.id, 68,
  '超标费1', '_1',
  120, null, null, null,
  null, null, null, 0.15,
  null, null, null, null,
  'lb', 'in',
  4.75, null, null,
  3.25, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'GLS'
ON CONFLICT DO NOTHING;

-- Row 69: DE | GLS | 超标费2
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
  v.id, cs.id, 69,
  '超标费2', '_2',
  150, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  4.75, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'GLS'
ON CONFLICT DO NOTHING;

-- Row 70: DE | GLS | 拒收
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
  v.id, cs.id, 70,
  '拒收', 'REJECT',
  200, 90, 60, 300,
  null, null, null, null,
  40, null, null, null,
  'lb', 'in',
  null, null, null,
  3.25, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'GLS'
ON CONFLICT DO NOTHING;

-- Row 71: DE | DPD Standardpaket | 超标费1
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
  v.id, cs.id, 71,
  '超标费1', '_1',
  120, 60, null, null,
  null, null, null, 0.15,
  null, null, null, null,
  'lb', 'in',
  3, null, null,
  2.57, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'DPD Standardpaket'
ON CONFLICT DO NOTHING;

-- Row 72: DE | DPD Standardpaket | 超标费2
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
  v.id, cs.id, 72,
  '超标费2', '_2',
  175, null, null, 300,
  null, null, null, null,
  31.5, null, null, null,
  'lb', 'in',
  35, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'DPD Standardpaket'
ON CONFLICT DO NOTHING;

-- Row 73: DE | DPD Standardpaket | 拒收
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
  v.id, cs.id, 73,
  '拒收', 'REJECT',
  250, null, null, null,
  null, null, null, null,
  31.5, null, null, null,
  'lb', 'in',
  null, null, null,
  2.57, NULL,
  'DPD司机拒绝派送超过175的包裹', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'DPD Standardpaket'
ON CONFLICT DO NOTHING;

-- Row 74: DE | DPD Prime | 超标费1
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
  v.id, cs.id, 74,
  '超标费1', '_1',
  120, 60, null, null,
  null, null, null, 0.15,
  null, null, null, null,
  'lb', 'in',
  3.78, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'DPD Prime'
ON CONFLICT DO NOTHING;

-- Row 75: DE | DPD Prime | 超标费2
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
  v.id, cs.id, 75,
  '超标费2', '_2',
  175, null, null, 300,
  null, null, null, null,
  31.5, null, null, null,
  'lb', 'in',
  27.27, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'DPD Prime'
ON CONFLICT DO NOTHING;

-- Row 76: DE | DPD Prime | 拒收
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
  v.id, cs.id, 76,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  31.5, null, null, null,
  'lb', 'in',
  null, null, null,
  4.54, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'DPD Prime'
ON CONFLICT DO NOTHING;

-- Row 77: DE | GEL | 超标费
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
  v.id, cs.id, 77,
  '超标费', '_',
  320, null, null, null,
  null, null, null, null,
  60, null, null, null,
  'lb', 'in',
  15, null, null,
  19.7, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'GEL'
ON CONFLICT DO NOTHING;

-- Row 78: DE | GEL | 拒收
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
  v.id, cs.id, 78,
  '拒收', 'REJECT',
  610, 225, 120, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  19.7, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'GEL'
ON CONFLICT DO NOTHING;

-- Row 79: DE | Hellmann | 超标费
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
  v.id, cs.id, 79,
  '超标费', '_',
  240, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  25, null, null,
  20.3, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'Hellmann'
ON CONFLICT DO NOTHING;

-- Row 80: DE | Hellmann | 拒收
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
  v.id, cs.id, 80,
  '拒收', 'REJECT',
  300, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  25.94, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'Hellmann'
ON CONFLICT DO NOTHING;

-- Row 81: DE | Hermes Standardpaket | 超标费
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
  v.id, cs.id, 81,
  '超标费', '_',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  6.4, null, null,
  null, '>120; >60',
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'Hermes Standardpaket'
ON CONFLICT DO NOTHING;

-- Row 82: DE | Seller Flex | 拒收
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
  v.id, cs.id, 82,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  15.85, '<175; <360; <23',
  '最长边，周长，毛重之间逻辑是“且”', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'DE'
  AND cs.service_name = 'Seller Flex'
ON CONFLICT DO NOTHING;

-- Row 83: UK | Hermes_Next Day | 拒收
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
  v.id, cs.id, 83,
  '拒收', 'REJECT',
  120, null, null, 225,
  null, null, null, 0.04,
  10, null, null, null,
  'lb', 'in',
  null, null, null,
  2.5, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Hermes_Next Day'
ON CONFLICT DO NOTHING;

-- Row 84: UK | DX Express | 拒收
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
  v.id, cs.id, 84,
  '拒收', 'REJECT',
  150, null, null, null,
  null, null, null, null,
  25, null, null, 30,
  'lb', 'in',
  null, null, null,
  5.5, NULL,
  '计价重=max(毛重，体积重=长*宽*高/5000）', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'DX Express'
ON CONFLICT DO NOTHING;

-- Row 85: UK | DX Shipping service | 拒收
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
  v.id, cs.id, 85,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  50, null, null, null,
  'lb', 'in',
  null, null, null,
  9.3, NULL,
  '单box限重', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'DX Shipping service'
ON CONFLICT DO NOTHING;

-- Row 86: UK | XDP Economy | 拒收
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
  v.id, cs.id, 86,
  '拒收', 'REJECT',
  310, null, null, null,
  null, null, null, null,
  40, null, null, null,
  'lb', 'in',
  null, null, null,
  8.75, NULL,
  '单box限重', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'XDP Economy'
ON CONFLICT DO NOTHING;

-- Row 87: UK | Amazon Next Day | 超标费1
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
  v.id, cs.id, 87,
  '超标费1', '_1',
  null, null, null, null,
  null, null, null, 0.04,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  0.5, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Amazon Next Day'
ON CONFLICT DO NOTHING;

-- Row 88: UK | Amazon Next Day | 拒收
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
  v.id, cs.id, 88,
  '拒收', 'REJECT',
  120, 60, 60, null,
  null, null, null, null,
  23, null, null, null,
  'lb', 'in',
  null, null, null,
  2.75, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Amazon Next Day'
ON CONFLICT DO NOTHING;

-- Row 89: UK | Amazon Two Day | 超标费1
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
  v.id, cs.id, 89,
  '超标费1', '_1',
  null, null, null, null,
  null, null, null, 0.04,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  0.5, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Amazon Two Day'
ON CONFLICT DO NOTHING;

-- Row 90: UK | Amazon Two Day | 拒收
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
  v.id, cs.id, 90,
  '拒收', 'REJECT',
  120, 60, 60, null,
  null, null, null, null,
  23, null, null, null,
  'lb', 'in',
  null, null, null,
  2.48, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Amazon Two Day'
ON CONFLICT DO NOTHING;

-- Row 91: UK | Palletway H&M | 拒收
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
  v.id, cs.id, 91,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  99.9903, NULL,
  '实际尺寸限制参考托盘，按托盘个数和zone收费，价格为加权价格', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Palletway H&M'
ON CONFLICT DO NOTHING;

-- Row 92: UK | Palletway McGregor | 拒收
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
  v.id, cs.id, 92,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  79.1234, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Palletway McGregor'
ON CONFLICT DO NOTHING;

-- Row 93: UK | Palletway Howard | 拒收
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
  v.id, cs.id, 93,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  78.5908, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Palletway Howard'
ON CONFLICT DO NOTHING;

-- Row 94: UK | Palletway Cross Country | 拒收
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
  v.id, cs.id, 94,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  74.137, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Palletway Cross Country'
ON CONFLICT DO NOTHING;

-- Row 95: UK | DHL Next Day | 拒收
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
  v.id, cs.id, 95,
  '拒收', 'REJECT',
  199, 80, null, null,
  null, null, null, null,
  null, null, null, 30,
  'lb', 'in',
  null, null, null,
  4.25, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'DHL Next Day'
ON CONFLICT DO NOTHING;

-- Row 96: UK | DHL Next Day | 超标费1
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
  v.id, cs.id, 96,
  '超标费1', '_1',
  120, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  3.99, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'DHL Next Day'
ON CONFLICT DO NOTHING;

-- Row 97: UK | DHL Next Day | 超标费2
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
  v.id, cs.id, 97,
  '超标费2', '_2',
  180, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  5, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'DHL Next Day'
ON CONFLICT DO NOTHING;

-- Row 98: UK | DHL Next Day | 超标费3
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
  v.id, cs.id, 98,
  '超标费3', '_3',
  null, 80, 80, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  20, NULL,
  '任意2边长都超过80cm会收取此费用', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'DHL Next Day'
ON CONFLICT DO NOTHING;

-- Row 99: UK | DX 2M | 拒收
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
  v.id, cs.id, 99,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  34.25, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'DX 2M'
ON CONFLICT DO NOTHING;

-- Row 100: UK | Winit DPD | 拒收
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
  v.id, cs.id, 100,
  '拒收', 'REJECT',
  100, 70, 60, null,
  null, 230, null, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  5, NULL,
  '新增', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'UK'
  AND cs.service_name = 'Winit DPD'
ON CONFLICT DO NOTHING;

-- Row 101: FR | DPD Standardpaket/DPD Prime | 拒收
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
  v.id, cs.id, 101,
  '拒收', 'REJECT',
  200, null, null, 300,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'DPD Standardpaket/DPD Prime'
ON CONFLICT DO NOTHING;

-- Row 102: FR | DPD Standardpaket/DPD Prime | 超标费
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
  v.id, cs.id, 102,
  '超标费', '_',
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'DPD Standardpaket/DPD Prime'
ON CONFLICT DO NOTHING;

-- Row 103: FR | GLS | 拒收
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
  v.id, cs.id, 103,
  '拒收', 'REJECT',
  200, null, null, 300,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'GLS'
ON CONFLICT DO NOTHING;

-- Row 104: FR | GLS | 超标费
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
  v.id, cs.id, 104,
  '超标费', '_',
  120, null, null, null,
  null, 150, null, null,
  null, null, null, null,
  'lb', 'in',
  0.25, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'GLS'
ON CONFLICT DO NOTHING;

-- Row 105: FR | GEODIS | 拒收
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
  v.id, cs.id, 105,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  70, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'GEODIS'
ON CONFLICT DO NOTHING;

-- Row 106: FR | GEODIS | 超标费
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
  v.id, cs.id, 106,
  '超标费', '_',
  400, 200, null, null,
  null, null, null, 4,
  null, null, null, null,
  'lb', 'in',
  51, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'GEODIS'
ON CONFLICT DO NOTHING;

-- Row 107: FR | Chonopost（J+1)/REG | 拒收
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
  v.id, cs.id, 107,
  '拒收', 'REJECT',
  150, null, null, 300,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'Chonopost（J+1)/REG'
ON CONFLICT DO NOTHING;

-- Row 108: FR | M Relay | 拒收
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
  v.id, cs.id, 108,
  '拒收', 'REJECT',
  120, null, null, null,
  null, 150, null, 0.125,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'M Relay'
ON CONFLICT DO NOTHING;

-- Row 109: FR | DPD CLASSIC Europe | 拒收
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
  v.id, cs.id, 109,
  '拒收', 'REJECT',
  175, null, null, 300,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  '发往境外', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'DPD CLASSIC Europe'
ON CONFLICT DO NOTHING;

-- Row 110: FR | Amazon Prime | 拒收
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
  v.id, cs.id, 110,
  '拒收', 'REJECT',
  150, null, null, 300,
  null, null, 110, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Prime', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'Amazon Prime'
ON CONFLICT DO NOTHING;

-- Row 111: FR | Amazon shipping | 拒收
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
  v.id, cs.id, 111,
  '拒收', 'REJECT',
  110, 60, 60, null,
  null, null, null, null,
  15, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'FR'
  AND cs.service_name = 'Amazon shipping'
ON CONFLICT DO NOTHING;

-- Row 112: IT | BRT | 拒收
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
  v.id, cs.id, 112,
  '拒收', 'REJECT',
  350, null, null, null,
  null, null, null, null,
  300, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'BRT'
ON CONFLICT DO NOTHING;

-- Row 113: IT | BRT | 超标费
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
  v.id, cs.id, 113,
  '超标费', '_',
  150, 75, 75, null,
  180, null, null, null,
  null, null, null, null,
  'lb', 'in',
  1.554, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'BRT'
ON CONFLICT DO NOTHING;

-- Row 114: IT | GLS National Standard | 拒收
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
  v.id, cs.id, 114,
  '拒收', 'REJECT',
  300, null, null, null,
  null, null, null, null,
  70, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  '目前已停用', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'GLS National Standard'
ON CONFLICT DO NOTHING;

-- Row 115: IT | TNT Libero | 拒收
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
  v.id, cs.id, 115,
  '拒收', 'REJECT',
  240, 180, 120, null,
  null, null, null, null,
  70, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'TNT Libero'
ON CONFLICT DO NOTHING;

-- Row 116: IT | TNT Libero | 超标1 Manual Handling
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
  v.id, cs.id, 116,
  '超标1 Manual Handling', '_1_MANUAL_HANDLING',
  121, 76, null, null,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  2.5, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'TNT Libero'
ON CONFLICT DO NOTHING;

-- Row 117: IT | TNT Libero | 超标2 Exceed dimension & volume
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
  v.id, cs.id, 117,
  '超标2 Exceed dimension & volume', '_2_EXCEED_DIMENSION_VOLUME',
  240, 180, 120, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  150, null, null,
  null, NULL,
  '费用太高，系统已设置为拒收', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'TNT Libero'
ON CONFLICT DO NOTHING;

-- Row 118: IT | BRT Prime | 拒收
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
  v.id, cs.id, 118,
  '拒收', 'REJECT',
  350, null, null, null,
  null, null, null, null,
  300, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Prime', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'BRT Prime'
ON CONFLICT DO NOTHING;

-- Row 119: IT | BRT Prime | 超标费
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
  v.id, cs.id, 119,
  '超标费', '_',
  150, 75, 75, null,
  180, null, null, null,
  null, null, null, null,
  'lb', 'in',
  1.32, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'BRT Prime'
ON CONFLICT DO NOTHING;

-- Row 120: IT | BRT DIRECT INFEED | 拒收
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
  v.id, cs.id, 120,
  '拒收', 'REJECT',
  175, null, null, 300,
  null, null, null, null,
  31.5, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  '发往RO', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'BRT DIRECT INFEED'
ON CONFLICT DO NOTHING;

-- Row 121: IT | BRT DIRECT INFEED | 超标费
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
  v.id, cs.id, 121,
  '超标费', '_',
  150, 75, 75, null,
  180, null, null, null,
  null, null, null, null,
  'lb', 'in',
  1.9, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'BRT DIRECT INFEED'
ON CONFLICT DO NOTHING;

-- Row 122: IT | IT TNT Standard | 拒收
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
  v.id, cs.id, 122,
  '拒收', 'REJECT',
  240, 180, 120, null,
  null, null, null, null,
  70, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Prime', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'IT TNT Standard'
ON CONFLICT DO NOTHING;

-- Row 123: IT | IT TNT Standard | 超标费
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
  v.id, cs.id, 123,
  '超标费', '_',
  121, 76, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  1.3, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'IT TNT Standard'
ON CONFLICT DO NOTHING;

-- Row 124: IT | POSTE ITALIANE | 拒收
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
  v.id, cs.id, 124,
  '拒收', 'REJECT',
  280, null, null, null,
  null, 450, null, null,
  70, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'POSTE ITALIANE'
ON CONFLICT DO NOTHING;

-- Row 125: IT | POSTE ITALIANE | 超标费
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
  v.id, cs.id, 125,
  '超标费', '_',
  280, null, null, null,
  null, 450, null, null,
  70, null, null, null,
  'lb', 'in',
  25, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'POSTE ITALIANE'
ON CONFLICT DO NOTHING;

-- Row 126: IT | IT FedEx | 超标费1
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
  v.id, cs.id, 126,
  '超标费1', '_1',
  121, 76, null, 266,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  15.75, null, null,
  null, NULL,
  '发往RO', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'IT FedEx'
ON CONFLICT DO NOTHING;

-- Row 127: IT | IT FedEx | 超标费2
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
  v.id, cs.id, 127,
  '超标费2', '_2',
  243, null, null, 330,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  19.25, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'IT FedEx'
ON CONFLICT DO NOTHING;

-- Row 128: IT | IT FedEx | 拒收
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
  v.id, cs.id, 128,
  '拒收', 'REJECT',
  274, null, null, 330,
  null, null, null, null,
  68, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IT'
  AND cs.service_name = 'IT FedEx'
ON CONFLICT DO NOTHING;

-- Row 129: ES | SEUR 24   Amazon Prime | 拒收
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
  v.id, cs.id, 129,
  '拒收', 'REJECT',
  120, null, null, 299,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  'Prime', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'SEUR 24   Amazon Prime'
ON CONFLICT DO NOTHING;

-- Row 130: ES | SEUR | 拒收
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
  v.id, cs.id, 130,
  '拒收', 'REJECT',
  360, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'SEUR'
ON CONFLICT DO NOTHING;

-- Row 131: ES | SEUR | 超标费1
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
  v.id, cs.id, 131,
  '超标费1', '_1',
  100, null, null, null,
  null, 175, null, null,
  null, null, null, null,
  'lb', 'in',
  1, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'SEUR'
ON CONFLICT DO NOTHING;

-- Row 132: ES | SEUR | 超标费2
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
  v.id, cs.id, 132,
  '超标费2', '_2',
  175, null, null, null,
  null, 300, null, null,
  40, null, null, null,
  'lb', 'in',
  8, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'SEUR'
ON CONFLICT DO NOTHING;

-- Row 133: ES | SEUR | 超标费3
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
  v.id, cs.id, 133,
  '超标费3', '_3',
  500, null, null, null,
  null, null, null, null,
  null, null, null, null,
  'lb', 'in',
  15, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'SEUR'
ON CONFLICT DO NOTHING;

-- Row 134: ES | Envialia | 拒收
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
  v.id, cs.id, 134,
  '拒收', 'REJECT',
  null, null, null, null,
  null, null, null, null,
  40, null, 121, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'Envialia'
ON CONFLICT DO NOTHING;

-- Row 135: ES | Envialia | 超标费
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
  v.id, cs.id, 135,
  '超标费', '_',
  200, null, null, null,
  null, 300, null, null,
  40, null, null, null,
  'lb', 'in',
  35, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'Envialia'
ON CONFLICT DO NOTHING;

-- Row 136: ES | SEUR CLASSIC EUROPE | 拒收
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
  v.id, cs.id, 136,
  '拒收', 'REJECT',
  175, null, null, 300,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  null, null, null,
  null, NULL,
  '境外（除PT外）', 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'SEUR CLASSIC EUROPE'
ON CONFLICT DO NOTHING;

-- Row 137: ES | SEUR CLASSIC EUROPE | 超标费
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
  v.id, cs.id, 137,
  '超标费', '_',
  175, null, null, 300,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  25, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'ES'
  AND cs.service_name = 'SEUR CLASSIC EUROPE'
ON CONFLICT DO NOTHING;

-- Row 138: IE | RWB | 超标费1
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
  v.id, cs.id, 138,
  '超标费1', '_1',
  120, 70, null, null,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  4.5, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IE'
  AND cs.service_name = 'RWB'
ON CONFLICT DO NOTHING;

-- Row 139: IE | RWB | 超标费2
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
  v.id, cs.id, 139,
  '超标费2', '_2',
  220, 90, null, null,
  null, null, null, null,
  30, null, null, null,
  'lb', 'in',
  15, null, null,
  null, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IE'
  AND cs.service_name = 'RWB'
ON CONFLICT DO NOTHING;

-- Row 140: IE | RWB | 拒收
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
  v.id, cs.id, 140,
  '拒收', 'REJECT',
  250, 180, null, null,
  null, null, null, null,
  500, null, null, null,
  'lb', 'in',
  null, null, null,
  5.95, NULL,
  NULL, 'FULL'
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'IE'
  AND cs.service_name = 'RWB'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. 插入堆叠策略
-- ============================================================
INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'MAX_GROUP', '{"max_group":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["REJECT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'MAX_GROUP', '{"max_group":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["REJECT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery Cope'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'MAX_GROUP', '{"max_group":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["REJECT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery LC'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'MAX_GROUP', '{"max_group":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["REJECT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Home Delivery'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'MAX_GROUP', '{"max_group":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'US', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["REJECT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'UPS Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["REJECT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'FedEx Ground'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["AHS_WEIGHT"],"disable":["AHS_DIM"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["LARGE_PACKAGE_RESI"],"disable":["AHS_DIM","AHS_WEIGHT"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE"],"disable":["LARGE_PACKAGE_RESI"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'UPS Standard'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'MAX_GROUP', '{"max_group":["OVERSIZE_WEIGHT","OVERSIZE_LENGTH"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

INSERT INTO dict_express_stack_policy (
  version_id, country_code, carrier_service_id,
  policy_type, policy_json
)
SELECT
  v.id, 'CA', cs.id,
  'IF_THEN_DISABLE', '{"if_triggered":["OVERSIZE_2"],"disable":["OVERSIZE_1"]}'::jsonb
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'CA'
  AND cs.service_name = 'Canpar'
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET 
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW();

-- ============================================================
-- 5. 验证数据
-- ============================================================
-- 查询版本
SELECT 'Version' as type, COUNT(*) as count FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214'
UNION ALL
-- 查询承运商服务（仅统计本次导入的国别）
SELECT 'Carrier Service', COUNT(*) FROM dict_express_carrier_service
WHERE country_code IN ('US', 'CA', 'DE', 'UK', 'FR', 'IT', 'ES', 'IE')
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

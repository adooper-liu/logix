-- ============================================================
-- LogiX Phase A+ 基础运费与 Zone/Lane 结构
-- ============================================================

CREATE TABLE IF NOT EXISTS dict_pricing_version (
  id SERIAL PRIMARY KEY,
  version_key VARCHAR(32) NOT NULL UNIQUE,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  source_file_name TEXT NULL,
  imported_by VARCHAR(64) NULL,
  remarks TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pricing_version_status_effective
  ON dict_pricing_version(status, effective_from DESC);

CREATE TABLE IF NOT EXISTS dict_pricing_scheme (
  id SERIAL PRIMARY KEY,
  version_id INT NOT NULL REFERENCES dict_pricing_version(id) ON DELETE CASCADE,
  country_code VARCHAR(8) NOT NULL,
  carrier_code VARCHAR(32) NOT NULL,
  service_code VARCHAR(64) NOT NULL,
  product_line VARCHAR(32) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  calc_mode VARCHAR(32) NOT NULL,
  conditions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pricing_scheme_lookup
  ON dict_pricing_scheme(version_id, country_code, carrier_code, service_code, product_line, priority);
CREATE INDEX IF NOT EXISTS idx_pricing_scheme_conditions_gin
  ON dict_pricing_scheme USING GIN (conditions_json);

CREATE TABLE IF NOT EXISTS dict_zone_lane_mapping (
  id SERIAL PRIMARY KEY,
  version_id INT NOT NULL REFERENCES dict_pricing_version(id) ON DELETE CASCADE,
  country_code VARCHAR(8) NOT NULL,
  mapping_type VARCHAR(16) NOT NULL,
  origin_code VARCHAR(32) NULL,
  destination_code VARCHAR(32) NULL,
  postal_prefix_from VARCHAR(16) NULL,
  postal_prefix_to VARCHAR(16) NULL,
  zone_code VARCHAR(16) NULL,
  lane_code VARCHAR(32) NULL,
  distance_km DECIMAL(10, 2) NULL,
  conditions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zone_lane_mapping_lookup
  ON dict_zone_lane_mapping(version_id, country_code, mapping_type, priority);
CREATE INDEX IF NOT EXISTS idx_zone_lane_mapping_postal
  ON dict_zone_lane_mapping(country_code, postal_prefix_from, postal_prefix_to);
CREATE INDEX IF NOT EXISTS idx_zone_lane_mapping_origin_dest
  ON dict_zone_lane_mapping(origin_code, destination_code);

CREATE TABLE IF NOT EXISTS dict_base_rate_row (
  id SERIAL PRIMARY KEY,
  scheme_id INT NOT NULL REFERENCES dict_pricing_scheme(id) ON DELETE CASCADE,
  zone_code VARCHAR(16) NULL,
  lane_code VARCHAR(32) NULL,
  weight_from DECIMAL(10, 3) NULL,
  weight_to DECIMAL(10, 3) NULL,
  first_weight DECIMAL(10, 3) NULL,
  first_fee DECIMAL(12, 2) NULL,
  additional_step_weight DECIMAL(10, 3) NULL,
  additional_fee_per_step DECIMAL(12, 2) NULL,
  flat_fee DECIMAL(12, 2) NULL,
  unit_price_per_kg DECIMAL(12, 4) NULL,
  min_charge DECIMAL(12, 2) NULL,
  max_charge DECIMAL(12, 2) NULL,
  billable_weight_rounding VARCHAR(16) NULL,
  params_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_base_rate_row_lookup
  ON dict_base_rate_row(scheme_id, zone_code, lane_code, weight_from, weight_to);
CREATE INDEX IF NOT EXISTS idx_base_rate_row_params_gin
  ON dict_base_rate_row USING GIN (params_json);


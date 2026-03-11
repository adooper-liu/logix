-- 滞港费记录表：增加临时/永久标识与计算时间
-- is_final: false=临时（未还箱，每日更新）, true=永久（已还箱，不再更新）
-- computed_at: 计算时间

ALTER TABLE ext_demurrage_records
  ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMENT ON COLUMN ext_demurrage_records.is_final IS 'false=临时数据(每日更新), true=永久数据(已还箱)';
COMMENT ON COLUMN ext_demurrage_records.computed_at IS '计算时间';

CREATE INDEX IF NOT EXISTS idx_demurrage_rec_final ON ext_demurrage_records(container_number, is_final);

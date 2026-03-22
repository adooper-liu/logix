-- 拖卡实际提柜日来源：feituo | business | manual
ALTER TABLE process_trucking_transport
  ADD COLUMN IF NOT EXISTS pickup_date_source VARCHAR(20) NULL;

COMMENT ON COLUMN process_trucking_transport.pickup_date_source IS
  'pickup_date source: feituo (FeiTuo sync, overridable by FeiTuo); business (import, no FeiTuo overwrite); manual (API/UI, no FeiTuo overwrite)';

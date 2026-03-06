-- 修复这15个WMS已确认但状态仍为picked_up的货柜
UPDATE biz_containers SET logistics_status = 'unloaded'
WHERE container_number IN (
  'SUDU6922158',
  'MSDU6463764',
  'MRSU3357298',
  'MSMU6873153',
  'MEDU4417783',
  'MSMU8929328',
  'MSBU6628147',
  'HMMU7095585',
  'HMMU6059428',
  'HMMU6190715',
  'HMMU4317950',
  'KOCU5218650',
  'CAIU4443591',
  'KOCU4025908',
  'CAAU5871117'
);

-- 检查"缺最后还箱日"的记录数
SELECT COUNT(*) as no_last_return_date_count
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE c.logistics_status != 'returned_empty'
  AND er."returnTime" IS NULL
  AND (c.logistics_status IN ('picked_up', 'unloaded') OR tt.container_number IS NOT NULL)
  AND er."lastReturnDate" IS NULL;

-- 查看这些记录的详情
SELECT
  c.container_number,
  c.logistics_status,
  er."lastReturnDate" as last_return_date,
  er."returnTime" as return_time,
  CASE
    WHEN tt.container_number IS NOT NULL THEN '有拖卡记录'
    ELSE '无拖卡记录'
  END as trucking_status
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE c.logistics_status != 'returned_empty'
  AND er."returnTime" IS NULL
  AND (c.logistics_status IN ('picked_up', 'unloaded') OR tt.container_number IS NOT NULL)
  AND er."lastReturnDate" IS NULL
LIMIT 10;

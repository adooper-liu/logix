SELECT 
    c.container_number,
    c.logistics_status,
    c.inspection_required,
    c.is_unboxing,
    c.bill_of_lading_number
FROM biz_containers c
ORDER BY c.container_number;

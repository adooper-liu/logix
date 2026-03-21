SELECT 
    container_number,
    port_type,
    port_sequence,
    port_name,
    eta,
    ata,
    eta_correction,
    free_storage_days,
    last_free_date,
    customs_status,
    isf_status
FROM process_port_operations
ORDER BY container_number, port_sequence;

# Cleanup Script Update - Add Missing Tables

## Date: 2026-03-31

## Summary

Updated `cleanup-test-data.sql` and `cleanup-test-data.ps1` to include additional tables for comprehensive test data cleanup.

## Changes Made

### 1. Added `ext_feituo_vessels` Table

**SQL File**: `scripts/cleanup/cleanup-test-data.sql`

Added deletion statement for Feituo vessel data:

```sql
-- Delete Feituo vessel data (test data)
DELETE FROM ext_feituo_vessels;
```

**PowerShell File**: `scripts/cleanup/cleanup-test-data.ps1`

Added to preview table list:

```powershell
@{Name = "ext_feituo_vessels"; Desc = "Feituo vessels"}
```

### 2. Confirmed Existing Tables

The following tables were already included in the cleanup script:

- ✅ `sys_data_change_log` - System data change log
- ✅ `ext_trucking_return_slot_occupancy` - Trucking return slot occupancy
- ✅ `ext_container_alerts` - Container alerts

### 3. Updated Comments to English

Converted all SQL comments from Chinese to English for consistency:

- Section headers
- Table descriptions
- Notes and explanations

## Cleanup Order

The deletion follows the dependency order:

1. **Extension tables** (dependent on containers)
   - `ext_container_alerts`
   - `ext_container_status_events`
   - `ext_container_loading_records`
   - `ext_container_charges`
   - `ext_demurrage_records`
   - `ext_feituo_status_events`
   - `ext_feituo_places`
   - `ext_feituo_vessels` ← **NEW**
   - `sys_data_change_log`

2. **Process tables** (dependent on containers)
   - `process_port_operations`
   - `process_trucking_transport`
   - `process_warehouse_operations`
   - `process_empty_return`

3. **Business tables**
   - `biz_replenishment_orders`
   - `biz_containers`
   - `process_sea_freight`

4. **Resource occupancy tables** (by date, older than 30 days)
   - `ext_trucking_return_slot_occupancy`
   - `ext_trucking_slot_occupancy`
   - `ext_warehouse_daily_occupancy`
   - `ext_yard_daily_occupancy`

## Verification

The verification query at the end of the SQL script now includes:

```sql
SELECT 'ext_feituo_vessels (Feituo Vessels)', COUNT(*) FROM ext_feituo_vessels
```

## Testing

To test the updated cleanup script:

### Preview Mode

```powershell
cd scripts\cleanup
.\cleanup-test-data.ps1 -DryRun
```

### Execute Cleanup

```powershell
$env:LOGIX_DB_PASSWORD = "your_password"
.\cleanup-test-data.ps1 -Force
```

## Related Files

- `scripts/cleanup/cleanup-test-data.sql` - SQL cleanup script
- `scripts/cleanup/cleanup-test-data.ps1` - PowerShell wrapper script
- `scripts/cleanup/CLEANUP_README.md` - Documentation

## Impact

This update ensures that all test data is properly cleaned up, including:

- Feituo vessel information
- System change logs related to containers
- Container alerts
- Resource occupancy data

---

**Version**: 1.0.3  
**Date**: 2026-03-31  
**Author**: LogiX Team  
**Status**: Updated

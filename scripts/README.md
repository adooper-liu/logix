# 数据库统计脚本

## 脚本说明

本目录包含用于快速查询 LogiX 数据库记录数的脚本。

## 使用方法

### Windows PowerShell

```powershell
cd d:\Gihub\logix
powershell -ExecutionPolicy Bypass -File scripts/check-db-counts-en.ps1
```

### Windows CMD

```cmd
cd d:\Gihub\logix
scripts\check-db-counts.bat
```

### Linux/macOS Bash

```bash
cd /path/to/logix
chmod +x scripts/check-db-counts.sh
./scripts/check-db-counts.sh
```

## 输出示例

```
============================================
  LogiX Database Record Statistics
============================================

[Business Tables]

Replenishment Orders                    9 records
Containers                              9 records
Sea Freight                             9 records
Port Operations                         9 records
Trucking                                9 records
Warehouse Operations                    9 records
Empty Returns                           9 records
Container Charges                       0 records
Status Events                           0 records
Loading Records                         0 records
Hold Records                            0 records

Business Tables Total                  63 records

[Dictionary Tables]

Ports                                   0 records
Shipping Companies                      0 records
Container Types                         8 records
Freight Forwarders                      0 records
Customs Brokers                         0 records
Trucking Companies                      0 records
Warehouses                              0 records

Dictionary Tables Total                 8 records

Total Records                          71 records

[Container Logistics Status Distribution]

 logisticsStatus | count
-----------------+-------
 returned_empty   |     9

Query completed!
```

## 统计表列表

### 业务表
- `biz_replenishment_orders` - 备货单
- `biz_containers` - 货柜
- `process_sea_freight` - 海运信息
- `process_port_operations` - 港口操作
- `process_trucking` - 拖卡运输
- `process_warehouse_operations` - 仓库操作
- `process_empty_returns` - 还空箱
- `container_charges` - 海运费用
- `container_status_events` - 状态事件
- `container_loading_records` - 提柜记录
- `container_hold_records` - 滞柜记录

### 字典表
- `dict_ports` - 港口字典
- `dict_shipping_companies` - 船公司字典
- `dict_container_types` - 柜型字典
- `dict_freight_forwarders` - 货代公司字典
- `dict_customs_brokers` - 清关公司字典
- `dict_trucking_companies` - 拖车公司字典
- `dict_warehouses` - 仓库字典

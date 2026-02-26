# 数据库管理指南 (Database Management Guide)

## 📋 概述

LogiX 采用 **SQL 脚本管理表结构 + TypeORM 操作数据** 的策略。Entity 定义用于 TypeORM 查询和操作数据库，表结构变更通过 SQL 脚本管理。

---

## 🎯 核心策略

```
┌─────────────────────────────────────────────────────────┐
│                  表结构管理 (SQL 脚本)                │
│  创建表、修改字段、添加约束、删除表                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  数据操作 (TypeORM)                  │
│  查询、插入、更新、删除、关联关系                    │
└─────────────────────────────────────────────────────────┘
```

### 为什么使用 SQL 脚本管理表结构？

| 方式 | 优点 | 缺点 |
|------|------|------|
| **SQL 脚本** | ✅ 可追溯、版本控制<br>✅ 精确控制约束和索引<br>✅ 避免外键依赖问题<br>✅ 生产环境安全 | ⚠️ 需要手动编写 SQL |
| **TypeORM 同步** | ✅ 快速开发，实体修改自动同步<br>✅ 减少手动操作 | ❌ 可能删除字段导致数据丢失<br>❌ 外键依赖导致同步失败<br>❌ 无法表达复杂约束 |

### 当前配置

```env
# .env.dev 和 .env
DB_SYNCHRONIZE=false  # 保持禁用，使用 SQL 脚本管理
```

---

## 🚀 快速开始

### 首次初始化或重置数据库

**Windows PowerShell:**
```powershell
cd d:\Gihub\logix\backend
.\reinit_database_docker.ps1
```

**Linux/Mac:**
```bash
cd d:/Gihub/logix/backend
chmod +x reinit_database_docker.sh
./reinit_database_docker.sh
```

执行步骤：
1. [1/6] 删除所有表
2. [2/6] 创建表结构
3. [3/6] 初始化字典数据（国别、客户类型、港口、海外公司、货柜类型）
4. [4/6] 初始化仓库数据（149个仓库）
5. [5/6] 修复约束与索引

---

## 📦 SQL 脚本说明

### 初始化脚本（按顺序执行）

| 文件 | 说明 | 数据量 |
|------|------|--------|
| `01_drop_all_tables.sql` | 删除所有表 | - |
| `03_create_tables.sql` | 创建表结构和约束 | 28张表 |
| `02_init_dict_tables.sql` | 初始化字典数据 | 144条 |
| `05_init_warehouses.sql` | 初始化仓库数据 | 149条 |
| `04_fix_constraints.sql` | 添加外键和索引 | 26个 |

### 字典数据详情

**dict_countries** (28条)
- 覆盖亚洲、欧洲、北美、大洋洲等主要贸易国家

**dict_customer_types** (3条)
- PLATFORM: 平台客户（WAYFAIR、AMAZON、TARGET等）
- SUBSIDIARY: 集团内部子公司（AoSOM/MH集团）
- OTHER: 其他客户

**dict_ports** (67条)
- 32个国家的主要港口
- 包含起运港、目的港、中转港

**dict_overseas_companies** (9条)
- AoSOM/MH集团海外子公司
- 覆盖US、CA、GB、FR、DE、IT、IE、ES、RO

**dict_container_types** (37条)
- 普通柜、高柜、平板柜、开顶柜、罐式柜、冷藏柜、挂衣柜
- 尺寸：20ft、40ft、45ft、53ft

**dict_warehouses** (149条)
- 10个国家（US、CA、GB、FR、DE、IT、ES、IE、RO、PT）
- 3种类型：自营仓、平台仓、第三方仓

---

## 🔄 Entity 定义

### 已对齐的实体（28个）

**字典表 (10个):**
- ✅ Country
- ✅ CustomerType
- ✅ Port
- ✅ ShippingCompany
- ✅ FreightForwarder
- ✅ CustomsBroker
- ✅ TruckingCompany
- ✅ ContainerType
- ✅ OverseasCompany
- ✅ Warehouse

**业务表 (3个):**
- ✅ Customer
- ✅ ReplenishmentOrder
- ✅ Container

**流程表 (5个):**
- ✅ SeaFreight
- ✅ PortOperation
- ✅ TruckingTransport
- ✅ WarehouseOperation
- ✅ EmptyReturn

**扩展表 (4个):**
- ✅ ContainerStatusEvent
- ✅ ContainerLoadingRecord
- ✅ ContainerHoldRecord
- ✅ ContainerCharge

---

## 🛠️ 常见操作

### 添加新字段

```sql
-- 方式1: 修改表结构脚本 (推荐)
-- 03_create_tables.sql 或创建新的 ALTER TABLE 语句
ALTER TABLE biz_containers
ADD COLUMN new_field VARCHAR(50);

-- 重新执行初始化
.\reinit_database_docker.ps1
```

### 修改表结构

```bash
# 1. 备份数据
docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db > backup.sql

# 2. 修改 SQL 脚本
vim 03_create_tables.sql

# 3. 重新初始化（会清空数据）
.\reinit_database_docker.ps1

# 4. 恢复数据（如需要）
docker exec -i logix-timescaledb-prod psql -U logix_user logix_db < backup.sql
```

### 检查表结构

```bash
# 查看所有表
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\dt"

# 查看表结构
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\d dict_warehouses"

# 查看外键关系
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE constraint_type = 'FOREIGN KEY';
"
```

---

## ⚠️ 注意事项

### 为什么不启用 DB_SYNCHRONIZE=true？

1. **数据丢失风险**: TypeORM 可能删除 Entity 中没有的字段
2. **外键依赖问题**: 无法删除被外键引用的主键
3. **命名不一致**: Entity 驼峰命名 vs SQL 下划线命名
4. **约束无法对齐**: CHECK 约束、默认值等无法完全通过 Entity 表达

### 何时需要启用同步？

仅在以下情况临时启用：
- **全新数据库初始化**: 从零开始创建表结构
- **开发环境测试**: 验证 Entity 定义是否正确

完成后立即改回 `false`。

---

## 📝 同步模式切换

使用提供的工具切换同步模式：

```powershell
# 查看当前模式
.\switch-sync-mode.ps1 check

# 开启同步（临时）
.\switch-sync-mode.ps1 true

# 关闭同步（推荐）
.\switch-sync-mode.ps1 false
```

---

## 📊 数据一致性检查

```bash
# 检查孤立数据
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
  -- 孤立的备货单（没有货柜）
  SELECT COUNT(*) FROM biz_replenishment_orders ro
  WHERE NOT EXISTS (SELECT 1 FROM biz_containers c WHERE c.order_number = ro.order_number);

  -- 孤立的货柜（没有备货单）
  SELECT COUNT(*) FROM biz_containers c
  WHERE NOT EXISTS (SELECT 1 FROM biz_replenishment_orders ro WHERE ro.order_number = c.order_number);
"
```

---

## 📞 问题排查

### TypeORM 同步失败

**错误信息:** `cannot drop constraint because other objects depend on it`

**原因:** 尝试删除被外键引用的主键

**解决方案:**
```powershell
# 禁用同步
.\switch-sync-mode.ps1 false

# 使用 SQL 脚本手动修改
```

### 外键约束错误

**错误信息:** `insert or update on table violates foreign key constraint`

**解决方案:**
```bash
# 检查引用的数据是否存在
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
  SELECT * FROM dict_overseas_companies WHERE company_code = 'AOSOM_US';
"
```

---

## 🎓 最佳实践

1. ✅ **生产环境始终使用 SQL 脚本管理**
2. ✅ **SQL 脚本纳入版本控制**
3. ✅ **重要操作前备份数据**
4. ✅ **定期检查数据一致性**
5. ✅ **保持 Entity 定义与 SQL 表结构一致**
6. ✅ **复杂约束使用 SQL 脚本定义**
7. ✅ **使用事务执行批量操作**

---

## 📚 相关文档

- [README.md](./README.md) - 项目总览
- [switch-sync-mode.ps1](./switch-sync-mode.ps1) - 同步模式切换工具

---

**版本:** v1.0  
**最后更新:** 2026-02-25  
**状态:** ✅ 已验证

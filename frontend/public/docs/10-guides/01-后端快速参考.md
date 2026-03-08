# 后端快速参考文档

**最后更新**: 2026-02-26

---

## 🚀 快速开始

### 数据库初始化

```bash
# 方式1: 使用PowerShell脚本（推荐）
.\backend\reinit_database_docker.ps1

# 方式2: 手动执行SQL脚本
docker exec -i logix-postgres psql -U logix_user -d logix_db < backend\01_drop_all_tables.sql
docker exec -i logix-postgres psql -U logix_user -d logix_db < backend\03_create_tables.sql
docker exec -i logix-postgres psql -U logix_user -d logix_db < backend\04_fix_constraints.sql
docker exec -i logix-postgres psql -U logix_user -d logix_db < backend\02_init_dict_tables_final.sql
docker exec -i logix-postgres psql -U logix_user -d logix_db < backend\05_init_warehouses.sql
```

### 启动后端服务

```bash
cd backend
npm install
npm run dev
```

**访问**: <http://localhost:3001>

---

## 📁 核心SQL脚本

| 脚本 | 用途 | 何时使用 |
|------|------|---------|
| `01_drop_all_tables.sql` | 删除所有表 | 完全重置数据库 |
| `03_create_tables.sql` | 创建所有表 | 首次初始化 |
| `04_fix_constraints.sql` | 修复外键约束 | 表创建后 |
| `02_init_dict_tables_final.sql` | 初始化字典数据 | 表创建后 |
| `05_init_warehouses.sql` | 初始化仓库数据 | 字典初始化后 |

---

## 🔄 常用操作

### 切换TypeORM同步模式

```bash
.\backend\switch-sync-mode.ps1
```

### 连接数据库

```bash
docker exec -it logix-postgres psql -U logix_user -d logix_db
```

### 查看数据库日志

```bash
docker logs logix-postgres
```

---

## 📋 表结构命名规范

### 表名前缀

| 前缀 | 类型 | 示例 |
|------|------|------|
| `dict_` | 字典表 | `dict_countries`, `dict_shipping_companies` |
| `biz_` | 业务表 | `biz_containers`, `biz_replenishment_orders` |
| `process_` | 流程表 | `process_sea_freight`, `process_port_operations` |
| `ext_` | 扩展表 | `ext_container_status_events` |

### 字段命名

- 数据库: `snake_case` (如 `container_number`)
- 实体: `camelCase` (如 `containerNumber`)
- API: `snake_case` (如 `container_number`)

---

## 🗂️ 文件结构

```
backend/
├── src/
│   ├── controllers/     # 控制器层
│   ├── entities/        # TypeORM实体
│   ├── routes/          # 路由定义
│   ├── services/        # 业务逻辑
│   └── database/        # 数据库配置
├── *.sql                # SQL脚本
├── *.ps1               # PowerShell工具
├── .env                # 环境变量
└── DATABASE_MANAGEMENT_GUIDE.md  # 完整指南
```

---

## 📚 相关文档

- `backend/DATABASE_MANAGEMENT_GUIDE.md` - 完整数据库管理指南
- `DEVELOPMENT_STANDARDS.md` - 开发规范
- `docs/CORE_MAPPINGS_REFERENCE.md` - 核心映射参考

# 车队 partnership_level 字段迁移指南

**创建日期**: 2026-03-26  
**目的**: 添加车队合作关系级别字段到数据库

---

## 📋 **迁移文件位置**

**SQL 脚本**: `backend/scripts/add-trucking-partnership-level.sql`

---

## 🔧 **执行方式（3 种选择）**

### **方式 1: 使用 psql 命令行（推荐）**

```bash
# Windows PowerShell
cd d:\Gihub\logix\backend
psql -h localhost -p 5432 -U logix_user -d logix_db -f scripts/add-trucking-partnership-level.sql

# 或者使用 pgAdmin 的查询工具执行 SQL 文件内容
```

**如果 psql 不在 PATH 中，找到它的位置**:

```bash
# 查找 PostgreSQL 安装目录
where psql

# 通常在以下位置之一:
# C:\Program Files\PostgreSQL\15\bin\psql.exe
# C:\Program Files\PostgreSQL\16\bin\psql.exe
```

**使用完整路径执行**:

```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -p 5432 -U logix_user -d logix_db -f scripts/add-trucking-partnership-level.sql
```

---

### **方式 2: 使用 Node.js 脚本**

已创建脚本：`backend/scripts/run-partnership-migration.js`

**执行步骤**:

1. **创建执行脚本**（见下方）
2. **运行脚本**:
   ```bash
   cd backend
   node scripts/run-partnership-migration.js
   ```

---

### **方式 3: 手动复制粘贴 SQL**

1. 打开 `backend/scripts/add-trucking-partnership-level.sql`
2. 复制所有 SQL 内容
3. 在 pgAdmin 或 DBeaver 中执行

---

## 📝 **完整的 Node.js 执行脚本**

创建文件 `backend/scripts/run-partnership-migration.js`:

```javascript
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  console.log("🚀 开始执行数据库迁移：添加 partnership_level 字段\n");

  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "logix_user",
    password: "LogiX@2024!Secure",
    database: "logix_db",
  });

  try {
    await client.connect();
    console.log("✅ 数据库连接成功\n");

    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, "add-trucking-partnership-level.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    // 执行 SQL
    console.log("正在执行 SQL 脚本...");
    await client.query(sqlContent);
    console.log("✅ SQL 执行成功\n");

    // 验证结果
    console.log("验证结果...");
    const result = await client.query(`
      SELECT 
        company_code,
        company_name,
        daily_capacity,
        COALESCE(partnership_level, 'NULL') as partnership_level,
        status
      FROM dict_trucking_companies
      ORDER BY partnership_level NULLS LAST, company_code
      LIMIT 10
    `);

    console.log("\n前 10 个车队数据:");
    console.table(result.rows);

    // 统计分布
    const stats = await client.query(`
      SELECT 
        COALESCE(partnership_level, 'NULL') as level,
        COUNT(*) as count
      FROM dict_trucking_companies
      GROUP BY partnership_level
      ORDER BY count DESC
    `);

    console.log("\n车队等级分布统计:");
    console.table(stats.rows);

    await client.end();
    console.log("\n✅ 数据库迁移执行完成！\n");
  } catch (error) {
    console.error("❌ 迁移失败:", error.message);
    if (error.detail) {
      console.error("详情:", error.detail);
    }
    process.exit(1);
  }
}

runMigration().catch(console.error);
```

---

## ✅ **验证步骤**

### **1. 检查字段是否存在**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'dict_trucking_companies'
  AND column_name = 'partnership_level';
```

**预期结果**:

```
column_name       | data_type          | column_default
------------------+--------------------+---------------
partnership_level | character varying  | 'NORMAL'
```

### **2. 查看示例数据**

```sql
SELECT
  company_code,
  company_name,
  daily_capacity,
  partnership_level,
  status
FROM dict_trucking_companies
LIMIT 10;
```

### **3. 统计各等级数量**

```sql
SELECT
  partnership_level,
  COUNT(*) as count
FROM dict_trucking_companies
GROUP BY partnership_level
ORDER BY count DESC;
```

**预期结果**:

```
partnership_level | count
------------------+-------
NORMAL            | XX    (所有现有车队)
```

---

## 🎯 **后续操作**

### **1. 设置核心车队等级（可选）**

```sql
-- 示例：将某些车队设置为 CORE 级别
UPDATE dict_trucking_companies
SET partnership_level = 'CORE'
WHERE company_code IN ('TRUCK_001', 'TRUCK_002');

-- 示例：将战略合作伙伴设置为 STRATEGIC
UPDATE dict_trucking_companies
SET partnership_level = 'STRATEGIC'
WHERE company_code = 'TRUCK_VIP_001';
```

### **2. 重启后端服务**

```bash
cd backend
npm run dev
```

### **3. 测试排产功能**

访问前端排产页面，执行排产并查看日志：

```
[IntelligentScheduling] Partnership level for TRUCK_001: NORMAL (+10)
[IntelligentScheduling] Relationship score for TRUCK_001: 75.00
```

---

## ⚠️ **常见问题**

### **问题 1: psql 命令找不到**

**解决**: 使用完整路径或改用 Node.js 脚本

### **问题 2: 权限不足**

**解决**: 确保使用 `logix_user` 用户有 ALTER TABLE 权限

```sql
-- 授予权限（如果需要）
GRANT ALTER ON dict_trucking_companies TO logix_user;
```

### **问题 3: 字段已存在**

**解决**: SQL 中已使用 `IF NOT EXISTS`，不会报错

### **问题 4: Entity 类型错误**

**解决**: TypeScript 编译后重启服务即可

---

## 📚 **相关文件**

| 文件          | 路径                                                    | 说明     |
| ------------- | ------------------------------------------------------- | -------- |
| **SQL 脚本**  | `backend/scripts/add-trucking-partnership-level.sql`    | 迁移脚本 |
| **Node 脚本** | `backend/scripts/run-partnership-migration.js`          | 执行脚本 |
| **Entity**    | `backend/src/entities/TruckingCompany.ts`               | 已更新   |
| **Service**   | `backend/src/services/intelligentScheduling.service.ts` | 已更新   |

---

_本指南遵循 SKILL 原则，所有步骤基于实际环境设计_

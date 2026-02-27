# 场景示例：新增港口映射（釜山）

## 背景
供应商发来的 Excel 数据包含港口"釜山"，但系统无法识别，需要建立映射。

---

## 操作方式选择

本示例提供两种操作方式：
- **方式一：前端界面操作**（推荐，可视化）
- **方式二：API/SQL 直接操作**（适用于批量或自动化）

---

## 方式一：前端界面操作（推荐）

---

---

### 步骤 1: 访问前端界面

1. 登录 LogiX 系统
2. 点击顶部导航栏 → **系统** → **通用字典映射**
3. 进入通用字典映射管理页面

### 步骤 2: 检查港口字典

#### 2.1 确认标准港口代码
根据国际港口代码标准，"釜山"的标准代码是 `KRPUS`。

#### 2.2 添加到基础字典表（如果不存在）

**方式一：通过数据库直接插入**
```sql
INSERT INTO dict_ports (
  port_code,
  port_name_cn,
  port_name_en,
  port_type,
  country_code,
  latitude,
  longitude,
  created_at,
  updated_at
) VALUES (
  'KRPUS',
  '釜山',
  'Busan',
  'SEA_PORT',
  'KR',
  35.1058,
  129.0314,
  NOW(),
  NOW()
);
```

**验证插入成功：**
```sql
SELECT * FROM dict_ports WHERE port_code = 'KRPUS';
```

### 步骤 3: 在前端界面创建映射

#### 3.1 选择字典类型
- 点击顶部的 **🚢 港口** 标签（或搜索"港口"）
- 查看当前已有多少条港口映射

#### 3.2 点击"新增映射"按钮
- 点击页面右侧的 **"新增映射"** 按钮
- 弹出新增映射对话框

#### 3.3 填写映射信息
在对话框中填写以下信息：

| 字段 | 值 | 说明 |
|------|-----|------|
| 字典类型 | 港口 (PORT) | 自动填充，不可修改 |
| 目标表 | dict_ports | 自动生成 |
| 目标字段 | port_code | 自动生成 |
| **标准代码** | **KRPUS** | 必填 |
| **中文名称** | **釜山** | 必填 |
| 英文名称 | Busan | 可选 |
| 别名 | 釜山港, Busan Port, PUS | 多个用逗号分隔 |
| 状态 | 启用 | 开关控制 |

#### 3.4 提交保存
- 点击 **"确定"** 按钮保存
- 系统提示"添加成功"
- 映射自动添加到列表中

### 步骤 4: 测试映射功能

#### 4.1 使用测试查询功能
1. 点击页面顶部的 **"测试查询"** 按钮
2. 弹出测试查询对话框
3. 选择字典类型：**港口**
4. 输入测试名称：**釜山**
5. 点击 **"测试"** 按钮

**预期结果：**
```
✅ 查询成功: "釜山" -> "KRPUS"
```

#### 4.2 测试别名
也可以测试别名是否生效：
- 输入：**釜山港** → 结果：`✅ 查询成功: "釜山港" -> "KRPUS"`
- 输入：**Busan** → 结果：`✅ 查询成功: "Busan" -> "KRPUS"`

### 步骤 5: 管理映射

#### 查看映射列表
- 表格显示所有港口映射
- 包含：ID、标准代码、中英文名称、别名、状态、创建时间

#### 编辑映射
1. 点击列表中映射行的 **"编辑"** 按钮
2. 修改需要变更的信息（如添加更多别名）
3. 点击 **"确定"** 保存

#### 复制映射
- 点击 **"复制"** 按钮
- 自动复制映射信息到剪贴板：
  ```
  釜山 = KRPUS
  别名: 釜山港, Busan Port, PUS
  ```

#### 删除映射
1. 点击 **"删除"** 按钮
2. 确认删除对话框
3. 映射被删除

#### 搜索映射
- 在搜索框输入关键词
- 支持搜索：中文名称、英文名称、标准代码
- 例如：输入"青岛"可找到所有青岛相关映射

### 步骤 6: 清除缓存

修改映射后，建议清除前端缓存：
1. 点击页面顶部的 **"清除缓存"** 按钮
2. 系统提示"缓存已清除"
3. Excel 导入会使用最新映射数据

### 步骤 7: 验证 Excel 导入

1. 导入包含"釜山"的 Excel 文件
2. 查看导入日志
3. 验证数据库中的港口代码

**预期日志：**
```
✓ 港口映射成功: "釜山" -> "KRPUS"
✓ Excel 导入成功: 10 条记录
```

**验证数据库：**
```sql
SELECT DISTINCT destination_port
FROM port_operations
WHERE destination_port = 'KRPUS';
```

---

## 方式二：API/SQL 直接操作

### 步骤 1: 检查港口字典

### 1.1 检查是否已存在标准代码
```sql
-- 查询港口字典中是否有"釜山"相关记录
SELECT port_code, port_name_cn, port_name_en
FROM dict_ports
WHERE port_name_cn LIKE '%釜山%'
   OR port_name_en LIKE '%busan%'
   OR port_code LIKE '%KRPUS%';
```

**结果：** 无记录

### 1.2 确认标准港口代码
根据国际港口代码标准，"釜山"的标准代码是 `KRPUS`。

---

### 步骤 2: 添加到基础字典表

#### 方式一：通过 API 添加

**请求：**
```bash
POST /api/dictionaries/port
{
  "port_code": "KRPUS",
  "port_name_cn": "釜山",
  "port_name_en": "Busan",
  "port_type": "SEA_PORT",
  "country_code": "KR",
  "latitude": 35.1058,
  "longitude": 129.0314
}
```

#### 方式二：直接插入数据库

```sql
INSERT INTO dict_ports (
  port_code,
  port_name_cn,
  port_name_en,
  port_type,
  country_code,
  latitude,
  longitude,
  created_at,
  updated_at
) VALUES (
  'KRPUS',
  '釜山',
  'Busan',
  'SEA_PORT',
  'KR',
  35.1058,
  129.0314,
  NOW(),
  NOW()
);
```

**验证插入成功：**
```sql
SELECT * FROM dict_ports WHERE port_code = 'KRPUS';
```

---

### 步骤 3: 创建通用字典映射

### 3.1 添加主映射（标准名称）

**API 请求：**
```bash
POST /api/dict-mapping/universal
{
  "dictType": "PORT",
  "targetTable": "dict_ports",
  "targetField": "port_code",
  "standardCode": "KRPUS",
  "nameCn": "釜山",
  "nameEn": "Busan",
  "aliases": [],
  "isActive": true
}
```

**或直接插入：**
```sql
INSERT INTO dict_universal_mapping (
  dict_type,
  target_table,
  target_field,
  standard_code,
  name_cn,
  name_en,
  aliases,
  is_active,
  created_at,
  updated_at
) VALUES (
  'PORT',
  'dict_ports',
  'port_code',
  'KRPUS',
  '釜山',
  'Busan',
  '[]"::jsonb,
  true,
  NOW(),
  NOW()
);
```

### 3.2 添加别名映射（常见变体）

为提高识别率，添加常见别名：
- "釜山港"
- "Busan Port"
- "PUS" (缩写)

**更新别名：**
```sql
UPDATE dict_universal_mapping
SET aliases = '["釜山港", "Busan Port", "PUS"]'::jsonb,
    updated_at = NOW()
WHERE dict_type = 'PORT' AND standard_code = 'KRPUS';
```

**或通过 API：**
```bash
PUT /api/dict-mapping/universal/:id
{
  "nameCn": "釜山",
  "nameEn": "Busan",
  "aliases": ["釜山港", "Busan Port", "PUS"]
}
```

---

## 前端界面特性

### 统计概览
页面顶部显示四个统计卡片：
- 📊 **总映射数** - 所有字典类型的映射总数
- ✅ **启用** - 当前启用的映射数
- ⏸️ **停用** - 已停用的映射数
- 📋 **字典类型** - 系统支持的字典类型数量

### 字典类型标签
- 9 种字典类型快速切换
- 每个类型显示对应的映射数量
- 点击标签切换到对应类型的映射列表

支持的字典类型：
- 🚢 港口
- 🌍 国家
- 🚢 船公司
- 📦 柜型
- 🚚 货代公司
- 📋 清关公司
- 🚛 拖车公司
- 🏭 仓库
- 👤 客户

### 搜索功能
- 支持模糊搜索
- 同时搜索：中文名称、英文名称、标准代码
- 实时过滤列表

### 批量操作
- 复制映射信息到剪贴板
- 编辑现有映射
- 删除映射（带确认提示）

### 测试查询
- 实时测试字典映射是否生效
- 输入任意名称，立即返回标准代码
- 支持测试别名映射

### 缓存管理
- 一键清除前端缓存
- 确保使用最新映射数据
- Excel 导入自动使用缓存

### 响应式设计
- 自适应不同屏幕尺寸
- 移动端友好
- 优雅的动画和交互

---

### 3.3 验证映射

```sql
-- 验证映射表
SELECT * FROM dict_universal_mapping
WHERE dict_type = 'PORT' AND standard_code = 'KRPUS';

-- 测试数据库函数
SELECT get_standard_code('PORT', '釜山');
-- 预期结果: KRPUS

SELECT get_standard_code('PORT', '釜山港');
-- 预期结果: KRPUS

SELECT get_standard_code('PORT', 'Busan');
-- 预期结果: KRPUS

-- 批量测试
SELECT get_standard_codes_batch('PORT', ARRAY['釜山', '釜山港', 'Busan']);
-- 预期结果: {KRPUS,KRPUS,KRPUS}
```

---

## 步骤 4: 前端测试（可选）

### 4.1 测试 API 查询
```bash
# 单个查询
curl "http://localhost:3001/api/dict-mapping/universal/code?dictType=PORT&name=釜山"

# 批量查询
curl -X POST http://localhost:3001/api/dict-mapping/universal/batch \
  -H "Content-Type: application/json" \
  -d '{
    "dictType": "PORT",
    "names": ["釜山", "釜山港", "Busan"]
  }'

# 模糊搜索
curl "http://localhost:3001/api/dict-mapping/universal/search/PORT?keyword=釜山"
```

### 4.2 清除前端缓存
如果前端已缓存旧数据，需清除缓存：
```typescript
// 在浏览器控制台执行
localStorage.removeItem('universalDictMappingCache');
// 或刷新页面
location.reload();
```

---

## 步骤 5: 验证 Excel 导入

### 5.1 重新导入 Excel
使用包含"釜山"的 Excel 文件重新导入：
```bash
# 前端操作：选择 Excel 文件 -> 点击导入
```

### 5.2 查看导入日志
预期日志：
```
✓ 港口映射成功: "釜山" -> "KRPUS"
✓ 港口映射成功: "釜山港" -> "KRPUS"
✓ Excel 导入成功: 10 条记录
```

### 5.3 验证数据库数据
```sql
-- 检查导入的港口代码
SELECT DISTINCT destination_port
FROM port_operations
WHERE destination_port = 'KRPUS';

-- 检查完整的港口操作记录
SELECT *
FROM port_operations
WHERE destination_port = 'KRPUS'
LIMIT 10;
```

---

## 常见问题排查

### 问题 1: 映射仍然失败
**可能原因：** 前端缓存未更新

**解决方案：**
```typescript
// 方式一：清除缓存
localStorage.clear();

// 方式二：强制刷新
location.reload(true);
```

### 问题 2: 别名不生效
**可能原因：** JSON 格式错误

**检查别名格式：**
```sql
SELECT standard_code, aliases, jsonb_typeof(aliases)
FROM dict_universal_mapping
WHERE standard_code = 'KRPUS';

-- 预期结果: aliases 类型应为 "array"
-- 如果是 "string"，说明格式错误，需要修正
```

**修正示例：**
```sql
-- 错误示例：字符串类型
UPDATE dict_universal_mapping
SET aliases = '["釜山港", "Busan Port", "PUS"]'::jsonb  -- 注意 ::jsonb
WHERE standard_code = 'KRPUS';
```

### 问题 3: 数据库函数返回 NULL
**可能原因：** 函数未找到匹配项

**排查步骤：**
```sql
-- 检查名称是否完全匹配
SELECT name_cn, name_en
FROM dict_universal_mapping
WHERE dict_type = 'PORT'
  AND (name_cn = '釜山' OR name_en = '釜山');

-- 检查是否区分大小写
SELECT name_cn, name_en, lower(name_cn), lower(name_en)
FROM dict_universal_mapping
WHERE dict_type = 'PORT'
  AND (lower(name_cn) = 'busan' OR lower(name_en) = 'busan');

-- 检查别名
SELECT aliases
FROM dict_universal_mapping
WHERE dict_type = 'PORT' AND standard_code = 'KRPUS';
```

---

## 批量导入多个港口示例

### 场景：需要一次性添加 10 个新港口

### 准备数据文件 (ports.csv)
```csv
port_code,name_cn,name_en,port_type,country_code
KRPUS,釜山,Busan,SEA_PORT,KR
JPTYO,东京,Tokyo,SEA_PORT,JP
SGSIN,新加坡,Singapore,SEA_PORT,SG
HKHKG,香港,Hong Kong,SEA_PORT,HK
...
```

### 导入脚本
```sql
-- 从 CSV 批量插入到字典表
COPY dict_ports (port_code, port_name_cn, port_name_en, port_type, country_code, created_at, updated_at)
FROM '/tmp/ports.csv'
WITH (FORMAT CSV, HEADER);

-- 批量创建映射
INSERT INTO dict_universal_mapping (dict_type, target_table, target_field, standard_code, name_cn, name_en, aliases, is_active, created_at, updated_at)
SELECT
  'PORT' as dict_type,
  'dict_ports' as target_table,
  'port_code' as target_field,
  port_code as standard_code,
  port_name_cn as name_cn,
  port_name_en as name_en,
  '[]'::jsonb as aliases,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM dict_ports
WHERE port_code IN (SELECT port_code FROM temp_new_ports)
  AND port_code NOT IN (SELECT standard_code FROM dict_universal_mapping WHERE dict_type = 'PORT');
```

---

## 总结

### 推荐操作流程

**前端界面操作（推荐）**
1. 访问"系统" → "通用字典映射"
2. 选择字典类型 → 检查现有映射
3. 点击"新增映射" → 填写映射信息
4. 使用"测试查询" → 验证映射生效
5. 清除缓存 → 确保使用最新数据
6. 导入 Excel → 验证数据正确

**API/SQL 操作（批量或自动化）**
1. 确认标准代码
2. 添加到基础字典表 (`dict_ports`)
3. 创建通用字典映射
4. 添加常用别名
5. 测试数据库函数
6. 测试 API 查询
7. 验证 Excel 导入
8. 检查数据库数据

### 操作检查清单（前端界面）
- [ ] 确认港口标准代码
- [ ] 添加到基础字典表（如不存在）
- [ ] 在前端界面创建通用字典映射
- [ ] 填写中英文名称和别名
- [ ] 使用"测试查询"验证映射
- [ ] 清除前端缓存
- [ ] 验证 Excel 导入
- [ ] 检查数据库数据

### 操作检查清单（API/SQL）
- [ ] 确认港口标准代码
- [ ] 添加到基础字典表 (`dict_ports`)
- [ ] 创建通用字典映射
- [ ] 添加常用别名
- [ ] 测试数据库函数
- [ ] 测试 API 查询
- [ ] 清除前端缓存
- [ ] 验证 Excel 导入
- [ ] 检查数据库数据

### 关键文件和路径

**前端界面**
- 管理页面：`frontend/src/views/system/DictMapping.vue`
- 路由配置：`frontend/src/router/index.ts`
- 菜单配置：`frontend/src/components/layout/Layout.vue`
- 前端服务：`frontend/src/services/universalDictMapping.ts`

**后端 API**
- 映射表：`dict_universal_mapping`
- 控制器：`backend/src/controllers/universal-dict-mapping.controller.ts`
- 路由：`backend/src/routes/universal-dict-mapping.routes.ts`
- 数据库函数：`get_standard_code()`, `get_standard_codes_batch()`

**数据库**
- 字典表：`dict_ports`
- 映射表：`dict_universal_mapping`
- 初始化脚本：`backend/migrations/create_universal_dict_mapping.sql`

### 常用 SQL 命令速查
```sql
-- 查询映射
SELECT * FROM dict_universal_mapping WHERE dict_type = 'PORT' AND name_cn = '釜山';

-- 测试函数
SELECT get_standard_code('PORT', '釜山');

-- 批量测试
SELECT get_standard_codes_batch('PORT', ARRAY['釜山', '釜山港']);

-- 统计映射数
SELECT COUNT(*) FROM dict_universal_mapping WHERE dict_type = 'PORT';

-- 查找孤立映射
SELECT m.* FROM dict_universal_mapping m
LEFT JOIN dict_ports p ON m.standard_code = p.port_code
WHERE m.dict_type = 'PORT' AND p.port_code IS NULL;
```

### 常用 API 端点
```bash
# 单个查询
GET /api/dict-mapping/universal/code?dictType=PORT&name=釜山

# 批量查询
POST /api/dict-mapping/universal/batch

# 获取指定类型的所有映射
GET /api/dict-mapping/universal/type/PORT

# 模糊搜索
GET /api/dict-mapping/universal/search/PORT?keyword=青岛

# 添加映射
POST /api/dict-mapping/universal

# 更新映射
PUT /api/dict-mapping/universal/:id

# 删除映射
DELETE /api/dict-mapping/universal/:id

# 获取统计信息
GET /api/dict-mapping/universal/stats/summary
```

### 前端界面功能速查
| 功能 | 位置 | 说明 |
|------|------|------|
| 统计概览 | 页面顶部 | 查看总映射数、启用/停用数、字典类型数 |
| 字典类型切换 | 标签栏 | 点击标签切换不同字典类型的映射 |
| 搜索映射 | 搜索框 | 输入关键词搜索映射 |
| 新增映射 | 新增按钮 | 点击弹出对话框，填写映射信息 |
| 编辑映射 | 编辑按钮 | 修改现有映射 |
| 复制映射 | 复制按钮 | 复制映射信息到剪贴板 |
| 删除映射 | 删除按钮 | 删除映射（需确认） |
| 测试查询 | 测试按钮 | 实时测试映射是否生效 |
| 清除缓存 | 清除缓存按钮 | 清除前端缓存，使用最新数据 |
| 刷新列表 | 刷新按钮 | 重新加载映射数据 |

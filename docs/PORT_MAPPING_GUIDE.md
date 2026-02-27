# 港口名称映射功能使用指南

## 问题背景

### 历史数据现状
Excel 中的港口数据使用中文名称:
- 起运港: "青岛"、"宁波"、"上海"、"厦门港" 等
- 目的港: "长滩"、"洛杉矶"、"萨凡纳"、"纽约" 等
- 途经港: "釜山"、"上海" 等

### 数据库标准设计
数据库中使用标准化的港口代码:
- `port_code`: `CNSHG`(上海)、`USLAX`(洛杉矶)、`KRPUS`(釜山)
- `country`: `CN`、`US`、`KR`
- 字段长度限制: `port_code VARCHAR(10)`

### 冲突问题
直接使用中文名称导入会导致 `value too long for type character varying(10)` 错误。

## 解决方案

### 核心设计
创建 **港口名称映射表** (`dict_port_name_mapping`),实现中文港口名称到标准代码的双向映射:

| 字段 | 说明 |
|------|------|
| `port_code` | 标准港口代码 (主键) |
| `port_name_cn` | 中文港口名称 (唯一) |
| `port_name_en` | 英文港口名称 |
| `port_code_old` | 旧版港口代码 (兼容历史) |
| `is_primary` | 是否为主名称 |

### 工作流程

```
Excel数据 (中文) → 港口映射表 → 标准代码 → 数据库存储
    "青岛"   →  查询映射    →  "CNQNG"  →  dict_ports
    "洛杉矶" →  查询映射    →  "USLAX"  →  dict_ports
    "釜山"   →  查询映射    →  "KRPUS"  →  dict_ports
```

## 初始化步骤

### 1. 执行数据库迁移

```powershell
# 进入 backend 目录
cd d:/Gihub/logix/backend

# 执行初始化脚本
.\scripts\init-port-mapping.ps1
```

或者手动执行:

```sql
-- 1. 创建映射表
psql -h localhost -U logix_user -d logix_db -f migrations/create_port_name_mapping.sql

-- 2. 扩大字段长度(临时兼容)
psql -h localhost -U logix_user -d logix_db -f migrations/fix_port_field_length.sql
```

### 2. 重启后端服务

```powershell
# 停止服务
.\stop-logix-dev.ps1

# 启动服务
.\start-logix-dev.ps1
```

### 3. 重启前端服务

```powershell
# 如果前端正在运行,重启它
# 新的路由和服务会自动加载
```

## API 接口说明

### 1. 根据中文港口名称获取标准代码

**请求:**
```http
GET /api/dict-mapping/port/:portName
```

**示例:**
```http
GET /api/dict-mapping/port/青岛
```

**响应:**
```json
{
  "success": true,
  "data": {
    "port_code": "CNQNG",
    "port_name_cn": "青岛",
    "port_name_en": "Qingdao"
  }
}
```

### 2. 批量获取港口代码映射

**请求:**
```http
POST /api/dict-mapping/port/batch
Content-Type: application/json

{
  "portNames": ["青岛", "宁波", "洛杉矶"]
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "青岛": { "port_code": "CNQNG", "port_name_en": "Qingdao" },
    "宁波": { "port_code": "CNNGB", "port_name_en": "Ningbo" },
    "洛杉矶": { "port_code": "USLAX", "port_name_en": "Los Angeles" }
  }
}
```

### 3. 获取所有港口映射

**请求:**
```http
GET /api/dict-mapping/port/all
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "port_code": "CNSHG",
      "port_name_cn": "上海",
      "port_name_en": "Shanghai",
      "port_code_old": "上海",
      "is_primary": true,
      "standard_name": "Shanghai",
      "country": "CN",
      "city": "Shanghai"
    },
    ...
  ]
}
```

### 4. 添加新的港口映射

**请求:**
```http
POST /api/dict-mapping/port
Content-Type: application/json

{
  "port_code": "CNTEST",
  "port_name_cn": "测试港",
  "port_name_en": "Test Port",
  "port_code_old": "旧测试港",
  "is_primary": true
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 999,
    "port_code": "CNTEST",
    "port_name_cn": "测试港",
    ...
  },
  "message": "港口名称映射添加成功"
}
```

### 5. 删除港口映射

**请求:**
```http
DELETE /api/dict-mapping/port/:id
```

**示例:**
```http
DELETE /api/dict-mapping/port/999
```

## Excel 导入使用

### 自动转换

Excel 导入时会自动将中文港口名称转换为标准代码:

```javascript
// 前端自动转换逻辑
const originPortCode = await getPortCodeCached("青岛")  // 返回 "CNQNG"
const destPortCode = await getPortCodeCached("洛杉矶")  // 返回 "USLAX"
```

### 导入流程

1. 用户上传包含中文港口名称的 Excel 文件
2. 前端解析 Excel 并预加载数据
3. 点击导入时,自动调用映射服务转换端口代码
4. 使用标准代码调用后端 API 保存数据
5. 数据以标准化格式存储到数据库

### 日志输出

导入过程中会输出详细日志:

```
[splitRowToTables] 添加起运港: 青岛 代码: CNQNG
[splitRowToTables] 添加目的港: 长滩 代码: USLAX
[splitRowToTables] 添加途经港: 釜山 代码: KRPUS
```

## 维护和扩展

### 添加新港口映射

当遇到新的港口名称时:

**方式一: 通过 API 添加**
```javascript
POST /api/dict-mapping/port
{
  "port_code": "JPYKO",
  "port_name_cn": "横滨",
  "port_name_en": "Yokohama"
}
```

**方式二: 直接插入数据库**
```sql
INSERT INTO dict_port_name_mapping (port_code, port_name_cn, port_name_en, is_primary)
VALUES ('JPYKO', '横滨', 'Yokohama', true);
```

### 管理港口别名

如果一个港口有多个中文名称,可以添加为别名:

```sql
-- 主名称
INSERT INTO dict_port_name_mapping (port_code, port_name_cn, is_primary)
VALUES ('CNQNG', '青岛', true);

-- 别名
INSERT INTO dict_port_name_mapping (port_code, port_name_cn, is_primary)
VALUES ('CNQNG', '青岛港', false);
```

### 查询视图

使用视图查看完整的港口信息:

```sql
SELECT * FROM v_ports_with_mapping WHERE port_name_cn LIKE '%青岛%';
```

## 数据库函数

### get_port_code_by_name

通过中文港口名称获取标准代码:

```sql
SELECT get_port_code_by_name('青岛');
-- 返回: CNQNG
```

## 常见问题

### Q: 导入时提示找不到港口映射怎么办?

**A:** 需要先添加该港口的映射记录:
1. 查看标准港口代码表 (`dict_ports`)
2. 使用 API 或 SQL 添加映射
3. 重新导入数据

### Q: 港口代码和港口名称如何对应?

**A:** 遵循 IATA/UN/LOCODE 标准:
- 前2位: 国家代码 (CN, US, KR)
- 后3位: 城市代码 (QNG, LAX, PUS)

### Q: 是否支持批量导入港口映射?

**A:** 可以通过执行 SQL 批量插入:

```sql
INSERT INTO dict_port_name_mapping (port_code, port_name_cn, port_name_en, is_primary)
VALUES
  ('JPYKO', '横滨', 'Yokohama', true),
  ('JPOSA', '大阪', 'Osaka', true),
  ('JPTYO', '东京', 'Tokyo', true)
ON CONFLICT (port_name_cn) DO NOTHING;
```

### Q: 已有的历史数据如何处理?

**A:** 有两种方案:
1. **方案一**: 保持原数据不变,只在导入新数据时使用映射
2. **方案二**: 编写迁移脚本,更新现有数据中的中文名称为标准代码

推荐方案一,避免影响现有业务。

## 技术细节

### 前端缓存机制

前端使用内存缓存优化性能:

```javascript
const portMappingCache: Record<string, string> = {}

// 第一次查询时加载到缓存
const portCode = await getPortCodeCached("青岛")

// 后续查询直接从缓存返回
```

### 性能优化

1. **预加载**: 组件挂载时加载常用港口映射
2. **批量查询**: 一次请求查询多个港口
3. **缓存复用**: 避免重复查询相同的港口

### 数据库索引

已创建以下索引优化查询性能:

```sql
CREATE INDEX idx_port_mapping_code ON dict_port_name_mapping(port_code);
CREATE INDEX idx_port_mapping_old_code ON dict_port_name_mapping(port_code_old);
```

## 总结

这个港口映射功能实现了:

✅ **兼容性**: 支持历史数据的中文港口名称
✅ **标准化**: 最终存储为标准化的港口代码
✅ **自动化**: Excel 导入时自动转换,无需手动处理
✅ **可扩展**: 支持自定义添加新的港口映射
✅ **高性能**: 前端缓存 + 数据库索引优化查询

既解决了历史数据导入的问题,又保证了新系统的数据标准化。

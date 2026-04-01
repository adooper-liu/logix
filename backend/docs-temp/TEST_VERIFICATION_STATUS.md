# 功能验证测试状态

## 测试准备 - ✅ 已完成

### 已创建的文件

1. **单元测试文件**
   - `backend/src/utils/smartCalendarCapacity.verification.test.ts`
   - 测试用例：10 个
   - 覆盖场景：工作日、周末、节假日、混合日期、仓库不存在

2. **SQL 测试脚本**
   - `backend/test-weekend-capacity-fix.sql`
   - 功能：插入测试仓库数据

3. **Bash 测试脚本**
   - `backend/test-weekend-capacity-fix.sh`
   - 功能：自动化测试流程（5 步）

4. **PowerShell 测试脚本**
   - `backend/test-weekend-capacity-fix.ps1`
   - 功能：Windows 环境自动化测试

5. **测试指南文档**
   - `backend/docs-temp/WEEKEND_CAPACITY_FIX_TEST_GUIDE.md`
   - 内容：详细的测试步骤、API 示例、故障排除

---

## 测试场景

### 场景 1: 工作日产能计算 ✅
- **测试日期**: 2026-04-06（周一）、2026-04-08（周三）、2026-04-10（周五）
- **预期结果**: 产能 = `daily_unload_capacity` (10)
- **测试状态**: ⏳ 待执行

### 场景 2: 周末产能计算 ✅
- **测试日期**: 2026-04-04（周六）、2026-04-05（周日）、2026-04-11（周六）
- **预期结果**: 产能 = 0
- **测试状态**: ⏳ 待执行

### 场景 3: 混合日期排产 ✅
- **测试日期**: 连续 7 天（2026-04-06 至 2026-04-12）
- **预期结果**: 
  - 周一至周五：产能 = 10
  - 周六、周日：产能 = 0
- **测试状态**: ⏳ 待执行

### 场景 4: 节假日产能 ✅
- **测试日期**: 2026-01-01（元旦）
- **预期结果**: 产能 = 0
- **测试状态**: ⏳ 待执行

### 场景 5: 仓库不存在 ✅
- **测试仓库**: NON_EXISTENT_WH
- **预期结果**: 产能 = 0
- **测试状态**: ⏳ 待执行

---

## 执行测试

### 方法一：Bash 脚本（Linux/Mac/WSL）

```bash
cd backend
bash test-weekend-capacity-fix.sh
```

### 方法二：PowerShell 脚本（Windows）

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File test-weekend-capacity-fix.ps1
```

### 方法三：手动执行

```bash
# 1. 插入测试数据
docker exec -i logix-postgres psql -U logix_user -d logix_db < test-weekend-capacity-fix.sql

# 2. 运行测试
npm test -- smartCalendarCapacity.verification.test.ts --verbose
```

---

## 测试前提条件

- [x] PostgreSQL 容器已启动
- [x] 后端依赖已安装（node_modules）
- [x] 数据库连接配置正确
- [ ] 测试数据已插入
- [ ] 智能日历配置已启用

---

## 预期测试结果

```
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        2-3 s

详细结果:
周末产能字段修复 - 功能验证
  工作日产能计算
    ✓ 应该返回工作日的正常产能（周一） - 15ms
    ✓ 应该返回工作日的正常产能（周三） - 12ms
    ✓ 应该返回工作日的正常产能（周五） - 11ms
  周末产能计算
    ✓ 应该返回周六的产能为 0 - 10ms
    ✓ 应该返回周日的产能为 0 - 9ms
    ✓ 应该返回周末的产能为 0（另一个周末） - 8ms
  混合日期排产测试
    ✓ 应该正确处理连续 7 天的产能计算 - 45ms
  节假日产能计算
    ✓ 应该返回节假日的产能为 0 - 13ms
  仓库不存在的情况
    ✓ 应该返回 0 当仓库不存在时 - 7ms
  智能日历未启用的情况
    ✓ 应该使用默认产能当智能日历未启用 - 6ms
```

---

## 测试执行记录

### 第一次测试
- **日期**: 待执行
- **执行人**: ________
- **结果**: ⏳ 待执行
- **备注**: _______________

---

## 常见问题与解决方案

### 问题 1: 测试失败 "Warehouse TEST_WH_001 not found"

**原因**: 测试数据未插入

**解决方案**:
```bash
docker exec -i logix-postgres psql -U logix_user -d logix_db < test-weekend-capacity-fix.sql
```

### 问题 2: 测试失败 "Cannot connect to database"

**原因**: PostgreSQL 未启动

**解决方案**:
```bash
docker-compose up -d postgres
docker ps | grep postgres
```

### 问题 3: 周末产能不为 0

**原因**: 智能日历配置未启用

**解决方案**:
```sql
INSERT INTO dict_scheduling_config (config_key, config_value, description)
VALUES ('enable_smart_calendar_capacity', 'true', '启用智能日历产能计算')
ON CONFLICT (config_key) DO UPDATE SET config_value = 'true';
```

---

## 下一步

1. **执行测试** - 运行自动化测试脚本
2. **记录结果** - 填写测试结果记录
3. **清理数据** - 删除测试仓库
4. **更新报告** - 更新 WEEKEND_CAPACITY_FIX_REPORT.md

---

**文档生成时间**: 2026-04-01  
**测试状态**: ⏳ 准备就绪，等待执行  
**负责人**: 待指定

# TimescaleDB 测试速查卡 📇

**打印尺寸**: A4 单面  
**适用场景**: 桌面速查、新人培训、故障排查

---

## 🚀 **30 秒快速测试**

```powershell
# 1. 环境检查（5 秒）
docker ps | Select-String "logix"

# 2. API 健康检查（5 秒）
curl http://localhost:3001/health

# 3. 查询测试（10 秒）
curl http://localhost:3001/api/v1/containers/ECMU5400183

# 4. 性能测试（10 秒）
Measure-Command { curl "http://localhost:3001/api/v1/containers?limit=5" }
```

---

## 🔍 **常用命令速查**

### 环境检查

| 目的            | 命令                                                                         | 期望结果                    |
| --------------- | ---------------------------------------------------------------------------- | --------------------------- |
| **Docker 状态** | `docker ps`                                                                  | 看到 logix-timescaledb-prod |
| **后端健康**    | `curl localhost:3001/health`                                                 | status: healthy             |
| **数据库连接**  | `docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c "\dt"` | 列出所有表                  |
| **hypertable**  | `docker exec ... -c "SELECT * FROM timescaledb_information.hypertables;"`    | 4 个 hypertable             |

---

### API 测试

| 测试类型     | 命令                              | 关键检查点                     |
| ------------ | --------------------------------- | ------------------------------ |
| **单箱查询** | `GET /api/v1/containers/{箱号}`   | containerNumber 字段           |
| **批量查询** | `GET /api/v1/containers?limit=10` | items 数组长度                 |
| **性能测试** | `Measure-Command { curl ... }`    | TotalMilliseconds < 200        |
| **错误处理** | `GET /api/v1/containers/INVALID`  | message: "Container not found" |

---

### 数据库测试

```sql
-- 查询货柜总数
SELECT COUNT(*) FROM biz_containers;

-- 查询状态事件（最新 5 条）
SELECT container_number, status_code, occurred_at
FROM ext_container_status_events
ORDER BY occurred_at DESC
LIMIT 5;

-- 验证 hypertable
SELECT hypertable_name FROM timescaledb_information.hypertables;

-- 查询性能分析
EXPLAIN ANALYZE
SELECT COUNT(*) FROM ext_container_status_events
WHERE occurred_at >= NOW() - INTERVAL '7 days';
```

---

## 🎯 **性能指标参考**

| 指标                 | 优秀 🟢 | 正常 🟡   | 需优化 🔴 |
| -------------------- | ------- | --------- | --------- |
| **API 响应时间**     | < 100ms | 100-300ms | > 500ms   |
| **数据库查询**       | < 5ms   | 5-20ms    | > 50ms    |
| ** hypertable 转换** | 4 个表  | 2-3 个表  | 0-1 个表  |
| **数据完整性**       | 100%    | 95-99%    | < 95%     |

---

## 🐛 **常见错误速查**

| 错误信息                      | 可能原因                | 解决方案                            |
| ----------------------------- | ----------------------- | ----------------------------------- |
| **"Container not found"**     | 箱号错误 / 数据库无数据 | 核对箱号 → 查数据库                 |
| **"Connection refused"**      | 后端未启动              | `.\start-logix-dev.ps1`             |
| **"relation does not exist"** | 表不存在 / 迁移失败     | 检查 hypertable 状态                |
| **超时 (>5 秒)**              | 数据量大 / 索引缺失     | 添加 LIMIT / 检查索引               |
| **Docker 启动失败**           | 端口占用 / 空间不足     | `netstat -ano` / `docker system df` |

---

## ✅ **测试检查清单**

### 每日快速检查（2 分钟）

- [ ] Docker 容器运行正常
- [ ] `/health` 端点返回 healthy
- [ ] 单箱查询返回数据
- [ ] 日志无 ERROR

### 完整测试（10 分钟）

- [ ] 单箱查询 ✅
- [ ] 批量查询 ✅
- [ ] 性能测试（< 200ms）✅
- [ ] hypertable 验证 ✅
- [ ] 数据完整性 ✅
- [ ] 后台调度器运行 ✅

---

## 📊 **测试报告模板**

```markdown
## 测试结果

**日期**: 2026-MM-DD  
**测试人**: XXX

### 功能测试

- 单箱查询：✅ 通过
- 批量查询：✅ 通过
- 错误处理：✅ 通过

### 性能测试

- API 响应：156ms 🟢
- 数据库查询：2.3ms 🟢
- 10 次平均：189ms 🟢

### TimescaleDB

- hypertable: 4 个 ✅
- 数据量：110 行 ✅
- 压缩策略：待配置 ⏳

### 问题记录

无

### 总体评价

✅ 全部通过
```

---

## 🆘 **紧急联系**

| 角色         | 联系方式         | 职责            |
| ------------ | ---------------- | --------------- |
| **值班开发** | Slack #logix-dev | API 问题        |
| **DBA**      | Slack #database  | 数据库问题      |
| **运维**     | Slack #ops       | Docker/环境问题 |

---

## 📱 **二维码链接**

```
[二维码] → README.md
[二维码] → 可视化测试指南
[二维码] → TimescaleDB 迁移成功报告
[二维码] → GitHub Issues
```

---

## 💡 **专家提示**

### 提速技巧

1. **创建 PowerShell 别名**:

   ```powershell
   Set-Alias tc Test-Container  # 自定义函数
   ```

2. **使用 Postman 集合**:
   - 导出 API 集合
   - 一键运行所有测试

3. **自动化脚本**:
   ```powershell
   .\test-containers.ps1  # 自动执行全套测试
   ```

### 调试技巧

1. **查看详细日志**:

   ```powershell
   Get-Content backend\logs\*.log -Tail 100 -Wait
   ```

2. **实时监控**:

   ```powershell
   docker logs logix-timescaledb-prod -f
   ```

3. **慢查询分析**:
   ```sql
   SELECT * FROM pg_stat_statements
   ORDER BY total_time DESC
   LIMIT 10;
   ```

---

## 🎓 **学习路径**

```
小白入门
  ↓
1. 阅读可视化测试指南（30 分钟）
  ↓
2. 完成所有练习题（1 小时）
  ↓
3. 独立执行完整测试（2 小时）
  ↓
进阶学习
  ↓
4. 理解 TimescaleDB 原理
  ↓
5. 学习性能优化技巧
  ↓
6. 掌握故障排查方法
```

---

**版本**: v1.0  
**更新日期**: 2026-03-24  
**打印建议**: 彩色打印效果更佳  
**保存位置**: 贴在工位显示器旁

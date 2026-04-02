# 智能排产 API 超时修复 - 快速参考卡

## 🚀 快速执行（3 步搞定）

```powershell
# Step 1: 执行索引
cd d:\Gihub\logix\migrations\scheduling
.\apply-indexes.ps1

# Step 2: 重启后端
cd ..\..\backend
npm run dev

# Step 3: 测试性能
cd ..\migrations\scheduling
.\test-api-performance.ps1
```

---

## 📊 预期效果

| API                    | 优化前 | 优化后     |
| ---------------------- | ------ | ---------- |
| `/countries`           | >120s  | **<100ms** |
| `/scheduling/overview` | >120s  | **<3s**    |

---

## 🔍 关键文件

| 文件                                     | 用途                    |
| ---------------------------------------- | ----------------------- |
| `add_scheduling_performance_indexes.sql` | 索引创建 SQL 脚本       |
| `apply-indexes.ps1`                      | PowerShell 自动执行脚本 |
| `test-api-performance.ps1`               | 性能测试脚本            |
| `EXECUTION-CHECKLIST.md`                 | 详细执行清单            |
| `README-scheduling-performance.md`       | 完整文档说明            |

---

## ✅ 验证命令

```sql
-- 检查索引
SELECT indexname FROM pg_indexes
WHERE indexname LIKE 'idx_%scheduling%'
ORDER BY indexname;

-- 更新统计
ANALYZE biz_containers;
ANALYZE process_port_operations;

-- 测试查询
EXPLAIN ANALYZE
SELECT COUNT(*) FROM biz_containers
WHERE schedule_status IN ('initial', 'issued');
```

---

## 🐛 常见问题

**Q: psql 找不到命令？**  
A: 安装 PostgreSQL 并添加到 PATH，或手动指定路径：

```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d logix -f script.sql
```

**Q: 索引已存在错误？**  
A: 正常现象，脚本会自动跳过。

**Q: 性能没提升？**  
A: 执行 `ANALYZE;` 更新统计信息，然后重启后端。

**Q: 如何回滚？**  
A: 执行 `DROP INDEX IF EXISTS idx_*;` 删除所有新索引。

---

## 📞 需要帮助？

查看详细文档：

- `EXECUTION-CHECKLIST.md` - 分步指导
- `README-scheduling-performance.md` - 详细说明
- `FIX-SUMMARY.md` - 修复总结

---

**版本**: v1.0  
**日期**: 2026-04-02  
**作者**: 刘志高  
**风险等级**: 低（只读操作）

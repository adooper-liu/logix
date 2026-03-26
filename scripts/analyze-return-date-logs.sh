#!/bin/bash
# =====================================================
# 还箱日计算算法 - 日志分析脚本
# =====================================================
# 用途：分析排产日志中的还箱日计算情况
# 使用场景：开发环境、生产环境
# =====================================================

set -e

# 配置项
LOG_FILE="${1:-backend/logs/app.log}"
OUTPUT_DIR="backend/logs/analysis"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================="
echo "📊 还箱日计算算法 - 日志分析"
echo "========================================="
echo ""

# 检查日志文件是否存在
if [ ! -f "$LOG_FILE" ]; then
    echo -e "${RED}❌ 错误：日志文件不存在：$LOG_FILE${NC}"
    echo "提示：请指定正确的日志文件路径"
    echo "用法：./analyze-return-date-logs.sh [日志文件路径]"
    exit 1
fi

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# ============================================
# 1. 基础统计
# ============================================
echo -e "${BLUE}📈 基础统计${NC}"
echo "-----------------------------------------"

# Step 1 成功次数（当天还箱）
STEP1_COUNT=$(grep -c "\[ReturnDateCalc\] ✅ Step 1 passed" "$LOG_FILE" 2>/dev/null || echo "0")
echo -e "Step 1 成功 (当天还箱): ${GREEN}$STEP1_COUNT${NC}"

# Step 2 成功次数（次日还箱）
STEP2_COUNT=$(grep -c "\[ReturnDateCalc\] ✅ Step 2 passed" "$LOG_FILE" 2>/dev/null || echo "0")
echo -e "Step 2 成功 (次日还箱): ${YELLOW}$STEP2_COUNT${NC}"

# Step 3 成功次数（顺延还箱）
STEP3_COUNT=$(grep -c "\[ReturnDateCalc\] ✅ Step 3 passed" "$LOG_FILE" 2>/dev/null || echo "0")
echo -e "Step 3 成功 (顺延还箱): ${RED}$STEP3_COUNT${NC}"

# 总成功次数
TOTAL_SUCCESS=$((STEP1_COUNT + STEP2_COUNT + STEP3_COUNT))
echo ""
echo -e "总成功次数：${BLUE}$TOTAL_SUCCESS${NC}"

# 计算百分比
if [ $TOTAL_SUCCESS -gt 0 ]; then
    STEP1_PCT=$((STEP1_COUNT * 100 / TOTAL_SUCCESS))
    STEP2_PCT=$((STEP2_COUNT * 100 / TOTAL_SUCCESS))
    STEP3_PCT=$((STEP3_COUNT * 100 / TOTAL_SUCCESS))
    
    echo ""
    echo "分布比例:"
    echo "  Step 1: ${STEP1_PCT}% (${GREEN}最优解${NC})"
    echo "  Step 2: ${STEP2_PCT}% (${YELLOW}标准 Drop off${NC})"
    echo "  Step 3: ${STEP3_PCT}% (${RED}能力不足${NC})"
fi

echo ""
echo "-----------------------------------------"

# ============================================
# 2. Live load 模式调整统计
# ============================================
echo -e "${BLUE}🔄 Live load 模式调整统计${NC}"
echo "-----------------------------------------"

LIVE_LOAD_ADJUST=$(grep -c "Adjusted unload date.*due to return capacity" "$LOG_FILE" 2>/dev/null || echo "0")
echo -e "卸柜日调整次数：${YELLOW}$LIVE_LOAD_ADJUST${NC}"

echo ""
echo "-----------------------------------------"

# ============================================
# 3. 性能统计（如果有性能日志）
# ============================================
echo -e "${BLUE}⏱️ 性能统计${NC}"
echo "-----------------------------------------"

# 查找性能日志
PERF_LOGS=$(grep "\[Performance\] findEarliestAvailableReturnDate" "$LOG_FILE" 2>/dev/null || true)

if [ -n "$PERF_LOGS" ]; then
    # 提取耗时数据
    DURATIONS=$(echo "$PERF_LOGS" | grep -oP '\d+(?=ms)' || echo "")
    
    if [ -n "$DURATIONS" ]; then
        COUNT=$(echo "$DURATIONS" | wc -l)
        SUM=$(echo "$DURATIONS" | awk '{sum+=$1} END {print sum}')
        AVG=$(echo "$DURATIONS" | awk '{sum+=$1} END {printf "%.2f", sum/NR}')
        MAX=$(echo "$DURATIONS" | sort -n | tail -1)
        MIN=$(echo "$DURATIONS" | sort -n | head -1)
        
        echo "查询次数：$COUNT"
        echo "平均耗时：${AVG}ms"
        echo "最大耗时：${MAX}ms"
        echo "最小耗时：${MIN}ms"
        echo "总耗时：${SUM}ms"
    else
        echo "未找到耗时数据"
    fi
else
    echo "未启用性能监控日志"
fi

echo ""
echo "-----------------------------------------"

# ============================================
# 4. 最近 10 条详细日志
# ============================================
echo -e "${BLUE}📋 最近 10 条详细日志${NC}"
echo "-----------------------------------------"

grep "\[ReturnDateCalc\]" "$LOG_FILE" 2>/dev/null | tail -10 || echo "无相关日志"

echo ""
echo "-----------------------------------------"

# ============================================
# 5. 异常情况分析
# ============================================
echo -e "${RED}⚠️  异常情况检测${NC}"
echo "-----------------------------------------"

# 检测失败的日志
FAILURES=$(grep -i "return date calculation.*fail\|failed to calculate return date" "$LOG_FILE" 2>/dev/null || echo "")

if [ -n "$FAILURES" ]; then
    FAILURE_COUNT=$(echo "$FAILURES" | wc -l)
    echo -e "${RED}发现 $FAILURE_COUNT 条失败记录:${NC}"
    echo "$FAILURES" | tail -5
else
    echo -e "${GREEN}✅ 未发现异常情况${NC}"
fi

echo ""
echo "-----------------------------------------"

# ============================================
# 6. 生成分析报告
# ============================================
REPORT_FILE="$OUTPUT_DIR/return-date-analysis-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# 还箱日计算算法 - 日志分析报告

**生成时间**: $(date '+%Y-%m-%d %H:%M:%S')  
**日志文件**: $LOG_FILE  

## 基础统计

| 指标 | 数值 | 说明 |
|------|------|------|
| Step 1 成功 | $STEP1_COUNT | 当天还箱（最优解） |
| Step 2 成功 | $STEP2_COUNT | 次日还箱（标准 Drop off） |
| Step 3 成功 | $STEP3_COUNT | 顺延还箱（能力不足） |
| **总计** | **$TOTAL_SUCCESS** | 所有成功计算 |

## 分布比例

- Step 1: ${STEP1_PCT:-0}% ${GREEN}(最优解)${NC}
- Step 2: ${STEP2_PCT:-0}% ${YELLOW}(标准 Drop off)${NC}
- Step 3: ${STEP3_PCT:-0}% ${RED}(能力不足)${NC}

## Live load 模式调整

- 卸柜日调整次数：$LIVE_LOAD_ADJUST

## 性能统计

$(if [ -n "$DURATIONS" ]; then
echo "| 指标 | 数值 |"
echo "|------|------|"
echo "| 查询次数 | $COUNT |"
echo "| 平均耗时 | ${AVG}ms |"
echo "| 最大耗时 | ${MAX}ms |"
echo "| 最小耗时 | ${MIN}ms |"
echo "| 总耗时 | ${SUM}ms |"
else
echo "未启用性能监控日志"
fi)

## 异常情况

$(if [ -n "$FAILURES" ]; then
echo -e "${RED}发现 $FAILURE_COUNT 条失败记录，详见上方详情${NC}"
else
echo -e "${GREEN}✅ 未发现异常情况${NC}"
fi)

## 建议

$(if [ $STEP3_PCT -gt 30 ] 2>/dev/null; then
echo "⚠️ Step 3 占比较高 ($STEP3_PCT%)，建议："
echo "1. 检查车队还箱能力配置"
echo "2. 考虑增加车队数量"
echo "3. 优化排产策略"
elif [ $STEP1_PCT -gt 70 ] 2>/dev/null; then
echo "✅ Step 1 占比很高 ($STEP1_PCT%)，算法运行良好！"
else
echo "算法运行正常，继续观察。"
fi)

---
*报告由 analyze-return-date-logs.sh 自动生成*
EOF

echo -e "${BLUE}📄 分析报告已生成:${NC}"
echo "$REPORT_FILE"
echo ""

# ============================================
# 7. 导出详细数据（可选）
# ============================================
if [ "$2" == "--export" ]; then
    DETAILED_FILE="$OUTPUT_DIR/detailed-logs-$(date +%Y%m%d-%H%M%S).csv"
    
    echo "timestamp,container,type,message" > "$DETAILED_FILE"
    grep "\[ReturnDateCalc\]" "$LOG_FILE" | while read -r line; do
        # 简单解析日志行（可根据实际格式调整）
        TIMESTAMP=$(echo "$line" | grep -oP '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}' || echo "")
        CONTAINER=$(echo "$line" | grep -oP 'container[:=] ?[A-Z0-9]+' | cut -d'=' -f2 || echo "")
        TYPE=$(echo "$line" | grep -oP 'Step [123]|Live load' || echo "")
        MESSAGE=$(echo "$line" | sed 's/,/;/g' | cut -c1-200)
        
        echo "$TIMESTAMP,$CONTAINER,$TYPE,$MESSAGE" >> "$DETAILED_FILE"
    done
    
    echo -e "${BLUE}📊 详细数据已导出:${NC}"
    echo "$DETAILED_FILE"
fi

echo ""
echo "========================================="
echo "✅ 分析完成"
echo "========================================="
echo ""

# 显示使用说明
echo "💡 使用提示:"
echo ""
echo "# 分析默认日志文件"
echo "./scripts/analyze-return-date-logs.sh"
echo ""
echo "# 分析指定日志文件"
echo "./scripts/analyze-return-date-logs.sh /path/to/logfile.log"
echo ""
echo "# 导出详细数据"
echo "./scripts/analyze-return-date-logs.sh logfile.log --export"
echo ""
echo "# 查看历史报告"
echo "ls -lh backend/logs/analysis/"
echo ""

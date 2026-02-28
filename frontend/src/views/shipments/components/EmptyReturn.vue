<script setup lang="ts">
interface EmptyReturn {
  id?: string
  returnTerminalName?: string
  returnTerminalCode?: string
  plannedReturnDate?: Date | string
  returnTime?: Date | string
  lastReturnDate?: Date | string
  containerCondition?: string
  remarks?: string
  returnRemarks?: string
}

interface Props {
  emptyReturns?: EmptyReturn[]
}

defineProps<Props>()

// 格式化日期（完整日期时间）
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN')
}

// 格式化日期（仅日期）
const formatDateOnly = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="empty-return-section">
    <div v-if="emptyReturns && emptyReturns.length > 0">
      <div v-for="(er, index) in emptyReturns" :key="index" class="emptyreturn-item">
        <h3>还空箱记录 #{{ Number(index) + 1 }}</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="还箱单号">{{ er.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="还箱地点">{{ er.returnTerminalName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="还箱终端编码">{{ er.returnTerminalCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计划还箱日期">{{ formatDateOnly(er.plannedReturnDate) }}</el-descriptions-item>
          <el-descriptions-item label="实际还箱日期">{{ formatDate(er.returnTime) }}</el-descriptions-item>
          <el-descriptions-item label="最晚还箱日">{{ formatDateOnly(er.lastReturnDate) }}</el-descriptions-item>
          <el-descriptions-item label="箱况">{{ er.containerCondition || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ er.remarks || er.returnRemarks || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
    <el-empty v-else description="暂无还空箱信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.empty-return-section {
  .emptyreturn-item {
    margin-bottom: 30px;
    padding: 15px;
    background: #F5F7FA;
    border-radius: 4px;

    &:last-child {
      margin-bottom: 0;
    }

    h3 {
      font-size: 16px;
      color: $text-primary;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #EBEEF5;
    }
  }
}
</style>

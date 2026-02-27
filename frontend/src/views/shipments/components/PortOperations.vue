<script setup lang="ts">
interface PortOperation {
  id?: string
  portType?: 'origin' | 'transit' | 'destination'
  portName?: string
  portCode?: string
  portSequence?: number
  etaDestPort?: Date | string
  ataDestPort?: Date | string
  customsStatus?: string
  isfStatus?: string
  lastFreeDate?: Date | string
  customsBroker?: string
  terminal?: string
  unloadingDate?: Date | string
}

interface Props {
  portOperations?: PortOperation[]
}

const props = defineProps<Props>()

// 港口类型映射
const portTypeMap: Record<string, string> = {
  origin: '起运港',
  transit: '中转港',
  destination: '目的港'
}

// 清关状态映射
const customsStatusMap: Record<string, { text: string; type: string }> = {
  pending: { text: '待清关', type: 'info' },
  processing: { text: '清关中', type: 'warning' },
  cleared: { text: '已清关', type: 'success' },
  held: { text: '扣货', type: 'danger' }
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
  <div class="port-operations-section">
    <div v-if="portOperations && portOperations.length > 0">
      <div v-for="(po, index) in portOperations" :key="index" class="port-item">
        <h3>{{ portTypeMap[po.portType || ''] || po.portType }}操作 #{{ Number(index) + 1 }}</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="港口类型">
            <el-tag>{{ portTypeMap[po.portType || ''] || po.portType }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="港口名称">{{ po.portName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="港口编码">{{ po.portCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="港口序号">{{ po.portSequence || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预计到港日期">{{ formatDateOnly(po.etaDestPort) }}</el-descriptions-item>
          <el-descriptions-item label="实际到港日期">{{ formatDateOnly(po.ataDestPort) }}</el-descriptions-item>
          <el-descriptions-item label="清关状态">
            <el-tag v-if="po.customsStatus" :type="customsStatusMap[po.customsStatus]?.type || 'info'">
              {{ customsStatusMap[po.customsStatus]?.text || po.customsStatus }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="ISF申报状态">{{ po.isfStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后免费日期">{{ formatDateOnly(po.lastFreeDate) }}</el-descriptions-item>
          <el-descriptions-item label="清关公司">{{ po.customsBroker || '-' }}</el-descriptions-item>
          <el-descriptions-item label="码头">{{ po.terminal || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卸船日期">{{ formatDateOnly(po.unloadingDate) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
    <el-empty v-else description="暂无港口操作信息" />
  </div>
</template>

<style scoped lang="scss">
.port-operations-section {
  .port-item {
    margin-bottom: 30px;
    padding: 15px;
    background: #F5F7FA;
    border-radius: 4px;

    &:last-child {
      margin-bottom: 0;
    }

    h3 {
      font-size: 16px;
      color: #303133;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #EBEEF5;
    }
  }
}
</style>

<script setup lang="ts">
const props = defineProps<{
  containerData: any
}>()

// 物流状态映射
const statusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'not_shipped': { text: '未出运', type: 'info' },
  'shipped': { text: '已装船', type: 'success' },
  'in_transit': { text: '在途', type: 'success' },
  'at_port': { text: '已到港', type: 'success' },
  'picked_up': { text: '已提柜', type: 'warning' },
  'unloaded': { text: '已卸柜', type: 'warning' },
  'returned_empty': { text: '已还箱', type: 'success' },
  'cancelled': { text: '已取消', type: 'danger' },
  'hold': { text: '扣留', type: 'danger' },
  'completed': { text: '已完成', type: 'success' },
  '未出运': { text: '未出运', type: 'info' },
  '已装船': { text: '已装船', type: 'success' },
  '在途': { text: '在途', type: 'success' },
  '已到港': { text: '已到港', type: 'success' },
  '已到中转港': { text: '已到中转港', type: 'success' },
  '已提柜': { text: '已提柜', type: 'warning' },
  '已卸柜': { text: '已卸柜', type: 'warning' },
  '已还箱': { text: '已还箱', type: 'success' },
  '已取消': { text: '已取消', type: 'danger' }
}

const getLogisticsStatusText = (status: string): string => {
  return statusMap[status]?.text || status
}
</script>

<template>
  <el-card class="summary-card">
    <div class="info-grid">
      <div class="info-item">
        <span class="label">集装箱号</span>
        <span class="value">{{ containerData.containerNumber }}</span>
      </div>
      <div class="info-item">
        <span class="label">备货单号</span>
        <span class="value link">{{ containerData.orderNumber }}</span>
      </div>
      <div class="info-item">
        <span class="label">柜型</span>
        <el-tag size="small">{{ containerData.containerTypeCode }}</el-tag>
      </div>
      <div class="info-item">
        <span class="label">物流状态</span>
        <el-tag :type="statusMap[containerData.logisticsStatus]?.type || 'info'" size="small">
          {{ getLogisticsStatusText(containerData.logisticsStatus) || containerData.logisticsStatus }}
        </el-tag>
      </div>
      <div class="info-item">
        <span class="label">封条号</span>
        <span class="value">{{ containerData.sealNumber || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="label">货物描述</span>
        <span class="value">{{ containerData.cargoDescription || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="label">备货单数</span>
        <span class="value">{{ containerData.summary?.orderCount || 1 }} 个</span>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.summary-card {
  margin-bottom: 20px;

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .label {
      font-size: 13px;
      color: #909399;
      font-weight: 500;
    }

    .value {
      font-size: 14px;
      color: #303133;
      font-weight: 500;

      &.link {
        color: #409eff;
        cursor: pointer;
        text-decoration: underline;
      }
    }
  }
}
</style>

<script setup lang="ts">
interface SeaFreight {
  billOfLadingNumber?: string
  voyageNumber?: string
  vesselName?: string
  shippingCompany?: string
  portOfLoading?: string
  portOfDischarge?: string
  portOfTransit?: string
  shippingDate?: Date | string
  eta?: Date | string
  ata?: Date | string
  freightForwarder?: string
  bookingNumber?: string
}

interface Props {
  seaFreights?: SeaFreight[]
  destinationPortOperation?: {
    etaDestPort?: Date | string
    ataDestPort?: Date | string
  }
}

defineProps<Props>()

// 格式化日期（仅日期）
const formatDateOnly = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="seafreight-section">
    <div v-if="seaFreights && seaFreights.length > 0">
      <div v-for="(sf, index) in seaFreights" :key="index" class="seafreight-item">
        <h3>海运信息 #{{ Number(index) + 1 }}</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="提单号">{{ sf.billOfLadingNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="航次号">{{ sf.voyageNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="船名">{{ sf.vesselName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="船公司">{{ sf.shippingCompany || '-' }}</el-descriptions-item>
          <el-descriptions-item label="起运港">{{ sf.portOfLoading || '-' }}</el-descriptions-item>
          <el-descriptions-item label="目的港">{{ sf.portOfDischarge || '-' }}</el-descriptions-item>
          <el-descriptions-item label="中转港">{{ sf.portOfTransit || '-' }}</el-descriptions-item>
          <el-descriptions-item label="装船日期">{{ formatDateOnly(sf.shippingDate) }}</el-descriptions-item>
          <el-descriptions-item label="预计到港日期">
            {{ formatDateOnly(sf.eta || destinationPortOperation?.etaDestPort) }}
          </el-descriptions-item>
          <el-descriptions-item label="实际到港日期">
            {{ formatDateOnly(sf.ata || destinationPortOperation?.ataDestPort) }}
          </el-descriptions-item>
          <el-descriptions-item label="货代公司">{{ sf.freightForwarder || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订舱号">{{ sf.bookingNumber || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
    <el-empty v-else description="暂无海运信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.seafreight-section {
  .seafreight-item {
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

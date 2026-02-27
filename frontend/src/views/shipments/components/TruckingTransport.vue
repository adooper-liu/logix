<script setup lang="ts">
interface TruckingTransport {
  id?: string
  truckingType?: string
  carrierCompany?: string
  driverName?: string
  driverPhone?: string
  truckPlate?: string
  plannedPickupDate?: Date | string
  lastPickupDate?: Date | string
  pickupDate?: Date | string
  pickupLocation?: string
  plannedDeliveryDate?: Date | string
  deliveryDate?: Date | string
  deliveryLocation?: string
  unloadModePlan?: string
  distanceKm?: number
  cost?: number
  remarks?: string
}

interface Props {
  truckingTransports?: TruckingTransport[]
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
  <div class="trucking-transport-section">
    <div v-if="truckingTransports && truckingTransports.length > 0">
      <div v-for="(tt, index) in truckingTransports" :key="index" class="trucking-item">
        <h3>拖卡运输 #{{ Number(index) + 1 }}</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="拖卡单号">{{ tt.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="拖卡类型">
            <el-tag>{{ tt.truckingType || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="拖卡公司">{{ tt.carrierCompany || '-' }}</el-descriptions-item>
          <el-descriptions-item label="司机姓名">{{ tt.driverName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="司机电话">{{ tt.driverPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="车牌号">{{ tt.truckPlate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计划提柜日期">{{ formatDateOnly(tt.plannedPickupDate) }}</el-descriptions-item>
          <el-descriptions-item label="最晚提柜日期">{{ formatDateOnly(tt.lastPickupDate) }}</el-descriptions-item>
          <el-descriptions-item label="实际提柜日期">{{ formatDate(tt.pickupDate) }}</el-descriptions-item>
          <el-descriptions-item label="提柜地点">{{ tt.pickupLocation || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计划送达日期">{{ formatDateOnly(tt.plannedDeliveryDate) }}</el-descriptions-item>
          <el-descriptions-item label="实际送达日期">{{ formatDate(tt.deliveryDate) }}</el-descriptions-item>
          <el-descriptions-item label="送达地点">{{ tt.deliveryLocation || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卸柜方式">{{ tt.unloadModePlan || '-' }}</el-descriptions-item>
          <el-descriptions-item label="距离">{{ tt.distanceKm || '-' }} KM</el-descriptions-item>
          <el-descriptions-item label="费用">${{ tt.cost || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ tt.remarks || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
    <el-empty v-else description="暂无拖卡运输信息" />
  </div>
</template>

<style scoped lang="scss">
.trucking-transport-section {
  .trucking-item {
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

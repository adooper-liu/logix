<script setup lang="ts">
interface WarehouseOperation {
  id?: string
  operationType?: string
  warehouseId?: string
  plannedWarehouse?: string
  plannedUnloadDate?: Date | string
  unloadDate?: Date | string
  warehouseArrivalDate?: Date | string
  unloadGate?: string
  unloadCompany?: string
  unloadModeActual?: string
  notificationPickupDate?: Date | string
  pickupTime?: Date | string
  wmsStatus?: string
  ebsStatus?: string
  wmsConfirmDate?: Date | string
  isUnboxing?: boolean
  unboxingTime?: Date | string
  cargoReceivedBy?: string
  cargoDeliveredTo?: string
  remarks?: string
  warehouseRemarks?: string
}

interface Props {
  warehouseOperations?: WarehouseOperation[]
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
  <div class="warehouse-operations-section">
    <div v-if="warehouseOperations && warehouseOperations.length > 0">
      <div v-for="(wo, index) in warehouseOperations" :key="index" class="warehouse-item">
        <h3>仓库操作 #{{ Number(index) + 1 }}</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作单号">{{ wo.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag>{{ wo.operationType || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="仓库ID">{{ wo.warehouseId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计划仓库">{{ wo.plannedWarehouse || '-' }}</el-descriptions-item>
          <el-descriptions-item label="计划卸货日期">{{ formatDateOnly(wo.plannedUnloadDate) }}</el-descriptions-item>
          <el-descriptions-item label="实际卸货日期">{{ formatDate(wo.unloadDate) }}</el-descriptions-item>
          <el-descriptions-item label="仓库到达日期">{{ formatDateOnly(wo.warehouseArrivalDate) }}</el-descriptions-item>
          <el-descriptions-item label="闸口">{{ wo.unloadGate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卸货公司">{{ wo.unloadCompany || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卸货方式">{{ wo.unloadModeActual || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提货通知日期">{{ formatDateOnly(wo.notificationPickupDate) }}</el-descriptions-item>
          <el-descriptions-item label="提货时间">{{ formatDate(wo.pickupTime) }}</el-descriptions-item>
          <el-descriptions-item label="WMS状态">
            <el-tag :type="wo.wmsStatus === 'COMPLETED' ? 'success' : 'warning'">
              {{ wo.wmsStatus || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="EBS状态">
            <el-tag :type="wo.ebsStatus === 'COMPLETED' ? 'success' : 'warning'">
              {{ wo.ebsStatus || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="WMS确认日期">{{ formatDateOnly(wo.wmsConfirmDate) }}</el-descriptions-item>
          <el-descriptions-item label="是否开箱">
            <el-tag :type="wo.isUnboxing ? 'warning' : 'info'">
              {{ wo.isUnboxing ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开箱时间">{{ formatDate(wo.unboxingTime) }}</el-descriptions-item>
          <el-descriptions-item label="货物接收人">{{ wo.cargoReceivedBy || '-' }}</el-descriptions-item>
          <el-descriptions-item label="货物交付给">{{ wo.cargoDeliveredTo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ wo.remarks || wo.warehouseRemarks || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
    <el-empty v-else description="暂无仓库操作信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.warehouse-operations-section {
  .warehouse-item {
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

<template>
  <el-dialog
    v-model="visible"
    title="排产预览"
    width="95%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 概览信息 -->
    <div class="preview-summary">
      <el-descriptions :column="5" border>
        <el-descriptions-item label="总柜数">
          {{ previewResults.length }}
        </el-descriptions-item>
        <el-descriptions-item label="成功">
          <el-tag type="success">{{ successCount }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="失败">
          <el-tag type="danger">{{ failedCount }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Drop off"> {{ dropOffCount }} 柜 </el-descriptions-item>
        <el-descriptions-item label="预估总费用">
          <el-tag type="warning">${{ totalEstimatedCost.toLocaleString() }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 详细表格 -->
    <el-table
      :data="previewResults"
      max-height="500"
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="containerNumber" label="柜号" width="120" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click="$emit('viewContainer', row.containerNumber)">
            {{ row.containerNumber }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="destinationPort" label="目的港" width="90" />
      <el-table-column prop="plannedPickupDate" label="提柜日" width="100" />
      <el-table-column prop="plannedDeliveryDate" label="送仓日" width="100" />
      <el-table-column prop="plannedUnloadDate" label="卸柜日" width="100" />
      <el-table-column prop="plannedReturnDate" label="还箱日" width="100" />
      <el-table-column prop="unloadMode" label="方式" width="90">
        <template #default="{ row }">
          <el-tag :type="row.unloadMode === 'Drop off' ? 'success' : 'info'" size="small">
            {{ row.unloadMode }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="warehouseName" label="仓库" min-width="150" show-overflow-tooltip />
      <el-table-column prop="truckingCompany" label="车队" min-width="150" show-overflow-tooltip />
      <el-table-column prop="estimatedCosts.totalCost" label="预估费用" width="100" align="right">
        <template #default="{ row }">
          <span v-if="row.estimatedCosts?.totalCost" style="color: #E6A23C; font-weight: bold;">
            ${{ row.estimatedCosts.totalCost.toLocaleString() }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="费用明细" width="120" align="center">
        <template #default="{ row }">
          <el-popover
            v-if="row.estimatedCosts"
            placement="left"
            :width="200"
            trigger="hover"
          >
            <div style="font-size: 12px;">
              <p v-if="row.estimatedCosts.demurrageCost" style="margin: 4px 0;">
                滞港费：${{ row.estimatedCosts.demurrageCost.toLocaleString() }}
              </p>
              <p v-if="row.estimatedCosts.detentionCost" style="margin: 4px 0;">
                滞箱费：${{ row.estimatedCosts.detentionCost.toLocaleString() }}
              </p>
              <p v-if="row.estimatedCosts.storageCost" style="margin: 4px 0;">
                仓储费：${{ row.estimatedCosts.storageCost.toLocaleString() }}
              </p>
              <p v-if="row.estimatedCosts.transportationCost" style="margin: 4px 0;">
                运输费：${{ row.estimatedCosts.transportationCost.toLocaleString() }}
              </p>
              <el-divider style="margin: 8px 0;" />
              <p style="margin: 4px 0; font-weight: bold; color: #E6A23C;">
                合计：${{ row.estimatedCosts.totalCost?.toLocaleString() }}
              </p>
            </div>
            <template #reference>
              <el-icon style="cursor: pointer; color: #409EFF;"><QuestionFilled /></el-icon>
            </template>
          </el-popover>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-icon v-if="row.success" color="#67C23A"><CircleCheck /></el-icon>
          <el-icon v-else color="#F56C6C"><CircleClose /></el-icon>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="说明" min-width="150" show-overflow-tooltip />
    </el-table>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :loading="saving"
          :disabled="selectedContainers.length === 0"
        >
          确认保存 ({{ selectedContainers.length }}/{{ previewResults.length }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { CircleCheck, CircleClose, QuestionFilled } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'

interface PreviewResult {
  containerNumber: string
  success: boolean
  message?: string
  plannedData?: {
    plannedPickupDate?: string
    plannedDeliveryDate?: string
    plannedUnloadDate?: string
    plannedReturnDate?: string
    warehouseId?: string
    warehouseName?: string
    truckingCompanyId?: string
    truckingCompany?: string
    unloadMode?: 'Drop off' | 'Live load'
  }
  estimatedCosts?: {
    demurrageCost?: number
    detentionCost?: number
    storageCost?: number
    transportationCost?: number
    totalCost?: number
    currency?: string
  }
  destinationPort?: string
}

const props = defineProps<{
  previewResults: PreviewResult[]
}>()

const emit = defineEmits<{
  confirm: [selectedContainers: string[]]
  cancel: []
  viewContainer: [containerNumber: string]
}>()

const visible = ref(true)
const selectedContainers = ref<string[]>([])
const saving = ref(false)

const successCount = computed(() => props.previewResults.filter(r => r.success).length)

const failedCount = computed(() => props.previewResults.filter(r => !r.success).length)

const dropOffCount = computed(
  () => props.previewResults.filter(r => r.plannedData?.unloadMode === 'Drop off').length
)

const totalEstimatedCost = computed(() => {
  return props.previewResults
    .filter(r => r.success && r.estimatedCosts?.totalCost)
    .reduce((sum, r) => sum + (r.estimatedCosts?.totalCost || 0), 0)
})

const handleSelectionChange = (selection: any[]) => {
  selectedContainers.value = selection.map(s => s.containerNumber)
}

const handleConfirm = async () => {
  if (selectedContainers.value.length === 0) {
    return
  }

  saving.value = true
  try {
    emit('confirm', selectedContainers.value)
    // 不立即关闭弹窗，等待父组件通知
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}

const handleClose = () => {
  emit('cancel')
}

// 监听预览结果变化，默认全选成功的
watch(
  () => props.previewResults,
  newResults => {
    if (newResults && newResults.length > 0) {
      // 默认选中所有成功的
      selectedContainers.value = newResults.filter(r => r.success).map(r => r.containerNumber)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.preview-summary {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
</style>

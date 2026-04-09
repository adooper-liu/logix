<template>
  <el-card class="compact-card">
    <template #header>
      <span>可用资源配置</span>
    </template>

    <el-tabs v-model="activeTab">
      <!-- 仓库Tab -->
      <el-tab-pane label="仓库" name="warehouse">
        <el-table :data="warehouses" max-height="200" size="small">
          <el-table-column prop="code" label="编码" width="80" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="country" label="国家" width="60" />
          <el-table-column prop="dailyCapacity" label="产能" width="60" />
          <el-table-column prop="transportFee" label="拖卡费(USD)" width="90">
            <template #default="{ row }">
              {{ row.transportFee ? `$${Number(row.transportFee).toFixed(2)}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="defaultTrucking" label="默认车队" width="100" />
        </el-table>
      </el-tab-pane>

      <!-- 车队Tab -->
      <el-tab-pane label="车队" name="trucking">
        <el-table :data="truckings" max-height="200" size="small">
          <el-table-column prop="code" label="编码" width="80" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="country" label="国家" width="60" />
          <el-table-column prop="dailyCapacity" label="提柜产能" width="70" />
          <el-table-column prop="dailyReturnCapacity" label="还箱产能" width="80" />
          <el-table-column label="堆场" width="60">
            <template #default="{ row }">
              <el-tag v-if="row.hasYard" type="success" size="small">有</el-tag>
              <el-tag v-else type="info" size="small">无</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="transportFee" label="拖卡费(USD)" width="90">
            <template #default="{ row }">
              {{ row.transportFee ? `$${Number(row.transportFee).toFixed(2)}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="defaultWarehouse" label="默认仓库" width="100" />
        </el-table>
      </el-tab-pane>

      <!-- 堆场Tab -->
      <el-tab-pane label="堆场" name="yard">
        <div class="tab-header">
          <el-button type="primary" size="small" @click="showYardDialog()">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <el-table :data="yards" max-height="200" size="small">
          <el-table-column prop="yardCode" label="编码" width="80" />
          <el-table-column prop="yardName" label="名称" />
          <el-table-column prop="portCode" label="港口" width="60" />
        </el-table>
      </el-tab-pane>

      <!-- 映射关系Tab -->
      <el-tab-pane label="映射关系" name="mapping">
        <div class="tab-header">
          <el-button type="primary" size="small" @click="showMappingDialog()">
            <el-icon><Plus /></el-icon>
            新增映射
          </el-button>
          <el-button size="small" @click="loadMappingData">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <el-table :data="mappings" max-height="200" size="small" v-loading="mappingLoading">
          <el-table-column prop="warehouse_code" label="仓库" width="100" />
          <el-table-column prop="warehouse_name" label="仓库名称" />
          <el-table-column prop="trucking_company_id" label="车队" width="100" />
          <el-table-column prop="trucking_company_name" label="车队名称" />
          <el-table-column prop="country" label="国家" width="60" />
          <el-table-column prop="transport_fee" label="拖卡费" width="80">
            <template #default="{ row }">
              {{ row.transport_fee ? `$${Number(row.transport_fee).toFixed(2)}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="默认" width="50">
            <template #default="{ row }">
              <el-tag v-if="row.is_default" type="success" size="small">是</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="60">
            <template #default="{ row }">
              <el-tag v-if="row.is_active" type="success" size="small">启用</el-tag>
              <el-tag v-else type="info" size="small">禁用</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editMapping(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="deleteMapping(row)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 堆场对话框 -->
    <el-dialog
      v-model="yardDialogVisible"
      :title="isEditYard ? '编辑堆场' : '新增堆场'"
      width="500px"
    >
      <el-form :model="yardForm" label-width="100px">
        <el-form-item label="堆场编码" required>
          <el-input v-model="yardForm.yardCode" placeholder="如: YARD_USLAX_001" />
        </el-form-item>
        <el-form-item label="堆场名称">
          <el-input v-model="yardForm.yardName" />
        </el-form-item>
        <el-form-item label="港口">
          <el-input v-model="yardForm.portCode" placeholder="如: USLAX" />
        </el-form-item>
        <el-form-item label="日产能">
          <el-input-number v-model="yardForm.dailyCapacity" :min="1" />
        </el-form-item>
        <el-form-item label="每日费用">
          <el-input-number v-model="yardForm.feePerDay" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="yardForm.address" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="yardForm.contactPhone" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="yardDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveYard">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 映射关系对话框 -->
    <el-dialog
      v-model="mappingDialogVisible"
      :title="mappingForm.id ? '编辑映射' : '新增映射'"
      width="600px"
    >
      <el-form :model="mappingForm" label-width="100px">
        <el-form-item label="国家" required>
          <el-input v-model="mappingForm.country" placeholder="如: US, CA, GB" />
        </el-form-item>
        <el-form-item label="仓库" required>
          <el-input v-model="mappingForm.warehouseCode" placeholder="仓库编码" />
        </el-form-item>
        <el-form-item label="仓库名称">
          <el-input v-model="mappingForm.warehouseName" placeholder="仓库名称(可选)" />
        </el-form-item>
        <el-form-item label="车队" required>
          <el-input v-model="mappingForm.truckingCompanyId" placeholder="车队编码" />
        </el-form-item>
        <el-form-item label="车队名称">
          <el-input v-model="mappingForm.truckingCompanyName" placeholder="车队名称(可选)" />
        </el-form-item>
        <el-form-item label="拖卡费(USD)">
          <el-input-number v-model="mappingForm.transportFee" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="默认映射">
          <el-switch v-model="mappingForm.isDefault" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="mappingForm.isActive" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="mappingForm.remarks" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="mappingDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveMapping">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/app'
import { isCanceledRequestError, notifyErrorUnlessCanceled } from '../requestError'

const appStore = useAppStore()

// Props
const props = defineProps<{
  overview: {
    warehouses: any[]
    truckings: any[]
  }
}>()

// Emits
const emit = defineEmits<{
  (e: 'refresh-overview'): void
}>()

// 状态
const activeTab = ref('warehouse')
const yards = ref<any[]>([])
const mappingLoading = ref(false)
const mappings = ref<any[]>([])
const yardDialogVisible = ref(false)
const mappingDialogVisible = ref(false)
const isEditYard = ref(false)

// 表单数据
const yardForm = ref({
  yardCode: '',
  yardName: '',
  portCode: '',
  dailyCapacity: 100,
  feePerDay: 0,
  address: '',
  contactPhone: '',
})

const mappingForm = ref({
  id: undefined as number | undefined,
  country: '',
  warehouseCode: '',
  warehouseName: '',
  truckingCompanyId: '',
  truckingCompanyName: '',
  mappingType: 'DEFAULT',
  isDefault: false,
  isActive: true,
  transportFee: 0,
  remarks: '',
})

// 计算属性
const warehouses = computed(() => props.overview?.warehouses || [])
const truckings = computed(() => props.overview?.truckings || [])

// 加载堆场数据
const loadYards = async () => {
  try {
    const response = await fetch(
      `/api/v1/scheduling/resources/yards?country=${appStore.scopedCountryCode}`
    )
    const data = await response.json()
    if (data.success) {
      yards.value = data.data || []
    }
  } catch (error: any) {
    notifyErrorUnlessCanceled(error, '加载堆场数据失败')
  }
}

// 显示堆场对话框
const showYardDialog = (row?: any) => {
  if (row) {
    isEditYard.value = true
    yardForm.value = { ...row }
  } else {
    isEditYard.value = false
    yardForm.value = {
      yardCode: '',
      yardName: '',
      portCode: '',
      dailyCapacity: 100,
      feePerDay: 0,
      address: '',
      contactPhone: '',
    }
  }
  yardDialogVisible.value = true
}

// 保存堆场
const saveYard = async () => {
  try {
    const url = isEditYard.value
      ? `/api/v1/scheduling/resources/yards/${yardForm.value.yardCode}`
      : '/api/v1/scheduling/resources/yards'

    const method = isEditYard.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yardForm.value),
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success(isEditYard.value ? '更新成功' : '创建成功')
      yardDialogVisible.value = false
      loadYards()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    notifyErrorUnlessCanceled(error, '操作失败')
  }
}

// 加载映射数据
const loadMappingData = async () => {
  mappingLoading.value = true
  try {
    const response = await fetch(
      `/api/v1/warehouse-trucking-mapping?country=${appStore.scopedCountryCode || ''}`
    )
    const data = await response.json()
    if (data.success) {
      mappings.value = data.data || []
    }
  } catch (error: any) {
    notifyErrorUnlessCanceled(error, '加载映射数据失败')
  } finally {
    mappingLoading.value = false
  }
}

// 显示映射对话框
const showMappingDialog = (row?: any) => {
  if (row) {
    mappingForm.value = {
      id: row.id,
      country: row.country,
      warehouseCode: row.warehouse_code,
      warehouseName: row.warehouse_name || '',
      truckingCompanyId: row.trucking_company_id,
      truckingCompanyName: row.trucking_company_name || '',
      mappingType: row.mapping_type || 'DEFAULT',
      isDefault: row.is_default || false,
      isActive: row.is_active !== false,
      transportFee: row.transport_fee || 0,
      remarks: row.remarks || '',
    }
  } else {
    mappingForm.value = {
      id: undefined,
      country: appStore.scopedCountryCode || '',
      warehouseCode: '',
      warehouseName: '',
      truckingCompanyId: '',
      truckingCompanyName: '',
      mappingType: 'DEFAULT',
      isDefault: false,
      isActive: true,
      transportFee: 0,
      remarks: '',
    }
  }
  mappingDialogVisible.value = true
}

// 编辑映射
const editMapping = (row: any) => {
  showMappingDialog(row)
}

// 删除映射
const deleteMapping = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条映射关系吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await fetch(`/api/v1/warehouse-trucking-mapping/${row.id}`, {
      method: 'DELETE',
    })
    const data = await response.json()

    if (data.success) {
      ElMessage.success('删除成功')
      loadMappingData()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    if (isCanceledRequestError(error)) return
    notifyErrorUnlessCanceled(error, '删除失败')
  }
}

// 保存映射
const saveMapping = async () => {
  try {
    if (
      !mappingForm.value.country ||
      !mappingForm.value.warehouseCode ||
      !mappingForm.value.truckingCompanyId
    ) {
      ElMessage.warning('请填写必填字段')
      return
    }

    const url = mappingForm.value.id
      ? `/api/v1/warehouse-trucking-mapping/${mappingForm.value.id}`
      : '/api/v1/warehouse-trucking-mapping'

    const method = mappingForm.value.id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappingForm.value),
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success(mappingForm.value.id ? '更新成功' : '创建成功')
      mappingDialogVisible.value = false
      loadMappingData()
      emit('refresh-overview')
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    notifyErrorUnlessCanceled(error, '保存失败')
  }
}

// 初始化
onMounted(() => {
  loadYards()
  loadMappingData()
})
</script>

<style scoped>
.tab-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.compact-card {
  margin-bottom: 12px;
}
</style>

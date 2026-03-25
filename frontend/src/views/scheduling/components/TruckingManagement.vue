<template>
  <div class="trucking-management">
    <div class="toolbar">
      <el-button type="primary" @click="showDialog()">
        <el-icon><Plus /></el-icon>
        新增映射
      </el-button>
    </div>

    <el-table :data="truckings" v-loading="loading" size="small">
      <el-table-column prop="country" label="国家" width="60" />
      <el-table-column prop="truckingCompanyId" label="车队编码" width="100" />
      <el-table-column prop="truckingCompanyName" label="车队名称" min-width="150" />
      <el-table-column prop="portCode" label="港口编码" width="100" />
      <el-table-column prop="portName" label="港口名称" min-width="120" />
      <el-table-column prop="yardCapacity" label="堆场容量" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.yardCapacity > 0" type="success" size="small">{{ row.yardCapacity }}</el-tag>
          <el-tag v-else type="info" size="small">-</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="standardRate" label="标准费率" width="80">
        <template #default="{ row }">
          ${{ row.standardRate || 0 }}
          <span v-if="row.unit" class="unit-text">{{ row.unit }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="yardOperationFee" label="堆场操作费" width="90">
        <template #default="{ row }">
          ${{ row.yardOperationFee || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="transportFee" label="运输费" width="80">
        <template #default="{ row }">
          ${{ row.transportFee || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="mappingType" label="映射类型" width="90" />
      <el-table-column prop="isDefault" label="默认" width="60">
        <template #default="{ row }">
          <el-tag v-if="row.isDefault" type="success" size="small">是</el-tag>
          <el-tag v-else type="info" size="small">否</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="60">
        <template #default="{ row }">
          <el-tag v-if="row.isActive" type="success" size="small">启用</el-tag>
          <el-tag v-else type="danger" size="small">禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remarks" label="备注" width="100" show-overflow-tooltip />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button type="primary" link @click="showDialog(row)">编辑</el-button>
          <el-button type="danger" link @click="deleteTrucking(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      class="pagination"
      @size-change="handlePageSizeChange"
      @current-change="handlePageChange"
    />

    <!-- 对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑映射' : '新增映射'" width="600px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="国家" required>
          <el-select v-model="form.country" placeholder="选择国家">
            <el-option label="美国 US" value="US" />
            <el-option label="加拿大 CA" value="CA" />
            <el-option label="英国 GB" value="GB" />
            <el-option label="德国 DE" value="DE" />
          </el-select>
        </el-form-item>
        <el-form-item label="车队编码" required>
          <el-input v-model="form.truckingCompanyId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="车队名称">
          <el-input v-model="form.truckingCompanyName" />
        </el-form-item>
        <el-form-item label="港口编码" required>
          <el-input v-model="form.portCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="港口名称">
          <el-input v-model="form.portName" />
        </el-form-item>
        <el-form-item label="堆场容量">
          <el-input-number v-model="form.yardCapacity" :min="0" />
        </el-form-item>
        <el-form-item label="标准费率">
          <el-input-number v-model="form.standardRate" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="堆场操作费">
          <el-input-number v-model="form.yardOperationFee" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="运输费">
          <el-input-number v-model="form.transportFee" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="映射类型">
          <el-select v-model="form.mappingType">
            <el-option label="DEFAULT" value="DEFAULT" />
            <el-option label="EXPRESS" value="EXPRESS" />
            <el-option label="ECONOMY" value="ECONOMY" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.isActive" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remarks" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTrucking">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/app'

const props = defineProps<{
  country?: string
}>()

const appStore = useAppStore()

const loading = ref(false)
const truckings = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)

const resolvedCountry = computed(() => props.country || appStore.scopedCountryCode || '')

const form = ref({
  country: '',
  truckingCompanyId: '',
  truckingCompanyName: '',
  portCode: '',
  portName: '',
  yardCapacity: 0,
  standardRate: 0,
  yardOperationFee: 0,
  transportFee: 0,
  mappingType: 'DEFAULT',
  isDefault: false,
  isActive: true,
  remarks: ''
})

const loadTruckings = async () => {
  loading.value = true
  try {
    const countryParam = resolvedCountry.value
    const query = new URLSearchParams({
      page: String(currentPage.value),
      pageSize: String(pageSize.value)
    })
    if (countryParam) {
      query.set('country', countryParam)
    }
    const url = `/api/v1/trucking-port-mapping?${query.toString()}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.success) {
      total.value = Number(data.total || 0)
      truckings.value = (data.data || []).map((item: any) => ({
        id: item.id,
        country: item.country,
        truckingCompanyId: item.truckingCompanyId || item.trucking_company_id || '',
        truckingCompanyName: item.truckingCompanyName || item.trucking_company_name || '',
        portCode: item.portCode || item.port_code || '',
        portName: item.portName || item.port_name || '',
        yardCapacity: Number(item.yardCapacity ?? item.yard_capacity ?? 0),
        standardRate: Number(item.standardRate ?? item.standard_rate ?? 0),
        yardOperationFee: Number(item.yardOperationFee ?? item.yard_operation_fee ?? 0),
        transportFee: Number(item.transportFee ?? item.transport_fee ?? 0),
        mappingType: item.mappingType || item.mapping_type || 'DEFAULT',
        isDefault: Boolean(item.isDefault ?? item.is_default),
        isActive: item.isActive ?? item.is_active ?? true,
        remarks: item.remarks || ''
      }))
    } else {
      ElMessage.error(data.error || '加载失败')
    }
  } catch (error: any) {
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const showDialog = (row?: any) => {
  if (row) {
    isEdit.value = true
    editingId.value = row.id
    form.value = {
      country: row.country || resolvedCountry.value || '',
      truckingCompanyId: row.truckingCompanyId || row.trucking_company_id || '',
      truckingCompanyName: row.truckingCompanyName || row.trucking_company_name || '',
      portCode: row.portCode || row.port_code || '',
      portName: row.portName || row.port_name || '',
      yardCapacity: Number(row.yardCapacity ?? row.yard_capacity ?? 0),
      standardRate: Number(row.standardRate ?? row.standard_rate ?? 0),
      yardOperationFee: Number(row.yardOperationFee ?? row.yard_operation_fee ?? 0),
      transportFee: Number(row.transportFee ?? row.transport_fee ?? 0),
      mappingType: row.mappingType || row.mapping_type || 'DEFAULT',
      isDefault: row.isDefault || false,
      isActive: row.isActive !== false,
      remarks: row.remarks || ''
    }
  } else {
    isEdit.value = false
    editingId.value = null
    form.value = {
      country: resolvedCountry.value,
      truckingCompanyId: '',
      truckingCompanyName: '',
      portCode: '',
      portName: '',
      yardCapacity: 0,
      standardRate: 0,
      yardOperationFee: 0,
      transportFee: 0,
      mappingType: 'DEFAULT',
      isDefault: false,
      isActive: true,
      remarks: ''
    }
  }
  dialogVisible.value = true
}

const saveTrucking = async () => {
  if (!form.value.truckingCompanyId || !form.value.portCode) {
    ElMessage.error('请填写车队编码和港口编码')
    return
  }

  try {
    const url = isEdit.value
      ? `/api/v1/trucking-port-mapping/${editingId.value}`
      : '/api/v1/trucking-port-mapping'
    const method = isEdit.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadTruckings()
    } else {
      ElMessage.error(data.error)
    }
  } catch (error: any) {
    ElMessage.error('操作失败: ' + error.message)
  }
}

const deleteTrucking = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该映射记录吗？', '提示', { type: 'warning' })

    const response = await fetch(`/api/v1/trucking-port-mapping/${row.id}`, {
      method: 'DELETE'
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success('删除成功')
      loadTruckings()
    } else {
      ElMessage.error(data.error)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadTruckings()
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadTruckings()
}

onMounted(() => {
  form.value.country = resolvedCountry.value
  loadTruckings()
})

watch(
  () => resolvedCountry.value,
  () => {
    currentPage.value = 1
    form.value.country = resolvedCountry.value
    loadTruckings()
  }
)
</script>

<style scoped>
.trucking-management {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

.unit-text {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}
</style>

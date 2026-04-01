<template>
  <div class="warehouse-management">
    <div class="toolbar">
      <el-button type="primary" @click="showDialog()">
        <el-icon><Plus /></el-icon>
        新增映射
      </el-button>
    </div>

    <el-table :data="warehouses" v-loading="loading" size="small" :empty-text="emptyText">
      <el-table-column prop="country" label="国家" width="60" />
      <el-table-column prop="warehouseCode" label="仓库编码" width="120" />
      <el-table-column prop="warehouseName" label="仓库名称" min-width="150" />
      <el-table-column prop="truckingCompanyId" label="车队编码" width="100" />
      <el-table-column prop="truckingCompanyName" label="车队名称" min-width="150" />
      <el-table-column prop="mappingType" label="映射类型" width="90" />
      <el-table-column prop="transportFee" label="运输费" width="80">
        <template #default="{ row }"> ${{ row.transportFee || 0 }} </template>
      </el-table-column>
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
      <el-table-column prop="remarks" label="备注" width="120" show-overflow-tooltip />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button type="primary" link @click="showDialog(row)">编辑</el-button>
          <el-button type="danger" link @click="deleteWarehouse(row)">删除</el-button>
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
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑映射' : '新增映射'" width="550px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="国家" required>
          <el-select v-model="form.country" placeholder="选择国家">
            <el-option label="美国 US" value="US" />
            <el-option label="加拿大 CA" value="CA" />
            <el-option label="英国 GB" value="GB" />
            <el-option label="德国 DE" value="DE" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库编码" required>
          <el-input v-model="form.warehouseCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="仓库名称">
          <el-input v-model="form.warehouseName" />
        </el-form-item>
        <el-form-item label="车队编码" required>
          <el-input v-model="form.truckingCompanyId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="车队名称">
          <el-input v-model="form.truckingCompanyName" />
        </el-form-item>
        <el-form-item label="映射类型">
          <el-select v-model="form.mappingType">
            <el-option label="DEFAULT" value="DEFAULT" />
            <el-option label="EXPRESS" value="EXPRESS" />
            <el-option label="ECONOMY" value="ECONOMY" />
          </el-select>
        </el-form-item>
        <el-form-item label="运输费">
          <el-input-number v-model="form.transportFee" :min="0" :precision="2" />
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
        <el-button type="primary" @click="saveWarehouse">保存</el-button>
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
const warehouses = ref<any[]>([])
const emptyText = ref('暂无数据')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)

const resolvedCountry = computed(() => props.country || appStore.scopedCountryCode || '')

const form = ref({
  country: '',
  warehouseCode: '',
  warehouseName: '',
  truckingCompanyId: '',
  truckingCompanyName: '',
  mappingType: 'DEFAULT',
  transportFee: 0,
  isDefault: false,
  isActive: true,
  remarks: '',
})

const loadWarehouses = async () => {
  loading.value = true
  try {
    const countryParam = resolvedCountry.value
    const query = new URLSearchParams({
      page: String(currentPage.value),
      pageSize: String(pageSize.value),
    })
    if (countryParam) {
      query.set('country', countryParam)
    }
    const response = await fetch(`/api/v1/warehouse-trucking-mapping?${query.toString()}`)
    const data = await response.json()
    if (data.success) {
      total.value = Number(data.total || 0)
      warehouses.value = (data.data || []).map((item: any) => ({
        id: item.id,
        country: item.country,
        warehouseCode: item.warehouseCode || item.warehouse_code || '',
        warehouseName: item.warehouseName || item.warehouse_name || '',
        truckingCompanyId: item.truckingCompanyId || item.trucking_company_id || '',
        truckingCompanyName: item.truckingCompanyName || item.trucking_company_name || '',
        mappingType: item.mappingType || item.mapping_type || 'DEFAULT',
        transportFee: Number(item.transportFee ?? item.transport_fee ?? 0),
        isDefault: Boolean(item.isDefault ?? item.is_default),
        isActive: item.isActive ?? item.is_active ?? true,
        remarks: item.remarks || '',
      }))

      emptyText.value = countryParam ? `国家 ${countryParam} 暂无数据` : '未设置国家作用域'
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
      warehouseCode: row.warehouseCode || row.warehouse_code || '',
      warehouseName: row.warehouseName || row.warehouse_name || '',
      truckingCompanyId: row.truckingCompanyId || row.trucking_company_id || '',
      truckingCompanyName: row.truckingCompanyName || row.trucking_company_name || '',
      mappingType: row.mappingType || row.mapping_type || 'DEFAULT',
      transportFee: Number(row.transportFee ?? row.transport_fee ?? 0),
      isDefault: row.isDefault || false,
      isActive: row.isActive !== false,
      remarks: row.remarks || '',
    }
  } else {
    isEdit.value = false
    editingId.value = null
    form.value = {
      country: resolvedCountry.value,
      warehouseCode: '',
      warehouseName: '',
      truckingCompanyId: '',
      truckingCompanyName: '',
      mappingType: 'DEFAULT',
      transportFee: 0,
      isDefault: false,
      isActive: true,
      remarks: '',
    }
  }
  dialogVisible.value = true
}

const saveWarehouse = async () => {
  if (!form.value.warehouseCode || !form.value.truckingCompanyId) {
    ElMessage.error('请填写仓库编码和车队编码')
    return
  }

  try {
    const url = isEdit.value
      ? `/api/v1/warehouse-trucking-mapping/${editingId.value}`
      : '/api/v1/warehouse-trucking-mapping'
    const method = isEdit.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadWarehouses()
    } else {
      ElMessage.error(data.error)
    }
  } catch (error: any) {
    ElMessage.error('操作失败: ' + error.message)
  }
}

const deleteWarehouse = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该映射记录吗？', '提示', { type: 'warning' })

    const response = await fetch(`/api/v1/warehouse-trucking-mapping/${row.id}`, {
      method: 'DELETE',
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success('删除成功')
      loadWarehouses()
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
  loadWarehouses()
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadWarehouses()
}

onMounted(() => {
  form.value.country = resolvedCountry.value
  loadWarehouses()
})

watch(
  () => resolvedCountry.value,
  () => {
    currentPage.value = 1
    form.value.country = resolvedCountry.value
    loadWarehouses()
  }
)
</script>

<style scoped>
.warehouse-management {
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
</style>

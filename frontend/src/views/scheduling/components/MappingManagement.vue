<template>
  <div class="mapping-management">
    <div class="toolbar">
      <el-button type="primary" @click="showDialog()">
        <el-icon><Plus /></el-icon>
        新增映射
      </el-button>
    </div>

    <el-table :data="mappings" v-loading="loading" size="small">
      <el-table-column prop="warehouse_code" label="仓库" width="120" />
      <el-table-column prop="warehouse_name" label="仓库名称" />
      <el-table-column prop="trucking_company_id" label="车队" width="120" />
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
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="primary" link @click="showDialog(row)">编辑</el-button>
          <el-button type="danger" link @click="deleteMapping(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑映射' : '新增映射'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="国家" required>
          <el-select v-model="form.country" placeholder="选择国家">
            <el-option label="美国 US" value="US" />
            <el-option label="加拿大 CA" value="CA" />
            <el-option label="英国 GB" value="GB" />
            <el-option label="德国 DE" value="DE" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库" required>
          <el-input v-model="form.warehouseCode" placeholder="仓库编码" />
        </el-form-item>
        <el-form-item label="仓库名称">
          <el-input v-model="form.warehouseName" placeholder="仓库名称(可选)" />
        </el-form-item>
        <el-form-item label="车队" required>
          <el-input v-model="form.truckingCompanyId" placeholder="车队编码" />
        </el-form-item>
        <el-form-item label="车队名称">
          <el-input v-model="form.truckingCompanyName" placeholder="车队名称(可选)" />
        </el-form-item>
        <el-form-item label="拖卡费(USD)">
          <el-input-number v-model="form.transportFee" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="默认映射">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.isActive" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remarks" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMapping">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/app'

const props = defineProps<{
  country?: string
}>()

const appStore = useAppStore()

const loading = ref(false)
const mappings = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)

const form = ref({
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
  remarks: ''
})

const loadMappings = async () => {
  loading.value = true
  try {
    const response = await fetch(`/api/v1/warehouse-trucking-mapping?country=${props.country || appStore.scopedCountryCode || ''}`)
    const data = await response.json()
    if (data.success) {
      mappings.value = data.data || []
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
    form.value = {
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
      remarks: row.remarks || ''
    }
  } else {
    isEdit.value = false
    form.value = {
      id: undefined,
      country: props.country || appStore.scopedCountryCode || '',
      warehouseCode: '',
      warehouseName: '',
      truckingCompanyId: '',
      truckingCompanyName: '',
      mappingType: 'DEFAULT',
      isDefault: false,
      isActive: true,
      transportFee: 0,
      remarks: ''
    }
  }
  dialogVisible.value = true
}

const saveMapping = async () => {
  try {
    if (!form.value.country || !form.value.warehouseCode || !form.value.truckingCompanyId) {
      ElMessage.warning('请填写必填字段')
      return
    }

    const url = form.value.id
      ? `/api/v1/warehouse-trucking-mapping/${form.value.id}`
      : '/api/v1/warehouse-trucking-mapping'

    const method = form.value.id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success(form.value.id ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadMappings()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    ElMessage.error('操作失败: ' + error.message)
  }
}

const deleteMapping = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该映射关系吗？', '提示', { type: 'warning' })

    const response = await fetch(`/api/v1/warehouse-trucking-mapping/${row.id}`, {
      method: 'DELETE'
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success('删除成功')
      loadMappings()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

onMounted(() => {
  loadMappings()
})
</script>

<style scoped>
.mapping-management {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}
</style>

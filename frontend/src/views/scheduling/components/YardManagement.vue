<template>
  <div class="yard-management">
    <div class="toolbar">
      <el-button type="primary" @click="showDialog()">
        <el-icon><Plus /></el-icon>
        新增堆场
      </el-button>
    </div>

    <el-table :data="yards" v-loading="loading" size="small">
      <el-table-column prop="yardCode" label="编码" width="120" />
      <el-table-column prop="yardName" label="名称" />
      <el-table-column prop="portCode" label="港口" width="100" />
      <el-table-column prop="dailyCapacity" label="日产能" width="80" />
      <el-table-column prop="feePerDay" label="每日费用" width="80">
        <template #default="{ row }">
          {{ row.feePerDay ? `$${row.feePerDay}` : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="address" label="地址" />
      <el-table-column prop="contactPhone" label="联系电话" width="120" />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="primary" link @click="showDialog(row)">编辑</el-button>
          <el-button type="danger" link @click="deleteYard(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑堆场' : '新增堆场'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="堆场编码" required>
          <el-input v-model="form.yardCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="堆场名称">
          <el-input v-model="form.yardName" />
        </el-form-item>
        <el-form-item label="港口" required>
          <el-input v-model="form.portCode" placeholder="如: USLAX" />
        </el-form-item>
        <el-form-item label="国家" required>
          <el-select v-model="form.country" placeholder="选择国家">
            <el-option label="美国 US" value="US" />
            <el-option label="加拿大 CA" value="CA" />
            <el-option label="英国 GB" value="GB" />
            <el-option label="德国 DE" value="DE" />
          </el-select>
        </el-form-item>
        <el-form-item label="日产能">
          <el-input-number v-model="form.dailyCapacity" :min="1" />
        </el-form-item>
        <el-form-item label="每日费用">
          <el-input-number v-model="form.feePerDay" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveYard">保存</el-button>
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
const yards = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)

const form = ref({
  yardCode: '',
  yardName: '',
  portCode: '',
  country: '',
  dailyCapacity: 100,
  feePerDay: 0,
  address: '',
  contactPhone: '',
})

const loadYards = async () => {
  loading.value = true
  try {
    const response = await fetch(
      `/api/v1/scheduling/resources/yards?country=${props.country || appStore.scopedCountryCode}`
    )
    const data = await response.json()
    if (data.success) {
      yards.value = data.data || []
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
    form.value = { ...row }
  } else {
    isEdit.value = false
    form.value = {
      yardCode: '',
      yardName: '',
      portCode: '',
      country: props.country || appStore.scopedCountryCode || '',
      dailyCapacity: 100,
      feePerDay: 0,
      address: '',
      contactPhone: '',
    }
  }
  dialogVisible.value = true
}

const saveYard = async () => {
  try {
    const url = isEdit.value
      ? `/api/v1/scheduling/resources/yards/${form.value.yardCode}`
      : '/api/v1/scheduling/resources/yards'

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
      loadYards()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    ElMessage.error('操作失败: ' + error.message)
  }
}

const deleteYard = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该堆场吗？', '提示', { type: 'warning' })

    const response = await fetch(`/api/v1/scheduling/resources/yards/${row.yardCode}`, {
      method: 'DELETE',
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success('删除成功')
      loadYards()
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
  loadYards()
})
</script>

<style scoped>
.yard-management {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}
</style>

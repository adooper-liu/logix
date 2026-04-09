<template>
  <el-dialog
    v-model="dialogVisible"
    title="手工指定仓库"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="120px">
      <!-- ① 选择柜号（可选） -->
      <el-form-item label="适用柜号">
        <el-select
          v-model="form.containerNumbers"
          multiple
          placeholder="留空表示对所有选中柜生效"
          style="width: 100%"
        >
          <el-option
            v-for="container in availableContainers"
            :key="container.containerNumber"
            :label="container.containerNumber"
            :value="container.containerNumber"
          />
        </el-select>
        <div class="form-tip">留空表示对所有选中的柜生效，也可选择特定柜号</div>
      </el-form-item>

      <!-- ② 选择仓库 -->
      <el-form-item label="选择仓库" required>
        <el-select
          v-model="form.warehouseCode"
          placeholder="请选择仓库"
          filterable
          style="width: 100%"
        >
          <el-option-group v-for="group in warehouseGroups" :key="group.type" :label="group.type">
            <el-option
              v-for="wh in group.warehouses"
              :key="wh.warehouseCode"
              :label="`${wh.warehouseCode} - ${wh.warehouseName}`"
              :value="wh.warehouseCode"
              :disabled="!wh.available"
            >
              <div class="warehouse-option">
                <span>{{ wh.warehouseCode }} - {{ wh.warehouseName }}</span>
                <el-tag size="small" :type="getTypeTag(wh.propertyType)">
                  {{ wh.propertyType }}
                </el-tag>
                <span class="availability">
                  {{ wh.available ? '可用' : '不可用' }}
                </span>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
        <div class="form-tip">仅显示可用于该港口的仓库</div>
      </el-form-item>

      <!-- ③ 仓库信息展示 -->
      <el-alert
        v-if="form.warehouseCode"
        title="仓库信息"
        type="info"
        :closable="false"
        style="margin-top: 16px"
      >
        <div v-if="selectedWarehouseInfo" class="warehouse-info">
          <p><strong>仓库名称:</strong> {{ selectedWarehouseInfo.warehouseName }}</p>
          <p><strong>仓库类型:</strong> {{ selectedWarehouseInfo.propertyType }}</p>
          <p><strong>所属国家:</strong> {{ selectedWarehouseInfo.country }}</p>
          <p><strong>地址:</strong> {{ selectedWarehouseInfo.address }}</p>
        </div>
      </el-alert>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="confirming"> 确认排产 </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import api from '@/services/api'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { notifyErrorUnlessCanceled } from '../requestError'

const props = defineProps<{
  visible: boolean
  containerNumbers: string[] // 选中的柜号列表
  portCode?: string // 当前港口
  countryCode?: string // 当前国家
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (
    e: 'confirm',
    data: {
      warehouseCode: string
      containerNumbers?: string[]
    }
  ): void
}>()

// 表单数据
const form = ref({
  warehouseCode: '',
  containerNumbers: [] as string[],
})

// 可用集装箱
const availableContainers = ref(
  props.containerNumbers.map(num => ({
    containerNumber: num,
  }))
)

// 仓库列表
const warehouses = ref<any[]>([])
const loading = ref(false)

// 仓库分组（按类型）
const warehouseGroups = computed(() => {
  const groups: Record<string, any[]> = {
    自营仓: [],
    平台仓: [],
    第三方仓: [],
  }

  warehouses.value.forEach(wh => {
    if (groups[wh.propertyType]) {
      groups[wh.propertyType].push(wh)
    }
  })

  return Object.entries(groups)
    .map(([type, list]) => ({
      type,
      warehouses: list,
    }))
    .filter(g => g.warehouses.length > 0)
})

// 选中的仓库信息
const selectedWarehouseInfo = computed(() => {
  return warehouses.value.find(wh => wh.warehouseCode === form.value.warehouseCode)
})

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val),
})

// 加载仓库列表
const loadWarehouses = async () => {
  if (!props.portCode || !props.countryCode) {
    ElMessage.warning('缺少港口或国家信息')
    return
  }

  loading.value = true
  try {
    const response = await api.get('/scheduling/warehouses', {
      params: {
        portCode: props.portCode,
        countryCode: props.countryCode,
      },
    })

    warehouses.value = response.data.map((wh: any) => ({
      ...wh,
      available: wh.status === 'ACTIVE' && wh.dailyUnloadCapacity > 0,
    }))
  } catch (error) {
    notifyErrorUnlessCanceled(error, '加载仓库列表失败')
  } finally {
    loading.value = false
  }
}

// 获取类型标签颜色
const getTypeTag = (type: string) => {
  const map: Record<string, 'success' | 'warning' | 'info'> = {
    自营仓: 'success',
    平台仓: 'warning',
    第三方仓: 'info',
  }
  return map[type] || 'info'
}

// 确认操作
const handleConfirm = () => {
  if (!form.value.warehouseCode) {
    ElMessage.warning('请选择仓库')
    return
  }

  emit('confirm', {
    warehouseCode: form.value.warehouseCode,
    containerNumbers:
      form.value.containerNumbers.length > 0 ? form.value.containerNumbers : undefined,
  })

  dialogVisible.value = false
}

// 监听可见性变化，加载数据
watch(
  () => props.visible,
  val => {
    if (val) {
      loadWarehouses()
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.warehouse-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  .availability {
    font-size: 12px;
    color: #999;
  }
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.warehouse-info {
  p {
    margin: 8px 0;
    font-size: 13px;
    line-height: 1.6;
  }
}
</style>

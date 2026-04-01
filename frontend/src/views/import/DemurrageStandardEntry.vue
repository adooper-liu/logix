<script setup lang="ts">
/**
 * 滞港费标准手工录入
 * 四项匹配字段使用字典下拉，确保口径统一
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { dictService, type DictItem } from '@/services/dict'
import { demurrageService } from '@/services/demurrage'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)

const ports = ref<DictItem[]>([])
const shippingCompanies = ref<DictItem[]>([])
const freightForwarders = ref<DictItem[]>([])
const overseasCompanies = ref<DictItem[]>([])

const form = reactive({
  foreign_company_code: '',
  foreign_company_name: '',
  effective_date: '',
  expiry_date: '',
  destination_port_code: '',
  destination_port_name: '',
  shipping_company_code: '',
  shipping_company_name: '',
  origin_forwarder_code: '',
  origin_forwarder_name: '',
  free_days: 7,
  free_days_basis: '自然日',
  calculation_basis: '按卸船',
  rate_per_day: 0,
  currency: 'USD',
  charge_name: '滞港费',
})

async function loadDicts() {
  loading.value = true
  try {
    const [pRes, sRes, fRes, oRes] = await Promise.all([
      dictService.getPorts(),
      dictService.getShippingCompanies(),
      dictService.getFreightForwarders(),
      dictService.getOverseasCompanies(),
    ])
    ports.value = pRes.data || []
    shippingCompanies.value = sRes.data || []
    freightForwarders.value = fRes.data || []
    overseasCompanies.value = oRes.data || []
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '加载字典失败')
  } finally {
    loading.value = false
  }
}

function onPortChange(code: string) {
  const item = ports.value.find(p => p.code === code)
  form.destination_port_name = item?.name || ''
}

function onShipChange(code: string) {
  const item = shippingCompanies.value.find(s => s.code === code)
  form.shipping_company_name = item?.name || ''
}

function onForwarderChange(code: string) {
  const item = freightForwarders.value.find(f => f.code === code)
  form.origin_forwarder_name = item?.name || ''
}

function onOverseasChange(code: string) {
  const item = overseasCompanies.value.find(o => o.code === code)
  form.foreign_company_name = item?.name || ''
}

async function submit() {
  if (
    !form.foreign_company_code ||
    !form.destination_port_code ||
    !form.shipping_company_code ||
    !form.origin_forwarder_code
  ) {
    ElMessage.warning('请填写客户、目的港、船公司、货代（从字典选择）')
    return
  }
  if (form.free_days < 0) {
    ElMessage.warning('免费天数不能为负')
    return
  }

  submitting.value = true
  try {
    const res = await demurrageService.createStandard({
      foreign_company_code: form.foreign_company_code,
      foreign_company_name: form.foreign_company_name,
      effective_date: form.effective_date || undefined,
      expiry_date: form.expiry_date || undefined,
      destination_port_code: form.destination_port_code,
      destination_port_name: form.destination_port_name,
      shipping_company_code: form.shipping_company_code,
      shipping_company_name: form.shipping_company_name,
      origin_forwarder_code: form.origin_forwarder_code,
      origin_forwarder_name: form.origin_forwarder_name,
      free_days: form.free_days,
      free_days_basis: form.free_days_basis,
      calculation_basis: form.calculation_basis,
      rate_per_day: form.rate_per_day,
      currency: form.currency,
      charge_name: form.charge_name,
    })
    if (res.success) {
      ElMessage.success('创建成功')
      router.push('/import/demurrage-standards')
    } else {
      ElMessage.error(res.message || '创建失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push('/import/demurrage-standards')
}

onMounted(() => {
  loadDicts()
})
</script>

<template>
  <div class="demurrage-entry-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span class="title">滞港费标准录入</span>
          <el-button type="default" @click="goBack">返回导入页</el-button>
        </div>
      </template>

      <el-form :model="form" label-width="140px" class="entry-form">
        <el-divider content-position="left">四项匹配（从字典选择，口径统一）</el-divider>

        <el-form-item label="客户/海外公司" required>
          <el-select
            v-model="form.foreign_company_code"
            placeholder="请选择"
            filterable
            clearable
            style="width: 100%"
            @change="onOverseasChange"
          >
            <el-option
              v-for="o in overseasCompanies"
              :key="o.code"
              :label="`${o.name} (${o.code})`"
              :value="o.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="目的港" required>
          <el-select
            v-model="form.destination_port_code"
            placeholder="请选择"
            filterable
            clearable
            style="width: 100%"
            @change="onPortChange"
          >
            <el-option
              v-for="p in ports"
              :key="p.code"
              :label="`${p.name} (${p.code})`"
              :value="p.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="船公司" required>
          <el-select
            v-model="form.shipping_company_code"
            placeholder="请选择"
            filterable
            clearable
            style="width: 100%"
            @change="onShipChange"
          >
            <el-option
              v-for="s in shippingCompanies"
              :key="s.code"
              :label="`${s.name} (${s.code})`"
              :value="s.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="货代" required>
          <el-select
            v-model="form.origin_forwarder_code"
            placeholder="请选择"
            filterable
            clearable
            style="width: 100%"
            @change="onForwarderChange"
          >
            <el-option
              v-for="f in freightForwarders"
              :key="f.code"
              :label="`${f.name} (${f.code})`"
              :value="f.code"
            />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">费用参数</el-divider>

        <el-form-item label="生效日期">
          <el-date-picker
            v-model="form.effective_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="结束日期">
          <el-date-picker
            v-model="form.expiry_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期（空表示长期有效）"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="免费天数" required>
          <el-input-number v-model="form.free_days" :min="0" :max="365" />
        </el-form-item>

        <el-form-item label="免费天数基准">
          <el-select v-model="form.free_days_basis" style="width: 100%">
            <el-option label="自然日" value="自然日" />
            <el-option label="工作日" value="工作日" />
            <el-option label="工作+自然日" value="工作+自然日" />
            <el-option label="自然+工作日" value="自然+工作日" />
          </el-select>
        </el-form-item>

        <el-form-item label="计算方式">
          <el-select v-model="form.calculation_basis" style="width: 100%">
            <el-option label="按到港" value="按到港" />
            <el-option label="按卸船" value="按卸船" />
          </el-select>
        </el-form-item>

        <el-form-item label="单日费率">
          <el-input-number v-model="form.rate_per_day" :min="0" :precision="2" />
          <span class="form-suffix">{{ form.currency }}/天</span>
        </el-form-item>

        <el-form-item label="费用名称">
          <el-input v-model="form.charge_name" placeholder="如：滞港费" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit"> 保存 </el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.demurrage-entry-page {
  padding: $spacing-md;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: $font-size-lg;
    font-weight: 600;
  }
}

.entry-form {
  max-width: 560px;

  .form-suffix {
    margin-left: $spacing-sm;
    color: $text-secondary;
    font-size: $font-size-sm;
  }

  :deep(.el-divider) {
    margin: $spacing-lg 0 $spacing-md;
  }
}
</style>

/** * 全球快递费试算页面 * Global Express Cost Calculator Page */

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Operation, InfoFilled } from '@element-plus/icons-vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1'

// 表单数据
const form = reactive({
  countryCode: 'US',
  carrierServiceId: null as number | null,
  versionKey: '',
  longestIn: 0,
  secondIn: 0,
  shortestIn: 0,
  grossWeightLbs: 0,
  quantity: 1,
  packagingType: 'CARTON',
})

// 计算结果
const result = ref<any>(null)
const calculating = ref(false)

// 承运商列表
const carriers = ref<any[]>([])
const loadingCarriers = ref(false)

// 版本列表
const versions = ref<any[]>([])

/**
 * 加载承运商列表
 */
const loadCarriers = async (resetSelection = false) => {
  if (!form.countryCode) return

  if (resetSelection) {
    form.carrierServiceId = null
    result.value = null
  }

  loadingCarriers.value = true
  try {
    const response = await fetch(
      `${API_BASE_URL}/express-cost/carriers?countryCode=${form.countryCode}`
    )
    const data = await response.json()

    if (data.success) {
      carriers.value = data.data
      // 默认选择第一个
      if (carriers.value.length > 0 && !form.carrierServiceId) {
        form.carrierServiceId = carriers.value[0].id
      }
    } else {
      ElMessage.error('加载承运商列表失败')
    }
  } catch (error: any) {
    console.error('[ExpressCostCalculator] 加载承运商失败:', error)
    ElMessage.error('加载承运商列表失败: ' + error.message)
  } finally {
    loadingCarriers.value = false
  }
}

const handleCountryChange = () => {
  loadCarriers(true)
}

/**
 * 加载版本列表
 */
const loadVersions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/express-cost/versions`)
    const data = await response.json()

    if (data.success) {
      versions.value = data.data
    }
  } catch (error: any) {
    console.error('[ExpressCostCalculator] 加载版本失败:', error)
  }
}

/**
 * 执行试算
 */
const calculate = async () => {
  // 验证必填字段
  if (!form.carrierServiceId) {
    ElMessage.warning('请选择承运商')
    return
  }

  if (
    form.longestIn <= 0 ||
    form.secondIn <= 0 ||
    form.shortestIn <= 0 ||
    form.grossWeightLbs <= 0
  ) {
    ElMessage.warning('请填写完整的尺寸和重量信息')
    return
  }

  calculating.value = true
  result.value = null

  try {
    const payload: any = {
      countryCode: form.countryCode,
      carrierServiceId: form.carrierServiceId,
      longestIn: form.longestIn,
      secondIn: form.secondIn,
      shortestIn: form.shortestIn,
      grossWeightLbs: form.grossWeightLbs,
    }

    if (form.versionKey) {
      payload.versionKey = form.versionKey
    }

    if (form.quantity > 1) {
      payload.quantity = form.quantity
    }

    if (form.packagingType) {
      payload.packagingType = form.packagingType
    }

    const response = await fetch(`${API_BASE_URL}/express-cost/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (data.success) {
      result.value = data.data
    } else {
      ElMessage.error(data.message || '计算失败')
    }
  } catch (error: any) {
    ElMessage.error('计算失败: ' + error.message)
    console.error('[ExpressCostCalculator] 计算失败:', error)
  } finally {
    calculating.value = false
  }
}

/**
 * 重置表单
 */
const resetForm = () => {
  form.longestIn = 0
  form.secondIn = 0
  form.shortestIn = 0
  form.grossWeightLbs = 0
  form.quantity = 1
  form.packagingType = 'CARTON'
  result.value = null
}

onMounted(() => {
  loadCarriers()
  loadVersions()
})
</script>

<template>
  <div class="express-cost-calculator-page">
    <el-row :gutter="20">
      <!-- 左侧：试算表单 -->
      <el-col :span="10">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">
                <el-icon><Operation /></el-icon>
                快递费试算
              </span>
            </div>
          </template>

          <el-form :model="form" label-width="120px">
            <el-form-item label="国家代码">
              <el-select
                v-model="form.countryCode"
                placeholder="请选择国家"
                @change="handleCountryChange"
                style="width: 100%"
              >
                <el-option label="美国 (US)" value="US" />
                <el-option label="加拿大 (CA)" value="CA" />
                <el-option label="德国 (DE)" value="DE" />
                <el-option label="英国 (UK)" value="UK" />
                <el-option label="法国 (FR)" value="FR" />
                <el-option label="意大利 (IT)" value="IT" />
                <el-option label="西班牙 (ES)" value="ES" />
                <el-option label="爱尔兰 (IE)" value="IE" />
              </el-select>
            </el-form-item>

            <el-form-item label="承运商">
              <el-select
                v-model="form.carrierServiceId"
                placeholder="请选择承运商"
                :loading="loadingCarriers"
                style="width: 100%"
              >
                <el-option
                  v-for="carrier in carriers"
                  :key="carrier.id"
                  :label="carrier.serviceName"
                  :value="carrier.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="规则版本">
              <el-select
                v-model="form.versionKey"
                placeholder="使用最新版本"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="version in versions"
                  :key="version.id"
                  :label="`${version.versionKey} (${version.sourceFileName})`"
                  :value="version.versionKey"
                />
              </el-select>
            </el-form-item>

            <el-divider content-position="left">包裹尺寸（英寸）</el-divider>

            <el-form-item label="最长边">
              <el-input-number
                v-model="form.longestIn"
                :min="0"
                :precision="2"
                placeholder="例如：50"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="次长边">
              <el-input-number
                v-model="form.secondIn"
                :min="0"
                :precision="2"
                placeholder="例如：30"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="最短边">
              <el-input-number
                v-model="form.shortestIn"
                :min="0"
                :precision="2"
                placeholder="例如：20"
                style="width: 100%"
              />
            </el-form-item>

            <el-divider content-position="left">重量信息</el-divider>

            <el-form-item label="毛重（磅）">
              <el-input-number
                v-model="form.grossWeightLbs"
                :min="0"
                :precision="2"
                placeholder="例如：40"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="数量">
              <el-input-number
                v-model="form.quantity"
                :min="1"
                placeholder="默认为 1"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="包装类型">
              <el-select v-model="form.packagingType" style="width: 100%">
                <el-option label="瓦楞纸箱 (CARTON)" value="CARTON" />
                <el-option label="圆柱形 (CYLINDER)" value="CYLINDER" />
                <el-option label="软包 (SOFT_PACK)" value="SOFT_PACK" />
                <el-option label="非瓦楞 (NON_CORRUGATED)" value="NON_CORRUGATED" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                @click="calculate"
                :loading="calculating"
                style="width: 100%"
              >
                <el-icon><Operation /></el-icon>
                开始试算
              </el-button>
              <el-button @click="resetForm" style="width: 100%; margin-top: 10px"> 重置 </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：计算结果 -->
      <el-col :span="14">
        <el-card class="result-card" v-if="result">
          <template #header>
            <div class="card-header">
              <span class="title">试算结果</span>
            </div>
          </template>

          <!-- 拒收状态 -->
          <el-alert
            v-if="result.status === 'REJECTED'"
            type="error"
            :closable="false"
            show-icon
            class="reject-alert"
          >
            <template #title>拒收</template>
            <p>{{ result.rejectReason }}</p>
          </el-alert>

          <!-- 费用明细 -->
          <div v-else>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="计费重">
                {{ result.billableWeightLbs }} lb
              </el-descriptions-item>
              <el-descriptions-item label="体积重">
                {{ result.volumeWeightLbs }} lb
              </el-descriptions-item>
              <el-descriptions-item label="附加费总额" :span="2">
                <strong style="color: #f56c6c; font-size: 18px">
                  ${{ Number(result.totalSurcharge || 0).toFixed(2) }}
                </strong>
              </el-descriptions-item>
            </el-descriptions>

            <!-- 费用分项 -->
            <div v-if="result.charges.length > 0" class="charges-section">
              <h4>费用分项：</h4>
              <el-table :data="result.charges" border>
                <el-table-column prop="type" label="类型" width="150" />
                <el-table-column prop="typeRaw" label="原始名称" />
                <el-table-column prop="amount" label="金额" width="120">
                  <template #default="{ row }"> ${{ Number(row.amount || 0).toFixed(2) }} </template>
                </el-table-column>
                <el-table-column prop="disabledBy" label="禁用原因" />
              </el-table>
            </div>

            <!-- 元数据 -->
            <div v-if="result.metadata" class="metadata-section">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="命中规则数">
                  {{ result.metadata.rulesMatched }}
                </el-descriptions-item>
                <el-descriptions-item label="禁用规则数">
                  {{ result.metadata.rulesDisabled }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>

        <!-- 空状态 -->
        <el-card v-else class="empty-card">
          <el-empty description="请填写表单并点击「开始试算」" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.express-cost-calculator-page {
  padding: 20px;

  .form-card,
  .result-card,
  .empty-card {
    height: 100%;
  }

  .card-header {
    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .reject-alert {
    margin-bottom: 20px;
  }

  .charges-section {
    margin-top: 20px;

    h4 {
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .metadata-section {
    margin-top: 20px;
  }
}
</style>

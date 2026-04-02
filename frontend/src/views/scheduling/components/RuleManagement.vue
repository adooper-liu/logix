<template>
  <div class="rule-management">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="queryParams.ruleType" placeholder="规则类型" clearable @change="handleQuery">
          <el-option label="仓库评分" value="WAREHOUSE_SCORING" />
          <el-option label="车队评分" value="TRUCKING_SCORING" />
          <el-option label="日期计算" value="DATE_CALCULATION" />
          <el-option label="能力规划" value="CAPACITY_PLANNING" />
          <el-option label="成本估算" value="COST_ESTIMATION" />
        </el-select>
        <el-input
          v-model="queryParams.keyword"
          placeholder="搜索规则名称/编码"
          style="width: 200px"
          clearable
          @keyup.enter="handleQuery"
        />
        <el-button type="primary" @click="handleQuery">
          <el-icon><Search /></el-icon> 查询
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button @click="handleReloadCache">
          <el-icon><Refresh /></el-icon> 刷新缓存
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon> 新建规则
        </el-button>
      </div>
    </div>

    <!-- 规则列表 -->
    <el-table :data="rules" v-loading="loading" stripe>
      <el-table-column prop="ruleId" label="规则ID" width="150" />
      <el-table-column prop="ruleName" label="规则名称" min-width="150">
        <template #default="{ row }">
          <span>{{ row.ruleName }}</span>
          <el-tag v-if="row.isDefault" size="small" type="warning" style="margin-left: 8px">默认</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="ruleCode" label="规则编码" width="180" />
      <el-table-column prop="ruleType" label="类型" width="130">
        <template #default="{ row }">
          <el-tag>{{ getRuleTypeLabel(row.ruleType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="80">
        <template #default="{ row }">
          <span class="priority-value">{{ row.priority }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="applyTo" label="适用范围" width="130" />
      <el-table-column prop="effectiveFrom" label="生效日期" width="110">
        <template #default="{ row }">
          {{ formatDate(row.effectiveFrom) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="handleTest(row)">测试</el-button>
          <el-button
            link
            :type="row.isActive ? 'warning' : 'success'"
            @click="handleToggleStatus(row)"
          >
            {{ row.isActive ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleQuery"
        @current-change="handleQuery"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑规则' : '新建规则'"
      width="700px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <el-form-item label="规则ID" prop="ruleId" v-if="!isEdit">
          <el-input v-model="formData.ruleId" placeholder="如 RULE-US-001" />
        </el-form-item>
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="formData.ruleName" placeholder="规则显示名称" />
        </el-form-item>
        <el-form-item label="规则编码" prop="ruleCode">
          <el-input v-model="formData.ruleCode" placeholder="如 US_PORT_SCORING" />
        </el-form-item>
        <el-form-item label="规则类型" prop="ruleType">
          <el-select v-model="formData.ruleType" placeholder="选择规则类型">
            <el-option label="仓库评分" value="WAREHOUSE_SCORING" />
            <el-option label="车队评分" value="TRUCKING_SCORING" />
            <el-option label="日期计算" value="DATE_CALCULATION" />
            <el-option label="能力规划" value="CAPACITY_PLANNING" />
            <el-option label="成本估算" value="COST_ESTIMATION" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用范围" prop="applyTo">
          <el-select v-model="formData.applyTo" placeholder="选择适用范围">
            <el-option label="仓库评分" value="WAREHOUSE_SCORING" />
            <el-option label="车队评分" value="TRUCKING_SCORING" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="formData.priority" :min="1" :max="10000" />
          <span class="form-tip">数值越小优先级越高</span>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.ruleDescription" type="textarea" rows="2" />
        </el-form-item>

        <!-- 条件配置 -->
        <el-divider content-position="left">匹配条件</el-divider>
        <el-form-item label="适用国家">
          <el-select v-model="formData.conditions.countryCodes" multiple placeholder="不选择则匹配所有" clearable>
            <el-option label="美国 (US)" value="US" />
            <el-option label="英国 (UK)" value="UK" />
            <el-option label="德国 (DE)" value="DE" />
            <el-option label="法国 (FR)" value="FR" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用港口">
          <el-select v-model="formData.conditions.portCodes" multiple placeholder="不选择则匹配所有" clearable>
            <el-option label="洛杉矶 (USLAX)" value="USLAX" />
            <el-option label="长滩 (USLGB)" value="USLGB" />
            <el-option label="奥克兰 (USOAK)" value="USOAK" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库类型">
          <el-select v-model="formData.conditions.warehouseTypes" multiple placeholder="不选择则匹配所有" clearable>
            <el-option label="自营仓库" value="SELF_OPERATED" />
            <el-option label="平台仓库" value="PLATFORM" />
            <el-option label="第三方仓库" value="THIRD_PARTY" />
          </el-select>
        </el-form-item>
        <el-form-item label="车队级别">
          <el-select v-model="formData.conditions.truckingTypes" multiple placeholder="不选择则匹配所有" clearable>
            <el-option label="战略合作伙伴" value="STRATEGIC" />
            <el-option label="核心合作伙伴" value="CORE" />
            <el-option label="普通合作伙伴" value="NORMAL" />
            <el-option label="临时合作伙伴" value="TEMPORARY" />
          </el-select>
        </el-form-item>

        <!-- 动作配置 -->
        <el-divider content-position="left">评分动作</el-divider>
        <el-form-item label="成本权重">
          <el-slider
            v-model="formData.actions.scoreWeights.cost"
            :min="0"
            :max="1"
            :step="0.05"
            show-stops
          />
          <span class="weight-value">{{ (formData.actions.scoreWeights.cost * 100).toFixed(0) }}%</span>
        </el-form-item>
        <el-form-item label="能力权重">
          <el-slider
            v-model="formData.actions.scoreWeights.capacity"
            :min="0"
            :max="1"
            :step="0.05"
            show-stops
          />
          <span class="weight-value">{{ (formData.actions.scoreWeights.capacity * 100).toFixed(0) }}%</span>
        </el-form-item>
        <el-form-item label="关系权重">
          <el-slider
            v-model="formData.actions.scoreWeights.relationship"
            :min="0"
            :max="1"
            :step="0.05"
            show-stops
          />
          <span class="weight-value">{{ (formData.actions.scoreWeights.relationship * 100).toFixed(0) }}%</span>
        </el-form-item>

        <!-- 关系级别加分 -->
        <el-form-item label="关系级别加分">
          <div class="bonus-config">
            <el-input-number v-model="formData.actions.bonusPoints.partnershipLevel.STRATEGIC" :min="0" :max="50" />
            <span>战略合作 +</span>
            <el-input-number v-model="formData.actions.bonusPoints.partnershipLevel.CORE" :min="0" :max="50" />
            <span>核心 +</span>
            <el-input-number v-model="formData.actions.bonusPoints.partnershipLevel.NORMAL" :min="0" :max="50" />
            <span>普通</span>
          </div>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="formData.isActive">立即启用</el-checkbox>
          <el-checkbox v-model="formData.isDefault">设为默认规则</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 测试对话框 -->
    <el-dialog v-model="testDialogVisible" title="规则测试" width="600px">
      <el-form :model="testData" label-width="120px">
        <el-form-item label="执行ID">
          <el-input v-model="testData.executionId" />
        </el-form-item>
        <el-form-item label="国家">
          <el-select v-model="testData.countryCode" placeholder="选择国家" clearable>
            <el-option label="美国" value="US" />
            <el-option label="英国" value="UK" />
            <el-option label="德国" value="DE" />
          </el-select>
        </el-form-item>
        <el-form-item label="港口">
          <el-select v-model="testData.portCode" placeholder="选择港口" clearable>
            <el-option label="洛杉矶" value="USLAX" />
            <el-option label="长滩" value="USLGB" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库类型">
          <el-select v-model="testData.warehouseType" placeholder="选择仓库类型" clearable>
            <el-option label="自营" value="SELF_OPERATED" />
            <el-option label="平台" value="PLATFORM" />
          </el-select>
        </el-form-item>
        <el-form-item label="车队级别">
          <el-select v-model="testData.truckingType" placeholder="选择车队级别" clearable>
            <el-option label="战略" value="STRATEGIC" />
            <el-option label="核心" value="CORE" />
            <el-option label="普通" value="NORMAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="基础分数">
          <el-input-number v-model="testData.baseRelationshipScore" :min="0" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleRunTest" :loading="testing">执行测试</el-button>
      </template>
    </el-dialog>

    <!-- 测试结果展示 -->
    <el-dialog v-model="testResultVisible" title="测试结果" width="500px">
      <el-descriptions :column="1" border v-if="testResult">
        <el-descriptions-item label="匹配规则">
          {{ testResult.matchedRule?.ruleName || '无匹配规则' }}
        </el-descriptions-item>
        <el-descriptions-item label="规则编码">
          {{ testResult.matchedRule?.ruleCode || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="执行耗时">
          {{ testResult.executionTimeMs }} ms
        </el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">分数调整</el-divider>
      <el-table :data="scoreComparison" border size="small">
        <el-table-column prop="dimension" label="评分维度" />
        <el-table-column prop="original" label="原始分数" align="center" />
        <el-table-column prop="adjusted" label="调整后分数" align="center" />
      </el-table>

      <el-divider content-position="left">权重配置</el-divider>
      <el-table :data="weightComparison" border size="small">
        <el-table-column prop="dimension" label="权重" />
        <el-table-column prop="value" label="权重值" align="center">
          <template #default="{ row }">
            {{ (row.value * 100).toFixed(0) }}%
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Search, Plus, Refresh } from '@element-plus/icons-vue';
import { schedulingRuleApi, type SchedulingRule, type CreateRuleDto, type UpdateRuleDto, type ExecuteRuleTestDto, type ExecuteRuleResponse } from '@/services/schedulingRule';

// ==================== 状态 ====================

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const rules = ref<SchedulingRule[]>([]);
const dialogVisible = ref(false);
const testDialogVisible = ref(false);
const testResultVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const currentRuleId = ref('');

// 查询参数
const queryParams = reactive({
  ruleType: '',
  keyword: '',
  isActive: undefined as boolean | undefined
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

// 表单数据
const defaultFormData = {
  ruleId: '',
  ruleName: '',
  ruleCode: '',
  ruleDescription: '',
  ruleType: 'TRUCKING_SCORING' as const,
  applyTo: 'TRUCKING_SCORING',
  priority: 100,
  isActive: true,
  isDefault: false,
  conditions: {
    countryCodes: [] as string[],
    portCodes: [] as string[],
    warehouseTypes: [] as string[],
    truckingTypes: [] as string[]
  },
  actions: {
    scoreWeights: {
      cost: 0.4,
      capacity: 0.3,
      relationship: 0.3
    },
    bonusPoints: {
      partnershipLevel: {
        STRATEGIC: 30,
        CORE: 20,
        NORMAL: 10,
        TEMPORARY: 0
      }
    }
  }
};
const formData = reactive({ ...defaultFormData });

// 表单验证
const formRules: FormRules = {
  ruleId: [{ required: true, message: '请输入规则ID', trigger: 'blur' }],
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  ruleCode: [{ required: true, message: '请输入规则编码', trigger: 'blur' }],
  ruleType: [{ required: true, message: '请选择规则类型', trigger: 'change' }],
  applyTo: [{ required: true, message: '请选择适用范围', trigger: 'change' }]
};

// 测试数据
const testData = reactive<ExecuteRuleTestDto>({
  executionId: `test-${Date.now()}`,
  countryCode: '',
  portCode: '',
  warehouseType: '',
  truckingType: '',
  baseRelationshipScore: 50
});

const testResult = ref<ExecuteRuleResponse | null>(null);

// ==================== 计算属性 ====================

const scoreComparison = computed(() => {
  if (!testResult.value) return [];
  const { originalScores, adjustedScores } = testResult.value;
  return [
    { dimension: '成本', original: originalScores.cost, adjusted: adjustedScores.cost.toFixed(1) },
    { dimension: '能力', original: originalScores.capacity, adjusted: adjustedScores.capacity.toFixed(1) },
    { dimension: '关系', original: originalScores.relationship, adjusted: adjustedScores.relationship.toFixed(1) }
  ];
});

const weightComparison = computed(() => {
  if (!testResult.value) return [];
  const { weights } = testResult.value.adjustedScores;
  return [
    { dimension: '成本权重', value: weights.cost },
    { dimension: '能力权重', value: weights.capacity },
    { dimension: '关系权重', value: weights.relationship }
  ];
});

// ==================== 方法 ====================

/** 查询规则列表 */
async function handleQuery() {
  loading.value = true;
  try {
    const response = await schedulingRuleApi.queryRules({
      ...queryParams,
      page: pagination.page,
      pageSize: pagination.pageSize
    });
    rules.value = response.data.items;
    pagination.total = response.data.total;
  } catch (error) {
    console.error('查询规则失败:', error);
  } finally {
    loading.value = false;
  }
}

/** 创建规则 */
function handleCreate() {
  isEdit.value = false;
  Object.assign(formData, JSON.parse(JSON.stringify(defaultFormData)));
  dialogVisible.value = true;
}

/** 编辑规则 */
async function handleEdit(row: SchedulingRule) {
  isEdit.value = true;
  currentRuleId.value = row.ruleId;
  try {
    const response = await schedulingRuleApi.getRuleById(row.ruleId);
    const rule = response.data;
    Object.assign(formData, {
      ruleName: rule.ruleName,
      ruleNameEn: rule.ruleNameEn,
      ruleCode: rule.ruleCode,
      ruleDescription: rule.ruleDescription,
      ruleType: rule.ruleType,
      applyTo: rule.applyTo,
      priority: rule.priority,
      isActive: rule.isActive,
      isDefault: rule.isDefault,
      conditions: rule.conditions || defaultFormData.conditions,
      actions: rule.actions || defaultFormData.actions
    });
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error('获取规则详情失败');
  }
}

/** 保存规则 */
async function handleSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (isEdit.value) {
        const updateData: UpdateRuleDto = {
          ruleName: formData.ruleName,
          ruleNameEn: formData.ruleNameEn,
          ruleDescription: formData.ruleDescription,
          conditions: formData.conditions,
          actions: {
            scoreAdjustments: {
              scoreWeights: formData.actions.scoreWeights
            },
            bonusPoints: formData.actions.bonusPoints
          },
          priority: formData.priority,
          isActive: formData.isActive,
          isDefault: formData.isDefault
        };
        await schedulingRuleApi.updateRule(currentRuleId.value, updateData);
        ElMessage.success('规则更新成功');
      } else {
        const createData: CreateRuleDto = {
          ...formData,
          actions: {
            scoreAdjustments: {
              scoreWeights: formData.actions.scoreWeights
            },
            bonusPoints: formData.actions.bonusPoints
          }
        };
        await schedulingRuleApi.createRule(createData);
        ElMessage.success('规则创建成功');
      }
      dialogVisible.value = false;
      handleQuery();
    } catch (error) {
      ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
    } finally {
      saving.value = false;
    }
  });
}

/** 删除规则 */
async function handleDelete(row: SchedulingRule) {
  try {
    await ElMessageBox.confirm(`确定删除规则 "${row.ruleName}" 吗？`, '提示', {
      type: 'warning'
    });
    await schedulingRuleApi.deleteRule(row.ruleId);
    ElMessage.success('删除成功');
    handleQuery();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

/** 切换状态 */
async function handleToggleStatus(row: SchedulingRule) {
  try {
    if (row.isActive) {
      await schedulingRuleApi.deactivateRule(row.ruleId);
      ElMessage.success('规则已停用');
    } else {
      await schedulingRuleApi.activateRule(row.ruleId);
      ElMessage.success('规则已启用');
    }
    handleQuery();
  } catch (error) {
    ElMessage.error('操作失败');
  }
}

/** 刷新缓存 */
async function handleReloadCache() {
  try {
    await schedulingRuleApi.reloadRules();
    ElMessage.success('缓存已刷新');
  } catch (error) {
    ElMessage.error('刷新失败');
  }
}

/** 打开测试对话框 */
function handleTest(row: SchedulingRule) {
  testData.executionId = `test-${Date.now()}`;
  testData.countryCode = row.conditions?.countryCodes?.[0] || '';
  testData.portCode = row.conditions?.portCodes?.[0] || '';
  testData.truckingType = row.conditions?.truckingTypes?.[0] || '';
  testData.baseRelationshipScore = 50;
  testResult.value = null;
  testResultVisible.value = false;
  testDialogVisible.value = true;
}

/** 执行测试 */
async function handleRunTest() {
  testing.value = true;
  try {
    const response = await schedulingRuleApi.testExecute(testData);
    testResult.value = response.data;
    testResultVisible.value = true;
  } catch (error) {
    ElMessage.error('测试执行失败');
  } finally {
    testing.value = false;
  }
}

/** 关闭对话框 */
function handleDialogClose() {
  formRef.value?.resetFields();
}

/** 格式化日期 */
function formatDate(date: string | undefined) {
  if (!date) return '-';
  return date.split('T')[0];
}

/** 获取规则类型标签 */
function getRuleTypeLabel(type: string) {
  const map: Record<string, string> = {
    WAREHOUSE_SCORING: '仓库评分',
    TRUCKING_SCORING: '车队评分',
    DATE_CALCULATION: '日期计算',
    CAPACITY_PLANNING: '能力规划',
    COST_ESTIMATION: '成本估算'
  };
  return map[type] || type;
}

// ==================== 生命周期 ====================

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.rule-management {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.priority-value {
  font-weight: 600;
  color: var(--el-color-primary);
}

.form-tip {
  margin-left: 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.bonus-config {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bonus-config .el-input-number {
  width: 80px;
}

.weight-value {
  margin-left: 10px;
  font-weight: 600;
  color: var(--el-color-primary);
}
</style>

<template>
  <div class="path-exception-panel">
    <!-- 超期预警 -->
    <el-alert
      v-if="isOverdue"
      type="error"
      :title="t('container.logisticsPath.overdueAlert.title')"
      :description="overdueText"
      show-icon
      class="overdue-alert"
    />

    <!-- 路径验证 -->
    <div v-if="validationResult" class="validation-inline-plain">
      <span :class="['validation-badge', validationResult.isValid ? 'valid' : 'invalid']">
        {{
          validationResult.isValid
            ? t('container.logisticsPath.validation.passed')
            : t('container.logisticsPath.validation.failed')
        }}
      </span>
      <template v-if="validationResult.errors?.length">
        <span class="validation-label"
          >{{ t('container.logisticsPath.validation.errors') }}：</span
        >
        <span class="validation-text validation-errors">{{
          validationResult.errors.join('；')
        }}</span>
      </template>
      <template v-if="validationResult.warnings?.length">
        <span class="validation-label"
          >{{ t('container.logisticsPath.validation.warnings') }}：</span
        >
        <span class="validation-text validation-warnings">{{
          validationResult.warnings.join('；')
        }}</span>
      </template>
      <el-tooltip placement="top" :show-after="300">
        <template #content>
          <div class="validation-tooltip">
            <p>
              <strong>{{ t('container.logisticsPath.validation.checks') }}：</strong>
            </p>
            <ul>
              <li>
                <strong>{{ t('container.logisticsPath.validation.passed') }}</strong
                >：{{ t('container.logisticsPath.validation.passedDescription') }}
              </li>
              <li>
                <strong>{{ t('container.logisticsPath.validation.failed') }}</strong
                >：{{ t('container.logisticsPath.validation.failedDescription') }}
              </li>
            </ul>
            <p>{{ t('container.logisticsPath.validation.purpose') }}</p>
          </div>
        </template>
        <el-icon class="validation-help-icon"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  isOverdue: boolean
  overdueText: string
  validationResult: { isValid: boolean; errors: string[]; warnings: string[] } | null
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.path-exception-panel {
  margin-bottom: $spacing-md;
}

.overdue-alert {
  margin-bottom: $spacing-lg;
}

.validation-inline-plain {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: $spacing-md;

  .validation-badge {
    font-weight: 600;

    &.valid {
      color: var(--el-color-success);
    }
    &.invalid {
      color: var(--el-color-danger);
    }
  }

  .validation-label {
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  .validation-text {
    &.validation-errors {
      color: var(--el-color-danger);
    }
    &.validation-warnings {
      color: var(--el-color-warning);
    }
  }

  .validation-help-icon {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    cursor: help;
    margin-left: 4px;
  }
}
</style>

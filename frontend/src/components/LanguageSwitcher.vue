<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown } from '@element-plus/icons-vue'
import { SUPPORTED_LANGUAGES, type Language } from '@/locales/types'
import { setLanguage } from '@/locales'

const { locale } = useI18n()

const showDropdown = ref(false)

const currentLanguage = computed(() => {
  return SUPPORTED_LANGUAGES[locale.value as Language]
})

const languageOptions = computed(() => {
  return Object.entries(SUPPORTED_LANGUAGES).map(([key, value]) => ({
    key: key as Language,
    ...value
  }))
})

const handleSelect = (lang: Language) => {
  setLanguage(lang)
  showDropdown.value = false
}
</script>

<template>
  <el-dropdown
    trigger="click"
    @command="handleSelect"
    @visible-change="showDropdown = $event"
  >
  <div class="language-switcher">
    <span class="language-icon">{{ currentLanguage.icon }}</span>
    <span class="language-text">{{ currentLanguage.name }}</span>
    <el-icon class="arrow-icon" :class="{ 'is-open': showDropdown }">
      <ArrowDown />
    </el-icon>
  </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="option in languageOptions"
          :key="option.key"
          :command="option.key"
          :class="{ 'is-active': locale === option.key }"
        >
          <span class="language-icon">{{ option.icon }}</span>
          <span class="language-name">{{ option.name }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.language-switcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: $nav-glass-bg;
  backdrop-filter: $nav-glass-blur;
  border: 1px solid $nav-glass-border;
  color: $nav-text-secondary;
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background: $nav-hover-bg;
    border-color: rgba(255, 255, 255, 0.2);
    color: $nav-text-primary;
  }

    .language-icon {
      font-size: 18px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
    }

  .language-text {
    line-height: 1.5;
  }

  .arrow-icon {
    font-size: 12px;
    color: $nav-text-muted;
    transition: transform 0.3s ease;

    &.is-open {
      transform: rotate(180deg);
    }
  }
}

:deep(.el-dropdown-menu) {
  background: rgba(15, 20, 40, 0.95) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(0, 212, 255, 0.2) !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
  padding: 6px !important;
  min-width: 160px !important;

  .el-dropdown-menu__item {
    padding: 10px 16px !important;
    border-radius: 6px !important;
    transition: all 0.3s ease !important;
    display: flex;
    align-items: center;
    gap: 10px;
    color: $nav-text-secondary;

    &:hover {
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(124, 58, 237, 0.15)) !important;
      color: $nav-text-primary !important;
    }

    &.is-active {
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.25), rgba(124, 58, 237, 0.25)) !important;
      color: $nav-accent-cyan !important;
      font-weight: 600;
    }

    .language-icon {
      font-size: 18px;
      line-height: 1;
    }

    .language-name {
      font-size: 14px;
    }
  }
}
</style>

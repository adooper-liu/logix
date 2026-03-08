# 🌍 LogiX 多语言使用指南

## 📋 目录

- [概述](#概述)
- [支持的语言](#支持的语言)
- [安装配置](#安装配置)
- [使用方法](#使用方法)
- [添加新的翻译](#添加新的翻译)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 概述

LogiX 项目使用 `vue-i18n` 实现多语言支持，目前支持简体中文、英文和日文。

### 核心特性

- **自动语言检测**：首次访问使用系统语言，之后记住用户选择
- **实时切换**：无需刷新页面，立即生效
- **持久化存储**：语言设置保存在 localStorage
- **Element Plus 集成**：UI 组件库自动跟随语言切换

## 支持的语言

| 语言代码 | 语言名称 | 国旗图标 |
|---------|---------|---------|
| `zh-CN` | 简体中文 | 🇨🇳 |
| `en-US` | English | 🇺🇸 |
| `ja-JP` | 日本語 | 🇯🇵 |
| `de-DE` | Deutsch | 🇩🇪 |
| `fr-FR` | Français | 🇫🇷 |
| `it-IT` | Italiano | 🇮🇹 |
| `es-ES` | Español | 🇪🇸 |

## 安装配置

### 1. 安装依赖

```bash
npm install vue-i18n@9
```

### 2. 目录结构

```
frontend/src/locales/
├── types.ts          # 类型定义和配置
├── index.ts          # i18n 配置入口
├── zh-CN.ts          # 简体中文翻译
├── en-US.ts          # 英文翻译
├── ja-JP.ts          # 日文翻译
├── de-DE.ts          # 德语翻译
├── fr-FR.ts          # 法语翻译
├── it-IT.ts          # 意大利语翻译
└── es-ES.ts          # 西班牙语翻译
```

### 3. 主入口配置

在 `main.ts` 中：

```typescript
import i18n from './locales'

app.use(i18n)
```

## 使用方法

### 1. 在模板中使用

```vue
<template>
  <div>
    <h1>{{ $t('common.appName') }}</h1>
    <p>{{ $t('common.slogan') }}</p>
  </div>
</template>
```

### 2. 在 Composition API 中使用

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const title = t('common.appName')
const slogan = t('common.slogan')
</script>
```

### 3. 带参数的翻译

```typescript
// 翻译文件
welcome: '欢迎回来，{name}'

// 使用
const message = t('user.welcome', { name: 'John' })
// 结果: "欢迎回来，John"
```

### 4. 复数形式

```typescript
// 翻译文件
total: '共 {count} 条'

// 使用
const text = t('common.total', { count: 10 })
// 结果: "共 10 条"
```

### 5. 使用语言切换器组件

```vue
<script setup lang="ts">
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
</script>

<template>
  <LanguageSwitcher />
</template>
```

## 添加新的翻译

### 1. 在翻译文件中添加

所有语言的翻译文件都需要保持相同的结构：

**zh-CN.ts**
```typescript
export default {
  common: {
    newKey: '新的翻译文本'
  }
}
```

**en-US.ts**
```typescript
export default {
  common: {
    newKey: 'New translated text'
  }
}
```

**ja-JP.ts**
```typescript
export default {
  common: {
    newKey: '新しい翻訳テキスト'
  }
}
```

### 2. 翻译键命名规范

- 使用嵌套结构组织翻译
- 使用小写字母和连字符：`mySection.myKey`
- 按功能模块分组：`nav.*`, `user.*`, `container.*`

**推荐结构**：
```typescript
export default {
  // 模块名作为顶级键
  moduleName: {
    category1: {
      key1: '翻译1',
      key2: '翻译2'
    },
    category2: {
      key3: '翻译3'
    }
  }
}
```

## 最佳实践

### 1. 翻译键设计

✅ **推荐**：
```typescript
container: {
  containerNumber: '集装箱号',
  containerType: '柜型'
}
```

❌ **不推荐**：
```typescript
containerNumber: '集装箱号',
containerType: '柜型'
```

### 2. 避免硬编码文本

✅ **推荐**：
```vue
<button>{{ $t('common.confirm') }}</button>
```

❌ **不推荐**：
```vue
<button>确认</button>
```

### 3. 文本拼接

✅ **推荐**：使用参数
```typescript
welcome: '欢迎回来，{name}'

// 使用
t('user.welcome', { name: userName })
```

❌ **不推荐**：手动拼接
```typescript
welcome: '欢迎回来，'

// 使用
t('user.welcome') + userName
```

### 4. 保持一致性

所有语言的翻译文件必须保持相同的键结构：

```typescript
// ✅ 正确：所有语言都有相同的键
// zh-CN.ts
{
  status: {
    pending: '待处理',
    completed: '已完成'
  }
}

// en-US.ts
{
  status: {
    pending: 'Pending',
    completed: 'Completed'
  }
}
```

### 5. 文本长度考虑

- 英文通常比中文长约 20-30%
- 日文可能比中文略长
- UI 设计时考虑文本溢出问题

### 6. 使用语义化键名

✅ **推荐**：使用描述性键名
```typescript
{
  validation: {
    required: '此项为必填项',
    email: '请输入有效的邮箱地址'
  }
}
```

❌ **不推荐**：使用通用键名
```typescript
{
  error1: '此项为必填项',
  error2: '请输入有效的邮箱地址'
}
```

## 常见问题

### Q1: 如何添加新的语言？

1. 在 `locales/types.ts` 中添加语言配置（更新 `Language` 类型和 `SUPPORTED_LANGUAGES`）
2. 创建新的翻译文件 `xx-XX.ts`
3. 在 `locales/index.ts` 中导入并注册（添加到 `messages` 对象）
4. 在 `locales/index.ts` 的 `getSavedLanguage` 函数中添加语言验证
5. 在 `main.ts` 中添加对应的 Element Plus 语言包
6. 在 `main.ts` 的 `elementPlusLocales` 对象中添加映射

### Q2: 翻译不生效怎么办？

检查以下几点：
1. 翻译键是否正确（区分大小写）
2. 翻译文件是否正确导入
3. 语言代码是否匹配

### Q3: 如何调试翻译？

在浏览器控制台中：

```javascript
// 查看当前语言
console.log(i18n.global.locale.value)

// 查看所有翻译
console.log(i18n.global.messages.value)

// 查看特定翻译
console.log(i18n.global.t('common.appName'))
```

### Q4: Element Plus 组件没有翻译？

确保在 `main.ts` 中正确配置了语言监听：

```typescript
watch(
  () => i18n.global.locale.value,
  (newLocale) => {
    const lang = newLocale as Language
    if (elementPlusLocales[lang]) {
      ElementPlus.locale(elementPlusLocales[lang])
    }
  }
)
```

### Q5: 如何翻译动态数据？

使用参数化翻译：

```typescript
// 翻译文件
itemCount: '共 {count} 个项目'

// 使用
const message = t('list.itemCount', { count: items.length })
```

## 附录

### 翻译键速查表

| 分类 | 示例键 | 说明 |
|-----|-------|------|
| 通用 | `common.*` | 通用文本（按钮、标签等） |
| 导航 | `nav.*` | 导航菜单 |
| 用户 | `user.*` | 用户相关 |
| 验证 | `validation.*` | 表单验证消息 |
| 错误 | `error.*` | 错误提示 |
| 时间 | `time.*` | 时间相关 |

### 相关文件

- `frontend/src/locales/` - 翻译文件目录
- `frontend/src/components/LanguageSwitcher.vue` - 语言切换组件
- `frontend/src/main.ts` - i18n 配置入口

---

**最后更新**: 2026-02-28

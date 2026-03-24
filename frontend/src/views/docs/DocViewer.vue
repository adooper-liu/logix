<template>
  <div class="doc-viewer-container">
    <div v-if="loading" class="loading-state">
      <el-icon class="loading-icon" :size="40"><Loading /></el-icon>
      <p>正在加载文档...</p>
    </div>
    <div v-else-if="error" class="error-state">
      <el-icon class="error-icon" :size="40"><CircleClose /></el-icon>
      <h2>文档加载失败</h2>
      <p>{{ error }}</p>
      <el-button type="primary" @click="goBack">返回</el-button>
    </div>
    <div v-else class="doc-content">
      <el-button class="back-button" type="default" @click="goBack">
        ← {{ fromPath ? '返回' : '返回帮助文档' }}
      </el-button>
      <MarkdownRenderer :content="markdownContent" @navigate-to-doc="handleDocNavigation" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loading, CircleClose } from '@element-plus/icons-vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const route = useRoute()
const router = useRouter()

const markdownContent = ref('')
const loading = ref(true)
const error = ref('')

// 来源页面路径（用于返回）
const fromPath = ref<string | null>(null)

// 加载文档
const loadDoc = async (docPath: string) => {
  loading.value = true
  error.value = ''

  try {
    console.log('[DocViewer] Loading document:', docPath)

    const response = await fetch(docPath, {
      method: 'GET',
      headers: {
        'Accept': 'text/markdown; charset=utf-8, text/plain; charset=utf-8, */*'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const markdownText = await response.text()

    if (!markdownText || !markdownText.trim()) {
      throw new Error('文档内容为空')
    }

    // 检查是否返回的是 HTML 而不是 Markdown
    if (markdownText.includes('<!DOCTYPE html>') || markdownText.includes('<html')) {
      throw new Error('文件路径错误，返回了 HTML 而不是 Markdown 文件')
    }

    markdownContent.value = markdownText
    console.log('[DocViewer] Document loaded successfully')
  } catch (err: any) {
    console.error('[DocViewer] Failed to load document:', err)
    error.value = err.message || '未知错误'
  } finally {
    loading.value = false
  }
}

// 处理文档链接导航
const handleDocNavigation = (url: string) => {
  console.log('[DocViewer] Handling navigation to:', url)

  // 获取当前文档的目录路径（用于相对路径解析）
  const currentPath = route.fullPath.replace('/#', '').replace('#', '')
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'))

  // 转换相对路径为绝对路径
  let fullPath = url
  if (url.startsWith('./')) {
    // 相对路径：从当前目录开始
    fullPath = `${currentDir}/${url.substring(2)}`
  } else if (!url.startsWith('/')) {
    // 无前缀路径：从 /docs 开始
    fullPath = `/docs/${url}`
  } else if (!url.startsWith('/docs/')) {
    // 绝对路径但不是 /docs/ 开头
    fullPath = `/docs${url}`
  }

  console.log('[DocViewer] Resolved fullPath:', fullPath, 'from currentDir:', currentDir)

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })

  // 加载新文档
  loadDoc(fullPath)
}

// 返回上一页
const goBack = () => {
  // 如果有来源页面路径，返回来源页面；否则返回帮助文档
  if (fromPath.value) {
    console.log('[DocViewer] Returning to source page:', fromPath.value)
    router.push(fromPath.value)
  } else {
    console.log('[DocViewer] No source page, returning to help docs')
    router.push('/help')
  }
}

onMounted(() => {
  const fullPath = route.fullPath
  console.log('[DocViewer] Mounted with fullPath:', fullPath)

  // 保存来源页面路径（从 route.query.from 获取）
  if (route.query.from && typeof route.query.from === 'string') {
    fromPath.value = route.query.from
    console.log('[DocViewer] Source page:', fromPath.value)
  }

  // 如果是 hash 模式，去掉 # 前缀
  const docPath = fullPath.startsWith('#') ? fullPath.substring(1) : fullPath

  console.log('[DocViewer] Loading document from path:', docPath)
  loadDoc(docPath)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.doc-viewer-container {
  min-height: calc(100vh - 64px);
  background: $bg-color;
  padding: 20px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;

  .loading-icon,
  .error-icon {
    color: $primary-color;
    margin-bottom: 15px;
  }

  .error-icon {
    color: $danger-color;
  }

  h2 {
    color: $text-primary;
    margin-bottom: 10px;
    font-size: 1.4rem;
  }

  p {
    color: $text-regular;
    margin-bottom: 20px;
  }
}

.doc-content {
  max-width: 900px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: 20px;
}
</style>

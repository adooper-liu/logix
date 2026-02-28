<template>
  <div class="markdown-renderer" v-html="renderedHtml" @navigate-to-doc="handleNavigate"></div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 定义事件，用于通知父组件加载新文档
const emit = defineEmits<{
  navigateToDoc: [url: string]
}>()

// 处理自定义事件
const handleNavigate = (event: any) => {
  console.log('捕获到导航事件:', event.detail)
  emit('navigateToDoc', event.detail.url)
}

// 组件挂载时监听全局事件
onMounted(() => {
  window.addEventListener('navigate-to-doc', (event: any) => {
    console.log('捕获到导航事件:', event.detail)
    emit('navigateToDoc', event.detail.url)
  })
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('navigate-to-doc', () => {})
})

// 调试：监听 content 变化
watch(() => props.content, (newContent) => {
  console.log('MarkdownRenderer 接收到内容，长度:', newContent?.length)
  console.log('内容前100字符:', newContent?.substring(0, 100))
}, { immediate: true })

// Markdown 解析器
const parseMarkdown = (markdown: string): string => {
  let html = markdown

  // 保存代码块
  const codeBlocks: string[] = []
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code)}</code></pre>`)
    return `__CODEBLOCK_${codeBlocks.length - 1}__`
  })

  // 保存链接和图片（在转义 HTML 之前，处理带有粗体/斜体标记的链接）
  const links: { html: string; placeholder: string }[] = []
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const htmlContent = `<img src="${url}" alt="${alt}" style="max-width: 100%; border-radius: 8px; margin: 15px 0;">`
    const placeholder = `__LINK_IMG_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })

  // 判断是否是内部锚点链接
  const isInternalAnchor = (url: string): boolean => {
    return url.startsWith('#') && !url.startsWith('#/')
  }

  // 判断是否是 Markdown 文档链接
  const isMarkdownDoc = (url: string): boolean => {
    return url.endsWith('.md') || url.startsWith('/docs/')
  }

  // 处理格式化的链接（先处理粗体包裹的链接）
  html = html.replace(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const isMd = isMarkdownDoc(url)
    let htmlContent = ''
    if (isAnchor) {
      htmlContent = `<strong><a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a></strong>`
    } else if (isMd) {
      htmlContent = `<strong><a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('navigate-to-doc', { detail: { url: '${url}' } }))">${text}</a></strong>`
    } else {
      htmlContent = `<strong><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></strong>`
    }
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })
  // 处理斜体包裹的链接
  html = html.replace(/\*\[([^\]]+)\]\(([^)]+)\)\*/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const isMd = isMarkdownDoc(url)
    let htmlContent = ''
    if (isAnchor) {
      htmlContent = `<em><a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a></em>`
    } else if (isMd) {
      htmlContent = `<em><a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('navigate-to-doc', { detail: { url: '${url}' } }))">${text}</a></em>`
    } else {
      htmlContent = `<em><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></em>`
    }
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })
  // 处理下划线包裹的链接
  html = html.replace(/_\[([^\]]+)\]\(([^)]+)\)_/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const isMd = isMarkdownDoc(url)
    let htmlContent = ''
    if (isAnchor) {
      htmlContent = `<em><a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a></em>`
    } else if (isMd) {
      htmlContent = `<em><a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('navigate-to-doc', { detail: { url: '${url}' } }))">${text}</a></em>`
    } else {
      htmlContent = `<em><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></em>`
    }
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })
  // 处理普通链接（必须在粗体/斜体处理之后）
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const isMd = isMarkdownDoc(url)
    let htmlContent = ''
    if (isAnchor) {
      htmlContent = `<a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a>`
    } else if (isMd) {
      htmlContent = `<a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('navigate-to-doc', { detail: { url: '${url}' } }))">${text}</a>`
    } else {
      htmlContent = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
    }
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })

  // 转义 HTML
  html = escapeHtml(html)

  // 还原代码块
  html = html.replace(/__CODEBLOCK_(\d+)__/g, (_match, index) => codeBlocks[index])

  // 还原链接和图片
  links.forEach((link) => {
    html = html.replace(link.placeholder, link.html)
  })

  // 处理标题（添加 id 以支持锚点跳转）
  html = html.replace(/^######\s+(.+)$/gm, '<h6 id="$1">$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 id="$1">$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4 id="$1">$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3 id="$1">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 id="$1">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 id="$1">$1</h1>')

  // 处理引用
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')

  // 处理行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 处理粗体（使用更精确的正则，避免匹配到链接）
  html = html.replace(/\*\*([^*_]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^*_]+)__/g, '<strong>$1</strong>')

  // 处理斜体（确保不在链接或URL中匹配）
  html = html.replace(/\b\*([^*_]+)\*\b/g, '<em>$1</em>')
  html = html.replace(/\b_([^*_]+)_\b/g, '<em>$1</em>')

  // 处理表格
  const tablePattern = /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g
  let tableMatch
  while ((tableMatch = tablePattern.exec(html)) !== null) {
    const fullTable = tableMatch[0]
    const lines = fullTable.trim().split('\n')
    const header = parseTableRow(lines[0])
    const rows = lines.slice(2).map(line => parseTableRow(line))

    const tableHtml = `
      <div style="overflow-x: auto; margin: 20px 0;">
        <table>
          <thead>${header}</thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    `
    html = html.replace(fullTable, tableHtml)
  }

  // 处理无序列表
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[^<]*<\/li>\n?)+/g, '<ul>$&</ul>')

  // 处理有序列表
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[^<]*<\/li>\n?)+/g, '<ol>$&</ol>')

  // 处理水平线
  html = html.replace(/^---$/gm, '<hr style="margin: 20px 0; border: none; border-top: 2px solid #e9ecef;">')

  // 处理段落
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}

// HTML 转义
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 解析表格行
const parseTableRow = (line: string): string => {
  const cells = line.split('|').slice(1, -1)
  const tag = line.includes('---') ? 'th' : 'td'
  return `<tr>${cells.map(cell => `<${tag}>${cell.trim()}</${tag}>`).join('')}</tr>`
}

const renderedHtml = computed(() => {
  if (!props.content) return ''
  return parseMarkdown(props.content)
})
</script>

<style scoped lang="scss">
.markdown-renderer {
  line-height: 1.8;

  :deep(h1) {
    color: #2c3e50;
    font-size: 2rem;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e9ecef;
  }

  :deep(h2) {
    color: #2c3e50;
    font-size: 1.5rem;
    margin: 30px 0 15px 0;
    padding-left: 15px;
    border-left: 4px solid #667eea;
  }

  :deep(h3) {
    color: #495057;
    font-size: 1.2rem;
    margin: 25px 0 10px 0;
  }

  :deep(h4),
  :deep(h5),
  :deep(h6) {
    color: #495057;
    margin: 20px 0 10px 0;
  }

  :deep(p) {
    color: #495057;
    margin-bottom: 15px;
  }

  :deep(code) {
    background: #f8f9fa;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    color: #2c3e50;
  }

  :deep(pre) {
    background: #2c3e50;
    color: #f8f9fa;
    padding: 20px;
    border-radius: 10px;
    overflow-x: auto;
    margin-bottom: 20px;
  }

  :deep(pre code) {
    background: transparent;
    padding: 0;
    color: #f8f9fa;
    font-family: 'Courier New', monospace;
  }

  :deep(blockquote) {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 15px 20px;
    margin: 20px 0;
    border-radius: 0 10px 10px 0;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    background: white;

    th {
      background: #667eea;
      color: white;
      padding: 12px;
      text-align: left;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
    }

    tr:hover {
      background: #f8f9fa;
    }
  }

  :deep(a) {
    color: #667eea;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(ul),
  :deep(ol) {
    color: #495057;
    margin: 15px 0;
    padding-left: 30px;
  }

  :deep(li) {
    color: #495057;
    margin: 8px 0;
    line-height: 1.6;
  }

  :deep(ul) {
    list-style-type: disc;
  }

  :deep(ol) {
    list-style-type: decimal;
  }

  :deep(pre ul),
  :deep(pre ol),
  :deep(pre li) {
    color: #f8f9fa;
  }

  :deep(hr) {
    margin: 20px 0;
  }
}
</style>

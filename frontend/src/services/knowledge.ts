import { api } from './api'

// 知识库条目类型
export interface KnowledgeItem {
  id: string
  category: string
  title: string
  keywords: string[]
  content: string
}

// 知识库API响应
export interface KnowledgeResponse {
  success: boolean
  data?: {
    categories?: string[]
    totalItems?: number
    category?: string
    items?: KnowledgeItem[]
    keyword?: string
    results?: string[]
  }
  error?: string
}

// 知识库服务
export const knowledgeService = {
  // 获取所有类别
  async getCategories() {
    return api.get<KnowledgeResponse>('/ai/knowledge')
  },

  // 按类别获取知识
  async getByCategory(category: string) {
    return api.get<KnowledgeResponse>('/ai/knowledge', {
      params: { category },
    })
  },

  // 搜索知识
  async search(keyword: string) {
    return api.get<KnowledgeResponse>('/ai/knowledge', {
      params: { keyword },
    })
  },

  // 导出为模板代码
  exportAsCode(items: KnowledgeItem[]): string {
    const code = `/**
 * AI 知识库
 * AI Knowledge Base
 * 
 * 物流系统业务知识，供 AI 对话时检索使用
 */

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
}

export const knowledgeBase: KnowledgeItem[] = [
${items
  .map(
    item => `  // ==================== ${item.category} ====================
  {
    id: '${item.id}',
    category: '${item.category}',
    title: '${item.title}',
    keywords: ${JSON.stringify(item.keywords, null, 6).replace(/\n/g, '\n    ')},
    content: \`${item.content}\`
  }`
  )
  .join(',\n\n')}
];`

    return code
  },
}

export default knowledgeService

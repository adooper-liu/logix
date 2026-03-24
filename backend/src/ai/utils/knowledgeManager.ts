/**
 * 知识库管理器
 * Knowledge Base Manager
 *
 * 管理知识库的自动更新、导入和导出
 */

import { logger } from '../../utils/logger';
import { KnowledgeItem, knowledgeBase } from '../data/knowledgeBase';
import fs from 'fs';
import path from 'path';

/**
 * 知识库更新选项
 */
export interface KnowledgeUpdateOptions {
  sources?: string[]; // 数据源列表
  schedule?: string; // 调度表达式
  autoMerge?: boolean; // 是否自动合并
  backupBeforeUpdate?: boolean; // 更新前是否备份
}

/**
 * 知识库管理器类
 */
export class KnowledgeManager {
  private knowledgeBasePath: string;
  private lastUpdateTime: Date | null = null;
  private updateOptions: KnowledgeUpdateOptions;

  constructor(options?: KnowledgeUpdateOptions) {
    this.knowledgeBasePath = path.join(__dirname, '../data/knowledgeBase.ts');
    this.updateOptions = {
      autoMerge: true,
      backupBeforeUpdate: true,
      ...options
    };
  }

  /**
   * 获取当前知识库
   */
  getKnowledgeBase(): KnowledgeItem[] {
    return knowledgeBase;
  }

  /**
   * 更新知识库
   */
  async updateKnowledgeBase(items: KnowledgeItem[]): Promise<boolean> {
    try {
      // 备份当前知识库
      if (this.updateOptions.backupBeforeUpdate) {
        await this.backupKnowledgeBase();
      }

      // 生成新的知识库文件内容
      const content = this.generateKnowledgeBaseContent(items);

      // 写入文件
      fs.writeFileSync(this.knowledgeBasePath, content, 'utf8');

      // 更新最后更新时间
      this.lastUpdateTime = new Date();

      logger.info(`[KnowledgeManager] Knowledge base updated successfully: ${items.length} items`);
      return true;
    } catch (error: any) {
      logger.error('[KnowledgeManager] Error updating knowledge base:', error);
      return false;
    }
  }

  /**
   * 合并知识库
   */
  async mergeKnowledgeBase(newItems: KnowledgeItem[]): Promise<boolean> {
    try {
      // 获取当前知识库
      const currentItems = this.getKnowledgeBase();

      // 创建ID映射
      const currentItemMap = new Map<string, KnowledgeItem>();
      currentItems.forEach(item => currentItemMap.set(item.id, item));

      // 合并新条目
      const mergedItems: KnowledgeItem[] = [...currentItems];

      for (const newItem of newItems) {
        if (currentItemMap.has(newItem.id)) {
          // 更新现有条目
          const index = mergedItems.findIndex(item => item.id === newItem.id);
          if (index >= 0) {
            mergedItems[index] = newItem;
          }
        } else {
          // 添加新条目
          mergedItems.push(newItem);
        }
      }

      // 更新知识库
      return this.updateKnowledgeBase(mergedItems);
    } catch (error: any) {
      logger.error('[KnowledgeManager] Error merging knowledge base:', error);
      return false;
    }
  }

  /**
   * 从文件导入知识库
   */
  async importFromFile(filePath: string): Promise<boolean> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // 提取知识库数组
      const match = content.match(/export const knowledgeBase: KnowledgeItem\[\] = \[(.*?)\];/s);
      if (!match) {
        throw new Error('Invalid knowledge base file format');
      }

      // 解析内容
      const itemsContent = match[1];
      const items = this.parseKnowledgeItems(itemsContent);

      // 更新知识库
      return this.updateKnowledgeBase(items);
    } catch (error: any) {
      logger.error('[KnowledgeManager] Error importing knowledge base from file:', error);
      return false;
    }
  }

  /**
   * 从API导入知识库
   */
  async importFromApi(apiUrl: string): Promise<boolean> {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = (await response.json()) as { items?: unknown };
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid API response format');
      }

      // 更新知识库
      return this.updateKnowledgeBase(data.items);
    } catch (error: any) {
      logger.error('[KnowledgeManager] Error importing knowledge base from API:', error);
      return false;
    }
  }

  /**
   * 导出知识库到文件
   */
  async exportToFile(filePath: string): Promise<boolean> {
    try {
      const items = this.getKnowledgeBase();
      const content = this.generateKnowledgeBaseContent(items);

      fs.writeFileSync(filePath, content, 'utf8');
      logger.info(`[KnowledgeManager] Knowledge base exported to: ${filePath}`);
      return true;
    } catch (error: any) {
      logger.error('[KnowledgeManager] Error exporting knowledge base:', error);
      return false;
    }
  }

  /**
   * 备份知识库
   */
  private async backupKnowledgeBase(): Promise<boolean> {
    try {
      const backupPath = `${this.knowledgeBasePath}.backup.${Date.now()}`;
      fs.copyFileSync(this.knowledgeBasePath, backupPath);
      logger.info(`[KnowledgeManager] Knowledge base backed up to: ${backupPath}`);
      return true;
    } catch (error: any) {
      logger.error('[KnowledgeManager] Error backing up knowledge base:', error);
      return false;
    }
  }

  /**
   * 生成知识库文件内容
   */
  private generateKnowledgeBaseContent(items: KnowledgeItem[]): string {
    const itemsContent = items.map(item => {
      const keywordsArray = item.keywords.map(k => `'${k}'`).join(', ');
      return `  {
    id: '${item.id}',
    category: '${item.category}',
    title: '${item.title}',
    keywords: [${keywordsArray}],
    content: \`${item.content}\`
  }`;
    }).join(',\n\n');

    return `/**
 * AI 知识库
 * AI Knowledge Base
 * 
 * 存储物流系统的业务知识，供 AI 对话时检索使用
 * 自动更新时间: ${new Date().toISOString()}
 */

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
}

export const knowledgeBase: KnowledgeItem[] = [
${itemsContent}
];

/**
 * 知识库检索
 */
export function searchKnowledge(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const results: { item: KnowledgeItem; score: number }[] = [];

  for (const item of knowledgeBase) {
    let score = 0;

    // 标题完全匹配
    if (item.title.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // 关键词匹配
    for (const keyword of item.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // 内容包含
    if (item.content.toLowerCase().includes(lowerQuery)) {
      score += 1;
    }

    if (score > 0) {
      results.push({ item, score });
    }
  }

  // 按分数排序，返回前5个最相关的
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5).map(r => r.item.content);
}
`;
  }

  /**
   * 解析知识库条目
   */
  private parseKnowledgeItems(content: string): KnowledgeItem[] {
    // 简单的解析逻辑，实际项目中可能需要更复杂的解析
    const items: KnowledgeItem[] = [];
    const itemMatches = content.match(/\{[\s\S]*?\}/g);

    if (itemMatches) {
      for (const match of itemMatches) {
        try {
          // 提取各个字段
          const idMatch = match.match(/id:\s*'([^']+)'/);
          const categoryMatch = match.match(/category:\s*'([^']+)'/);
          const titleMatch = match.match(/title:\s*'([^']+)'/);
          const keywordsMatch = match.match(/keywords:\s*\[(.*?)\]/s);
          const contentMatch = match.match(/content:\s*\\`([\s\S]*?)\\`/s);

          if (idMatch && categoryMatch && titleMatch && keywordsMatch && contentMatch) {
            const id = idMatch[1];
            const category = categoryMatch[1];
            const title = titleMatch[1];

            // 解析关键词
            const keywordsStr = keywordsMatch[1];
            const keywords = keywordsStr
              .split(',')
              .map(k => k.trim().replace(/^'|'$/g, ''))
              .filter(k => k);

            const content = contentMatch[1];

            items.push({
              id,
              category,
              title,
              keywords,
              content
            });
          }
        } catch (error) {
          logger.warn('[KnowledgeManager] Error parsing knowledge item:', error);
        }
      }
    }

    return items;
  }

  /**
   * 获取知识库统计信息
   */
  getStatistics(): {
    totalItems: number;
    categories: string[];
    itemsByCategory: Record<string, number>;
    lastUpdateTime: Date | null;
  } {
    const items = this.getKnowledgeBase();
    const categories = new Set<string>();
    const itemsByCategory: Record<string, number> = {};

    items.forEach(item => {
      categories.add(item.category);
      itemsByCategory[item.category] = (itemsByCategory[item.category] || 0) + 1;
    });

    return {
      totalItems: items.length,
      categories: Array.from(categories),
      itemsByCategory,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  /**
   * 清理知识库（移除重复项）
   */
  async cleanupKnowledgeBase(): Promise<boolean> {
    try {
      const items = this.getKnowledgeBase();
      const uniqueItems = this.removeDuplicates(items);

      if (uniqueItems.length !== items.length) {
        return this.updateKnowledgeBase(uniqueItems);
      }

      return true;
    } catch (error: any) {
      logger.error('[KnowledgeManager] Error cleaning up knowledge base:', error);
      return false;
    }
  }

  /**
   * 移除重复项
   */
  private removeDuplicates(items: KnowledgeItem[]): KnowledgeItem[] {
    const uniqueMap = new Map<string, KnowledgeItem>();
    items.forEach(item => uniqueMap.set(item.id, item));
    return Array.from(uniqueMap.values());
  }
}

/**
 * 默认知识库管理器实例
 */
export const knowledgeManager = new KnowledgeManager();

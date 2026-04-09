/**
 * AI 配置管理器
 * AI Configuration Manager
 * 
 * 支持多种 AI 提供商的动态切换：
 * - SiliconFlow (硅基流动)
 * - Ollama Local (本地部署)
 * - Ollama Cloud (云端服务)
 */

import { ModelConfig } from '../types';
import { SiliconFlowAdapter } from '../adapters/SiliconFlowAdapter';
import { OllamaAdapter, createOllamaAdapter, OllamaMode } from '../adapters/OllamaAdapter';
import { logger } from '../../utils/logger';

export type AIProvider = 'siliconflow' | 'ollama-local' | 'ollama-cloud';

export interface AIProviderConfig {
  provider: AIProvider;
  enabled: boolean;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export class AIConfigManager {
  private static instance: AIConfigManager;
  private currentProvider: AIProvider;
  private providers: Map<AIProvider, AIProviderConfig>;
  
  // 适配器实例缓存
  private adapters: Map<AIProvider, any> = new Map();

  private constructor() {
    // 从环境变量读取当前提供商
    this.currentProvider = (process.env.AI_PROVIDER as AIProvider) || 'siliconflow';
    
    // 初始化提供商配置
    this.providers = new Map([
      ['siliconflow', {
        provider: 'siliconflow',
        enabled: !!process.env.SILICON_FLOW_API_KEY,
        model: process.env.SILICON_FLOW_MODEL || 'deepseek-ai/DeepSeek-V2-Chat',
        apiKey: process.env.SILICON_FLOW_API_KEY,
        baseUrl: process.env.SILICON_FLOW_BASE_URL,
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 60000
      }],
      ['ollama-local', {
        provider: 'ollama-local',
        enabled: true, // 本地模式默认启用（无需 API Key）
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        baseUrl: process.env.OLLAMA_LOCAL_BASE_URL || 'http://localhost:11434',
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 60000
      }],
      ['ollama-cloud', {
        provider: 'ollama-cloud',
        enabled: !!(process.env.OLLAMA_CLOUD_API_KEY || process.env.OLLAMA_API_KEY),
        model: process.env.OLLAMA_CLOUD_MODEL || 'llama3.2',
        apiKey: process.env.OLLAMA_CLOUD_API_KEY || process.env.OLLAMA_API_KEY,
        baseUrl: process.env.OLLAMA_CLOUD_BASE_URL || 'https://ollama.ai/api',
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 60000
      }]
    ]);

    logger.info(`[AIConfig] Initialized with provider: ${this.currentProvider}`);
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  /**
   * 获取当前提供商
   */
  getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  /**
   * 设置当前提供商
   */
  setCurrentProvider(provider: AIProvider): void {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    if (!config.enabled) {
      throw new Error(`Provider ${provider} is not configured or disabled`);
    }

    this.currentProvider = provider;
    // 清除适配器缓存，下次使用时重新创建
    this.adapters.clear();
    
    logger.info(`[AIConfig] Switched to provider: ${provider}`);
  }

  /**
   * 获取所有可用的提供商列表
   */
  getAvailableProviders(): Array<{
    provider: AIProvider;
    name: string;
    enabled: boolean;
    model: string;
    isCurrent: boolean;
  }> {
    const providerNames: Record<AIProvider, string> = {
      'siliconflow': 'SiliconFlow (硅基流动)',
      'ollama-local': 'Ollama Local (本地)',
      'ollama-cloud': 'Ollama Cloud (云端)'
    };

    return Array.from(this.providers.entries()).map(([key, config]) => ({
      provider: key,
      name: providerNames[key],
      enabled: config.enabled,
      model: config.model,
      isCurrent: key === this.currentProvider
    }));
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(provider?: AIProvider): AIProviderConfig | undefined {
    const key = provider || this.currentProvider;
    return this.providers.get(key);
  }

  /**
   * 更新提供商配置
   */
  updateProviderConfig(provider: AIProvider, updates: Partial<AIProviderConfig>): void {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // 更新配置
    Object.assign(config, updates);
    
    // 如果禁用了当前提供商，自动切换到其他可用的
    if (!updates.enabled && provider === this.currentProvider) {
      const available = this.getAvailableProviders().find(p => p.enabled && p.provider !== provider);
      if (available) {
        this.currentProvider = available.provider;
        logger.warn(`[AIConfig] Current provider disabled, switched to: ${available.provider}`);
      }
    }

    // 清除适配器缓存
    this.adapters.delete(provider);
    
    logger.info(`[AIConfig] Updated config for provider: ${provider}`);
  }

  /**
   * 获取当前适配器实例（带缓存）
   */
  getCurrentAdapter(): SiliconFlowAdapter | OllamaAdapter {
    // 检查缓存
    if (this.adapters.has(this.currentProvider)) {
      return this.adapters.get(this.currentProvider);
    }

    const config = this.providers.get(this.currentProvider);
    if (!config) {
      throw new Error(`No configuration for provider: ${this.currentProvider}`);
    }

    let adapter: SiliconFlowAdapter | OllamaAdapter;

    if (this.currentProvider === 'siliconflow') {
      adapter = new SiliconFlowAdapter({
        provider: 'siliconflow',
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      });
    } else if (this.currentProvider === 'ollama-local') {
      adapter = createOllamaAdapter({
        mode: 'local',
        model: config.model,
        baseUrl: config.baseUrl,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        timeout: config.timeout
      });
    } else if (this.currentProvider === 'ollama-cloud') {
      adapter = createOllamaAdapter({
        mode: 'cloud',
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        timeout: config.timeout
      });
    } else {
      throw new Error(`Unsupported provider: ${this.currentProvider}`);
    }

    // 缓存适配器
    this.adapters.set(this.currentProvider, adapter);
    
    return adapter;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'ready' | 'missing_api_key' | 'missing_config' | 'error';
    provider: string;
    model: string;
    hasApiKey: boolean;
    availableProviders: Array<{
      provider: AIProvider;
      name: string;
      enabled: boolean;
      isCurrent: boolean;
    }>;
  }> {
    const config = this.providers.get(this.currentProvider);
    if (!config) {
      return {
        status: 'error',
        provider: this.currentProvider,
        model: '',
        hasApiKey: false,
        availableProviders: this.getAvailableProviders()
      };
    }

    // 根据不同提供商进行健康检查
    try {
      if (this.currentProvider === 'siliconflow') {
        const hasApiKey = !!config.apiKey;
        return {
          status: hasApiKey ? 'ready' : 'missing_api_key',
          provider: 'siliconflow',
          model: config.model,
          hasApiKey,
          availableProviders: this.getAvailableProviders()
        };
      } else if (this.currentProvider.startsWith('ollama')) {
        const adapter = this.getCurrentAdapter() as OllamaAdapter;
        const health = await adapter.healthCheck();
        
        return {
          status: health.status,
          provider: `ollama-${health.mode}`,
          model: health.model,
          hasApiKey: health.hasApiKey,
          availableProviders: this.getAvailableProviders()
        };
      }
    } catch (error: any) {
      logger.error('[AIConfig] Health check error:', error);
      return {
        status: 'error',
        provider: this.currentProvider,
        model: config.model,
        hasApiKey: false,
        availableProviders: this.getAvailableProviders()
      };
    }

    // 默认返回
    return {
      status: 'error',
      provider: this.currentProvider,
      model: config.model,
      hasApiKey: false,
      availableProviders: this.getAvailableProviders()
    };
  }
}

// 导出单例
export const aiConfigManager = AIConfigManager.getInstance();

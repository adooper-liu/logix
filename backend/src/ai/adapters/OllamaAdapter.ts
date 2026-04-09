/**
 * Ollama 模型适配器
 * Ollama Model Adapter
 *
 * 支持 Ollama 本地部署和 Ollama Cloud
 * 文档: https://docs.ollama.com/cloud#javascript
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { ChatMessage, ExecutionResult, ModelConfig } from '../types';

export type OllamaMode = 'local' | 'cloud';

export interface OllamaConfig extends ModelConfig {
  mode: OllamaMode;
  baseUrl?: string; // 本地模式: http://localhost:11434, Cloud 模式: https://ollama.ai/api
  timeout?: number; // 请求超时时间（毫秒）
}

export class OllamaAdapter {
  private client: AxiosInstance;
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;

    // 根据模式设置 baseURL
    let baseUrl: string;
    if (config.mode === 'cloud') {
      baseUrl = config.baseUrl || process.env.OLLAMA_CLOUD_BASE_URL || 'https://ollama.ai/api';
    } else {
      baseUrl = config.baseUrl || process.env.OLLAMA_LOCAL_BASE_URL || 'http://localhost:11434';
    }

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
        // Cloud 模式需要 API Key
        ...(config.mode === 'cloud' && config.apiKey
          ? { Authorization: `Bearer ${config.apiKey}` }
          : {})
      }
    });
  }

  /**
   * 聊天完成
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
      max_tokens?: number;
    }
  ): Promise<ExecutionResult> {
    try {
      const startTime = Date.now();

      // Ollama API 格式与 OpenAI 略有不同
      const response = await this.client.post('/api/chat', {
        model: (options?.model ?? this.config.model) || 'llama3.2',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        options: {
          temperature: options?.temperature ?? this.config.temperature ?? 0.7,
          num_predict: options?.max_tokens ?? options?.maxTokens ?? this.config.maxTokens ?? 4096
        },
        stream: false
      });

      const executionTime = Date.now() - startTime;

      if (response.data?.message?.content) {
        return {
          success: true,
          result: response.data.message.content,
          executionTime
        };
      }

      return {
        success: false,
        error: 'Invalid response format'
      };
    } catch (error: any) {
      logger.error('[OllamaAdapter] Chat error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * 流式聊天完成
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncGenerator<string> {
    try {
      const response = await this.client.post(
        '/api/chat',
        {
          model: this.config.model || 'llama3.2',
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          options: {
            temperature: options?.temperature ?? this.config.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? this.config.maxTokens ?? 4096
          },
          stream: true
        },
        {
          responseType: 'stream'
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
            if (parsed.done) return;
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (error: any) {
      logger.error('[OllamaAdapter] Stream error:', error.message);
      yield `Error: ${error.message}`;
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels(): Promise<ExecutionResult> {
    try {
      const response = await this.client.get('/api/tags');

      // Ollama 返回格式: { models: [{ name: 'llama3.2', ... }] }
      const models =
        response.data.models?.map((m: any) => ({
          id: m.name,
          name: m.name,
          created: m.modified_at,
          owned_by: 'ollama'
        })) || [];

      return {
        success: true,
        result: models
      };
    } catch (error: any) {
      logger.error('[OllamaAdapter] List models error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'ready' | 'missing_config' | 'error';
    provider: string;
    model: string;
    hasApiKey: boolean;
    mode: OllamaMode;
  }> {
    try {
      const hasApiKey = !!(this.config.apiKey || process.env.OLLAMA_CLOUD_API_KEY);
      const hasBaseUrl = !!(
        this.config.baseUrl ||
        (this.config.mode === 'cloud'
          ? process.env.OLLAMA_CLOUD_BASE_URL
          : process.env.OLLAMA_LOCAL_BASE_URL)
      );

      if (!hasBaseUrl) {
        return {
          status: 'missing_config',
          provider: 'ollama',
          model: this.config.model || 'llama3.2',
          hasApiKey: this.config.mode === 'cloud' ? hasApiKey : true,
          mode: this.config.mode
        };
      }

      // 尝试连接
      await this.listModels();

      return {
        status: 'ready',
        provider: 'ollama',
        model: this.config.model || 'llama3.2',
        hasApiKey: this.config.mode === 'cloud' ? hasApiKey : true,
        mode: this.config.mode
      };
    } catch (error: any) {
      logger.error('[OllamaAdapter] Health check error:', error.message);
      return {
        status: 'error',
        provider: 'ollama',
        model: this.config.model || 'llama3.2',
        hasApiKey: false,
        mode: this.config.mode
      };
    }
  }
}

// 导出单例工厂函数
export function createOllamaAdapter(config?: Partial<OllamaConfig>): OllamaAdapter {
  const mode = config?.mode || (process.env.OLLAMA_MODE as OllamaMode) || 'local';

  const fullConfig: OllamaConfig = {
    provider: 'ollama',
    mode,
    model: config?.model || process.env.OLLAMA_MODEL || 'llama3.2',
    apiKey: config?.apiKey || process.env.OLLAMA_CLOUD_API_KEY || process.env.OLLAMA_API_KEY,
    baseUrl: config?.baseUrl,
    temperature: config?.temperature || 0.7,
    maxTokens: config?.maxTokens || 4096,
    timeout: config?.timeout || 60000
  };

  return new OllamaAdapter(fullConfig);
}

// 默认导出（本地模式）
export const ollamaAdapter = createOllamaAdapter();

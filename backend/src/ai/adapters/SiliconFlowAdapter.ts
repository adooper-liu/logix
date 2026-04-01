/**
 * 硅基流动模型适配器
 * SiliconFlow Model Adapter
 *
 * 支持 DeepSeek、Qwen、Yi 等国产大模型
 */

import axios, { AxiosInstance } from 'axios';
import { ChatMessage, ModelConfig, ExecutionResult } from '../types';
import { logger } from '../../utils/logger';

export class SiliconFlowAdapter {
  private client: AxiosInstance;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL:
        config.baseUrl || process.env.SILICON_FLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${config.apiKey || process.env.SILICON_FLOW_API_KEY}`,
        'Content-Type': 'application/json'
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

      const response = await this.client.post('/chat/completions', {
        model: (options?.model ?? this.config.model) || 'deepseek-ai/DeepSeek-V2-Chat',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? options?.maxTokens ?? this.config.maxTokens ?? 4096,
        stream: false
      });

      const executionTime = Date.now() - startTime;

      if (response.data?.choices?.[0]?.message) {
        return {
          success: true,
          result: response.data.choices[0].message.content,
          executionTime
        };
      }

      return {
        success: false,
        error: 'Invalid response format'
      };
    } catch (error: any) {
      logger.error('[SiliconFlowAdapter] Chat error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
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
        '/chat/completions',
        {
          model: this.config.model || 'deepseek-ai/DeepSeek-V2-Chat',
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: options?.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 4096,
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error: any) {
      logger.error('[SiliconFlowAdapter] Stream error:', error.message);
      yield `Error: ${error.message}`;
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels(): Promise<ExecutionResult> {
    try {
      const response = await this.client.get('/models');
      return {
        success: true,
        result: response.data.data
      };
    } catch (error: any) {
      logger.error('[SiliconFlowAdapter] List models error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 文本嵌入
   */
  async embed(texts: string[], model?: string): Promise<ExecutionResult> {
    try {
      const response = await this.client.post('/embeddings', {
        model: model || 'BAAI/bge-large-zh-v1.5',
        input: texts
      });

      if (response.data?.data) {
        return {
          success: true,
          result: response.data.data.map((item: any) => item.embedding)
        };
      }

      return {
        success: false,
        error: 'Invalid response format'
      };
    } catch (error: any) {
      logger.error('[SiliconFlowAdapter] Embed error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * 默认硅基流动适配器实例
 */
let defaultAdapter: SiliconFlowAdapter | null = null;

export function getSiliconFlowAdapter(): SiliconFlowAdapter {
  if (!defaultAdapter) {
    defaultAdapter = new SiliconFlowAdapter({
      provider: 'siliconflow',
      model: process.env.SILICON_FLOW_MODEL || 'deepseek-ai/DeepSeek-V2-Chat'
    });
  }
  return defaultAdapter;
}

export const siliconFlowAdapter = new SiliconFlowAdapter({
  provider: 'siliconflow',
  model: process.env.SILICON_FLOW_MODEL || 'deepseek-ai/DeepSeek-V2-Chat'
});

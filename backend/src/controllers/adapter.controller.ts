/**
 * 适配器控制器
 * Adapter Controller
 *
 * 处理外部数据适配器相关的HTTP请求
 */

import { Request, Response } from 'express';
import { log } from '../utils/logger.js';
import { adapterManager, ExternalDataSource } from '../adapters/index.js';

/**
 * 适配器控制器类
 */
export class AdapterController {
  /**
   * 获取所有适配器状态
   */
  async getAdapterStatus(req: Request, res: Response) {
    try {
      const status = adapterManager.getAdapterStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date(),
      });
    } catch (error) {
      log.error('Get Adapter Status Error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * 健康检查所有适配器
   */
  async healthCheck(req: Request, res: Response) {
    try {
      await adapterManager.healthCheck();
      const status = adapterManager.getAdapterStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date(),
      });
    } catch (error) {
      log.error('Adapter Health Check Error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * 设置默认适配器
   */
  async setDefaultAdapter(req: Request, res: Response) {
    try {
      const { sourceType } = req.params;

      if (!sourceType) {
        return res.status(400).json({
          success: false,
          error: 'sourceType is required',
          timestamp: new Date(),
        });
      }

      adapterManager.setDefaultAdapter(sourceType as ExternalDataSource);
      res.json({
        success: true,
        data: { defaultAdapter: sourceType },
        timestamp: new Date(),
      });
    } catch (error) {
      log.error('Set Default Adapter Error:', { error: error instanceof Error ? error.message : error });
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * 启用/禁用适配器
   */
  async setAdapterEnabled(req: Request, res: Response) {
    try {
      const { sourceType } = req.params;
      const { enabled } = req.body;

      if (!sourceType || enabled === undefined) {
        return res.status(400).json({
          success: false,
          error: 'sourceType and enabled are required',
          timestamp: new Date(),
        });
      }

      adapterManager.setAdapterEnabled(sourceType as ExternalDataSource, enabled);
      res.json({
        success: true,
        data: { sourceType, enabled },
        timestamp: new Date(),
      });
    } catch (error) {
      log.error('Set Adapter Enabled Error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * 根据集装箱号获取状态节点（使用适配器）
   */
  async getContainerStatusEvents(req: Request, res: Response) {
    try {
      const { containerNumber } = req.params;
      const { sourceType } = req.query;

      if (!containerNumber) {
        return res.status(400).json({
          success: false,
          error: 'containerNumber is required',
          timestamp: new Date(),
        });
      }

      const result = await adapterManager.getContainerStatusEvents(
        containerNumber,
        sourceType as ExternalDataSource
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          timestamp: result.timestamp,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          source: result.source,
          timestamp: result.timestamp,
        });
      }
    } catch (error) {
      log.error('Get Container Status Events Error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * 同步集装箱数据
   */
  async syncContainerData(req: Request, res: Response) {
    try {
      const { containerNumber } = req.params;
      const { sourceType } = req.body;

      if (!containerNumber) {
        return res.status(400).json({
          success: false,
          error: 'containerNumber is required',
          timestamp: new Date(),
        });
      }

      const result = await adapterManager.syncContainerData(
        containerNumber,
        sourceType as ExternalDataSource
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          timestamp: result.timestamp,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          source: result.source,
          timestamp: result.timestamp,
        });
      }
    } catch (error) {
      log.error('Sync Container Data Error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * 处理Webhook
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const { sourceType } = req.params;
      const payload = req.body;

      if (!sourceType) {
        return res.status(400).json({
          success: false,
          error: 'sourceType is required',
          timestamp: new Date(),
        });
      }

      const result = await adapterManager.handleWebhook(payload, sourceType as ExternalDataSource);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          timestamp: result.timestamp,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: result.timestamp,
        });
      }
    } catch (error) {
      log.error('Handle Webhook Error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }
}

// 导出单例实例
export const adapterController = new AdapterController();

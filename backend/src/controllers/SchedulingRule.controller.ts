/**
 * 规则管理 API 控制器
 * Rule Management API Controller
 */

import { Request, Response } from 'express';
import {
  CreateRuleDto,
  UpdateRuleDto,
  QueryRulesDto,
  QueryRuleHistoryDto,
  ExecuteRuleTestDto,
  RuleListResponseDto,
  ExecuteRuleResponseDto
} from '../dto/SchedulingRule.dto';
import { RuleEngineService, RuleExecutionContext } from '../services/RuleEngineService';
import { SchedulingRule } from '../entities/SchedulingRule.entities';
import { logger } from '../utils/logger';

export class SchedulingRuleController {
  private ruleEngine: RuleEngineService;

  constructor() {
    this.ruleEngine = RuleEngineService.getInstance();
  }

  // ========== 规则 CRUD ==========

  /**
   * 创建规则
   */
  createRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: CreateRuleDto = req.body;
      logger.info(`[RuleController] Creating rule: ${dto.ruleCode}`);
      
      const createdBy = (req as any).user?.username || 'system';
      const rule = await this.ruleEngine.createRule(dto as any, createdBy);
      
      res.status(201).json(rule);
    } catch (error) {
      logger.error('[RuleController] Failed to create rule:', error);
      res.status(500).json({ error: 'Failed to create rule' });
    }
  };

  /**
   * 更新规则
   */
  updateRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = req.params.ruleId;
      const dto: UpdateRuleDto = req.body;
      logger.info(`[RuleController] Updating rule: ${ruleId}`);
      
      const updatedBy = (req as any).user?.username || 'system';
      const rule = await this.ruleEngine.updateRule(ruleId, dto as any, updatedBy);
      
      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }
      
      res.json(rule);
    } catch (error) {
      logger.error('[RuleController] Failed to update rule:', error);
      res.status(500).json({ error: 'Failed to update rule' });
    }
  };

  /**
   * 删除规则
   */
  deleteRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = req.params.ruleId;
      logger.info(`[RuleController] Deleting rule: ${ruleId}`);
      
      const deletedBy = (req as any).user?.username || 'system';
      const success = await this.ruleEngine.deleteRule(ruleId, deletedBy);
      
      res.json({ success });
    } catch (error) {
      logger.error('[RuleController] Failed to delete rule:', error);
      res.status(500).json({ error: 'Failed to delete rule' });
    }
  };

  /**
   * 查询规则列表
   */
  queryRules = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const applyTo = req.query.applyTo as string;
      const ruleType = req.query.ruleType as string;
      const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
      const keyword = req.query.keyword as string;

      const rules = await this.ruleEngine.getActiveRules(applyTo);

      // 应用过滤器
      let filteredRules = rules;
      if (ruleType) {
        filteredRules = filteredRules.filter(r => r.ruleType === ruleType);
      }
      if (isActive !== undefined) {
        filteredRules = filteredRules.filter(r => r.isActive === isActive);
      }
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        filteredRules = filteredRules.filter(
          r =>
            r.ruleName.toLowerCase().includes(lowerKeyword) ||
            r.ruleCode.toLowerCase().includes(lowerKeyword) ||
            r.ruleDescription?.toLowerCase().includes(lowerKeyword)
        );
      }

      // 分页
      const total = filteredRules.length;
      const start = (page - 1) * pageSize;
      const items = filteredRules.slice(start, start + pageSize);

      const response: RuleListResponseDto = {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };

      res.json(response);
    } catch (error) {
      logger.error('[RuleController] Failed to query rules:', error);
      res.status(500).json({ error: 'Failed to query rules' });
    }
  };

  /**
   * 获取所有启用的规则
   */
  getActiveRules = async (req: Request, res: Response): Promise<void> => {
    try {
      const applyTo = req.query.applyTo as string | undefined;
      const rules = await this.ruleEngine.getActiveRules(applyTo);
      res.json(rules);
    } catch (error) {
      logger.error('[RuleController] Failed to get active rules:', error);
      res.status(500).json({ error: 'Failed to get active rules' });
    }
  };

  /**
   * 获取规则详情
   */
  getRuleById = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = req.params.ruleId;
      const rules = await this.ruleEngine.getActiveRules();
      const rule = rules.find(r => r.ruleId === ruleId) || null;
      
      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }
      
      res.json(rule);
    } catch (error) {
      logger.error('[RuleController] Failed to get rule by ID:', error);
      res.status(500).json({ error: 'Failed to get rule by ID' });
    }
  };

  /**
   * 获取规则变更历史
   */
  getRuleHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = req.params.ruleId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = await this.ruleEngine.getRuleHistory(ruleId, limit);
      res.json(history);
    } catch (error) {
      logger.error('[RuleController] Failed to get rule history:', error);
      res.status(500).json({ error: 'Failed to get rule history' });
    }
  };

  // ========== 规则状态管理 ==========

  /**
   * 激活规则
   */
  activateRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = req.params.ruleId;
      const updatedBy = (req as any).user?.username || 'system';
      const rule = await this.ruleEngine.updateRule(
        ruleId,
        { isActive: true } as any,
        updatedBy,
        '手动激活'
      );
      
      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }
      
      res.json(rule);
    } catch (error) {
      logger.error('[RuleController] Failed to activate rule:', error);
      res.status(500).json({ error: 'Failed to activate rule' });
    }
  };

  /**
   * 停用规则
   */
  deactivateRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const ruleId = req.params.ruleId;
      const updatedBy = (req as any).user?.username || 'system';
      const rule = await this.ruleEngine.updateRule(
        ruleId,
        { isActive: false } as any,
        updatedBy,
        '手动停用'
      );
      
      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }
      
      res.json(rule);
    } catch (error) {
      logger.error('[RuleController] Failed to deactivate rule:', error);
      res.status(500).json({ error: 'Failed to deactivate rule' });
    }
  };

  /**
   * 重新加载规则缓存
   */
  reloadRules = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ruleEngine.reloadRules();
      res.json({ success: true, message: '规则缓存已重新加载' });
    } catch (error) {
      logger.error('[RuleController] Failed to reload rules:', error);
      res.status(500).json({ error: 'Failed to reload rules' });
    }
  };

  // ========== 规则测试 ==========

  /**
   * 测试规则执行（用于调试）
   */
  testExecuteRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: ExecuteRuleTestDto = req.body;
      
      const context: RuleExecutionContext = {
        executionId: dto.executionId,
        countryCode: dto.countryCode,
        portCode: dto.portCode,
        warehouseCode: dto.warehouseCode,
        warehouseType: dto.warehouseType,
        truckingCode: dto.truckingCode,
        truckingType: dto.truckingType,
        baseScores: {
          cost: dto.baseCostScore ?? 50,
          capacity: dto.baseCapacityScore ?? 50,
          relationship: dto.baseRelationshipScore ?? 50
        }
      };

      const result = await this.ruleEngine.executeRules(context);

      const response: ExecuteRuleResponseDto = {
        matchedRule: result.matchedRule
          ? {
              ruleId: result.matchedRule.ruleId,
              ruleCode: result.matchedRule.ruleCode,
              ruleName: result.matchedRule.ruleName,
              priority: result.matchedRule.priority
            }
          : null,
        appliedActions: result.matchedRule?.actions,
        originalScores: {
          cost: dto.baseCostScore ?? 50,
          capacity: dto.baseCapacityScore ?? 50,
          relationship: dto.baseRelationshipScore ?? 50
        },
        adjustedScores: {
          cost: result.adjustedScores.cost ?? 0,
          capacity: result.adjustedScores.capacity ?? 0,
          relationship: result.adjustedScores.relationship ?? 0,
          weights: {
            cost: result.adjustedScores.weights?.cost ?? 0.4,
            capacity: result.adjustedScores.weights?.capacity ?? 0.3,
            relationship: result.adjustedScores.weights?.relationship ?? 0.3
          }
        },
        executionTimeMs: result.executionTimeMs
      };

      res.json(response);
    } catch (error) {
      logger.error('[RuleController] Failed to test execute rule:', error);
      res.status(500).json({ error: 'Failed to test execute rule' });
    }
  };
}

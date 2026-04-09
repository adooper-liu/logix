import { Router } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { Country } from '../entities/Country';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { InspectionRecord } from '../entities/InspectionRecord';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { CostService } from '../services/costService';
import { DemurrageService } from '../services/demurrage.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 创建 CostController 及其依赖链
 * 与项目其他路由风格一致：显式初始化所有 Repository 和服务
 */
function createCostController(): CostService {
  // 初始化 DemurrageService 所需的所有 Repository
  const standardRepo = AppDataSource.getRepository(ExtDemurrageStandard);
  const containerRepo = AppDataSource.getRepository(Container);
  const portOpRepo = AppDataSource.getRepository(PortOperation);
  const seaFreightRepo = AppDataSource.getRepository(SeaFreight);
  const truckingRepo = AppDataSource.getRepository(TruckingTransport);
  const emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);
  const orderRepo = AppDataSource.getRepository(ReplenishmentOrder);
  const countryRepo = AppDataSource.getRepository(Country);

  // 构造 DemurrageService
  const demurrageService = new DemurrageService(
    standardRepo,
    containerRepo,
    portOpRepo,
    seaFreightRepo,
    truckingRepo,
    emptyReturnRepo,
    orderRepo,
    countryRepo
  );

  // 初始化 InspectionRecord Repository
  const inspectionRepository = AppDataSource.getRepository(InspectionRecord);

  // 构造 CostService
  return new CostService(demurrageService, inspectionRepository);
}

// 单例模式：复用同一实例（与项目其他路由一致）
const costService = createCostController();

/**
 * 计算单个货柜的费用
 * GET /api/v1/costs/container/:containerNumber
 */
router.get('/container/:containerNumber', async (req, res) => {
  try {
    const { containerNumber } = req.params;
    const result = await costService.calculateContainerCosts(containerNumber);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('[CostRoute] calculateContainerCosts failed', {
      containerNumber: req.params.containerNumber,
      error
    });
    res.status(500).json({ success: false, message: error.message || '计算费用失败' });
  }
});

/**
 * 计算多个货柜的费用
 * POST /api/v1/costs/containers
 * Body: { containerNumbers: string[] }
 */
router.post('/containers', async (req, res) => {
  try {
    const { containerNumbers } = req.body;
    if (!containerNumbers || !Array.isArray(containerNumbers)) {
      return res.status(400).json({ success: false, message: 'containerNumbers 必须是非空数组' });
    }
    const results = await costService.calculateMultipleContainersCosts(containerNumbers);
    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error('[CostRoute] calculateMultipleContainersCosts failed', { error });
    res.status(500).json({ success: false, message: error.message || '批量计算费用失败' });
  }
});

/**
 * 获取费用汇总统计
 * GET /api/v1/costs/summary
 * Query: startDate, endDate, costType, containerNumbers
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate, costType, containerNumbers } = req.query;
    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      costType: costType as any,
      containerNumbers: containerNumbers ? (containerNumbers as string).split(',') : undefined
    };
    const summary = await costService.getCostSummary(filters);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    logger.error('[CostRoute] getCostSummary failed', { error });
    res.status(500).json({ success: false, message: error.message || '获取费用汇总失败' });
  }
});

export default router;

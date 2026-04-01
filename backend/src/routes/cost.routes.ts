import { Router } from 'express';
import { CostController } from '../controllers/costController';

const router = Router();
const costController = new CostController(
  // 这里需要注入CostService，实际应用中应该通过依赖注入
  // 暂时使用一个模拟的服务实例
  new (require('../services/costService').CostService)()
);

// 计算单个货柜的费用
router.get('/container/:containerNumber', (req, res) => {
  costController
    .calculateContainerCosts(req.params.containerNumber)
    .then((result) => res.json(result))
    .catch((error) => res.status(500).json({ success: false, message: error.message }));
});

// 计算多个货柜的费用
router.post('/containers', (req, res) => {
  costController
    .calculateMultipleContainersCosts(req.body.containerNumbers)
    .then((result) => res.json(result))
    .catch((error) => res.status(500).json({ success: false, message: error.message }));
});

// 获取费用汇总统计
router.get('/summary', (req, res) => {
  costController
    .getCostSummary(
      req.query.startDate as string,
      req.query.endDate as string,
      req.query.costType as string,
      req.query.containerNumbers as string
    )
    .then((result) => res.json(result))
    .catch((error) => res.status(500).json({ success: false, message: error.message }));
});

export default router;

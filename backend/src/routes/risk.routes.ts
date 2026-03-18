import { Router } from 'express';
import { RiskService } from '../services/riskService';

const router = Router();
const riskService = new RiskService();

// 获取货柜风险评估
router.get('/container/:containerNumber', async (req, res) => {
  try {
    const { containerNumber } = req.params;
    const riskAssessment = await riskService.getContainerRiskAssessment(containerNumber);
    if (riskAssessment) {
      res.json(riskAssessment);
    } else {
      res.status(404).json({ error: '货柜不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: '获取风险评估失败' });
  }
});

export default router;

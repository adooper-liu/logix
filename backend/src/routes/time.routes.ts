import { Router } from 'express';
import { TimeService } from '../services/timeService';

const router = Router();
const timeService = new TimeService();

// 获取货柜时间预测
router.get('/predict/:containerNumber', async (req, res) => {
  try {
    const { containerNumber } = req.params;
    const prediction = await timeService.getContainerTimePrediction(containerNumber);
    if (prediction) {
      res.json(prediction);
    } else {
      res.status(404).json({ error: '货柜不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: '获取时间预测失败' });
  }
});

export default router;

import { Router } from 'express';
import { AlertService } from '../services/alertService';

const router = Router();
const alertService = new AlertService();

// 获取货柜的预警列表
router.get('/container/:containerNumber', async (req, res) => {
  try {
    const { containerNumber } = req.params;
    const alerts = await alertService.getContainerAlerts(containerNumber);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: '获取预警列表失败' });
  }
});

// 获取所有预警列表
router.get('/', async (req, res) => {
  try {
    const { level, type, resolved } = req.query;
    const filters = {
      ...(level && { level: level as string }),
      ...(type && { type: type as string }),
      ...(resolved !== undefined && { resolved: resolved === 'true' })
    };
    const alerts = await alertService.getAllAlerts(filters);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: '获取预警列表失败' });
  }
});

// 确认预警
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.userId ?? 'system';
    const result = await alertService.acknowledgeAlert(Number(id), userId);
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: '确认预警失败' });
  }
});

// 解决预警
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.userId ?? 'system';
    const result = await alertService.resolveAlert(Number(id), userId);
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: '解决预警失败' });
  }
});

export default router;

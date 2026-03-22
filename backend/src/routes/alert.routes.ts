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

/** 手动全量检查并写入 ext_container_alerts（与定时任务逻辑相同） */
router.post('/run-check-all', async (_req, res) => {
  try {
    const alerts = await alertService.checkAllAlerts();
    res.json({ success: true, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: '批量预警检查失败' });
  }
});

/** 单箱检查并写入 ext_container_alerts */
router.post('/run-check/:containerNumber', async (req, res) => {
  try {
    const { containerNumber } = req.params;
    const alerts = await alertService.checkContainerAlerts(decodeURIComponent(containerNumber));
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ error: '单箱预警检查失败' });
  }
});

export default router;

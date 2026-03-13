import { Router } from 'express';
import { AlertController } from '../controllers/alertController';

const router = Router();
const alertController = new AlertController(
  // 这里需要注入AlertService，实际应用中应该通过依赖注入
  // 暂时使用一个模拟的服务实例
  new (require('../services/alertService').AlertService)()
);

// 获取单个货柜的预警
router.get('/container/:containerNumber', (req, res) => {
  alertController.getContainerAlerts(req.params.containerNumber)
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ success: false, message: error.message }));
});

// 获取所有预警
router.get('/', (req, res) => {
  alertController.getAllAlerts(
    req.query.level as string,
    req.query.type as string,
    req.query.resolved as string
  )
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ success: false, message: error.message }));
});

// 解决预警
router.post('/resolve/:alertId', (req, res) => {
  alertController.resolveAlert(parseInt(req.params.alertId))
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ success: false, message: error.message }));
});

export default router;

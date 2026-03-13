import { Router } from 'express';
import { FiveNodeController } from '../controllers/fiveNodeController';

const router = Router();
const fiveNodeController = new FiveNodeController(
  // 这里需要注入FiveNodeService，实际应用中应该通过依赖注入
  // 暂时使用一个模拟的服务实例
  new (require('../services/fiveNodeService').FiveNodeService)()
);

// 获取单个货柜的五节点信息
router.get('/container/:containerNumber', (req, res) => {
  fiveNodeController.getFiveNodeInfo(req.params.containerNumber)
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ success: false, message: error.message }));
});

// 获取所有货柜的五节点信息
router.get('/containers', (req, res) => {
  fiveNodeController.getAllFiveNodeInfo(
    req.query.startDate as string,
    req.query.endDate as string,
    req.query.status as string
  )
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ success: false, message: error.message }));
});

export default router;

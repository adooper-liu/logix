import { Router } from 'express';
import { FiveNodeController } from '../controllers/fiveNodeController';

const router = Router();
const fiveNodeController = new FiveNodeController();

// 获取单个货柜的五节点信息
router.get('/container/:containerNumber', (req, res) => {
  fiveNodeController.getFiveNodeInfo(req, res);
});

// 获取所有货柜的五节点信息（用于列表）
router.get('/', (req, res) => {
  fiveNodeController.getAllFiveNodeInfo(req, res);
});

export default router;

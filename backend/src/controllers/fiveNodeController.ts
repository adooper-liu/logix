import { Request, Response } from 'express';
import { FiveNodeService } from '../services/fiveNodeService';

export class FiveNodeController {
  private fiveNodeService: FiveNodeService;

  constructor() {
    this.fiveNodeService = new FiveNodeService();
  }

  // 获取单个货柜的五节点信息
  getFiveNodeInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const info = await this.fiveNodeService.getFiveNodeInfo(containerNumber);
      
      if (!info) {
        res.status(404).json({
          success: false,
          message: '货柜不存在',
        });
        return;
      }
      
      res.json({
        success: true,
        data: info,
      });
    } catch (error: any) {
      console.error('[FiveNodeController.getFiveNodeInfo] Error:', error);
      res.status(500).json({
        success: false,
        message: '获取五节点信息失败',
        error: error?.message,
      });
    }
  };

  // 获取所有货柜的五节点信息（用于列表）
  getAllFiveNodeInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, status } = req.query;
      
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string,
      };

      const infoList = await this.fiveNodeService.getAllFiveNodeInfo(filters);
      
      res.json({
        success: true,
        data: infoList,
      });
    } catch (error: any) {
      console.error('[FiveNodeController.getAllFiveNodeInfo] Error:', error);
      res.status(500).json({
        success: false,
        message: '获取五节点列表失败',
        error: error?.message,
      });
    }
  };
}

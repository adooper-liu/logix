/**
 * 查验记录路由
 * Inspection Records Routes
 */

import { Request, Response, Router } from 'express';
import { AppDataSource } from '../database/index.js';
import { InspectionEvent } from '../entities/InspectionEvent.js';
import { InspectionRecord } from '../entities/InspectionRecord.js';
import { InspectionService } from '../services/inspectionService.js';

const router = Router();

// 获取服务的辅助函数（每次请求时获取 repository）
const getInspectionService = () => {
  const inspectionRecordRepository = AppDataSource.getRepository(InspectionRecord);
  const inspectionEventRepository = AppDataSource.getRepository(InspectionEvent);
  return new InspectionService(inspectionRecordRepository, inspectionEventRepository);
};

// 路由定义
router.get('/container/:containerNumber', async (req: Request, res: Response) => {
  try {
    const service = getInspectionService();
    const record = await service.getByContainerNumber(req.params.containerNumber);
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/record', async (req: Request, res: Response) => {
  try {
    const service = getInspectionService();
    const result = await service.createOrUpdate(req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/event', async (req: Request, res: Response) => {
  try {
    const service = getInspectionService();
    const { inspectionRecordId, eventDate, eventStatus } = req.body;
    const result = await service.addEvent(inspectionRecordId, {
      eventDate: new Date(eventDate),
      eventStatus,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const service = getInspectionService();
    await service.deleteEvent(parseInt(req.params.eventId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/records', async (req: Request, res: Response) => {
  try {
    const service = getInspectionService();
    const sd = req.query.startDate as string | undefined;
    const ed = req.query.endDate as string | undefined;
    const result = await service.getAllRecords({
      startDate: sd ? new Date(sd) : undefined,
      endDate: ed ? new Date(ed) : undefined,
      customsClearanceStatus: req.query.customsClearanceStatus as string | undefined
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

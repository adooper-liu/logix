/**
 * 全球快递费规则 API 路由
 * Global Express Cost Rules API Routes
 */

import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { AppDataSource } from '../database';
import { ExpressCarrierService } from '../entities/ExpressCarrierService';
import { ExpressSurchargeRule } from '../entities/ExpressSurchargeRule';
import { ExpressSurchargeVersion } from '../entities/ExpressSurchargeVersion';
import { costEngineService } from '../services/costEngine.service';
import { expressRuleImportService } from '../services/expressRuleImport.service';
import { pricingImportService } from '../services/pricingImport.service';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * POST /api/v1/express-cost/import-excel
 * 上传 Excel 文件并导入规则
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Field: file (Excel file)
 *
 * Response (成功): HTTP 200, success true, data 含 versionId
 * 行级错误全回滚: HTTP 422, success false, data.errors 非空, versionId 无
 * 缺 Sheet/非法 Excel 结构: HTTP 400
 */
router.post('/import-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: '请上传 Excel 文件'
      });
      return;
    }

    // 验证文件类型
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        message: '仅支持 .xlsx 或 .xls 文件'
      });
      return;
    }

    logger.info('[ExpressCostAPI] 开始导入 Excel', {
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const usePhaseAPlusImport = !!workbook.Sheets.pricing_scheme;
    const result = usePhaseAPlusImport
      ? await pricingImportService.importFromExcel(req.file.buffer, req.file.originalname)
      : await expressRuleImportService.importFromExcel(req.file.buffer, req.file.originalname);

    // 行级错误导致单事务全量回滚时，import 服务仍 resolve，但 data.success=0 且带 errors
    if (result.success === 0 && result.errors.length > 0) {
      res.status(422).json({
        success: false,
        message: `导入未提交：行级错误 ${result.failed} 处，已全量回滚`,
        data: result
      });
      return;
    }

    res.json({
      success: true,
      message: `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
      data: result
    });
  } catch (error: any) {
    logger.error('[ExpressCostAPI] 导入失败:', error);
    // 缺少 Sheet、元数据非法等可视为请求体问题
    const msg = error?.message || '导入失败';
    const isClientPayload =
      typeof msg === 'string' &&
      (msg.includes('Excel 文件') || msg.includes('Sheet') || msg.includes('metadata'));
    res.status(isClientPayload ? 400 : 500).json({
      success: false,
      message: msg
    });
  }
});

/**
 * POST /api/v1/express-cost/calculate
 * 试算附加费
 *
 * Request Body:
 * {
 *   "countryCode": "US",
 *   "carrierServiceId": 1,
 *   "versionKey": "20260214", // 可选
 *   "longestIn": 50,
 *   "secondIn": 30,
 *   "shortestIn": 20,
 *   "grossWeightLbs": 40,
 *   "quantity": 1, // 可选
 *   "packagingType": "CARTON" // 可选
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "status": "OK",
 *     "baseFreight": 12.5,
 *     "charges": [...],
 *     "totalSurcharge": 4.87,
 *     "grandTotal": 17.37,
 *     "zoneCode": "Z3",
 *     "billableWeightLbs": 40,
 *     "volumeWeightLbs": 22
 *   }
 * }
 */
router.post('/calculate', async (req, res) => {
  try {
    const input = req.body || {};

    // 参数验证
    if (!input.countryCode || !input.carrierServiceId) {
      res.status(400).json({
        success: false,
        message: '缺少必填参数：countryCode, carrierServiceId'
      });
      return;
    }

    if (!input.longestIn || !input.secondIn || !input.shortestIn || !input.grossWeightLbs) {
      res.status(400).json({
        success: false,
        message: '缺少必填参数：longestIn, secondIn, shortestIn, grossWeightLbs'
      });
      return;
    }

    // Phase A+ 基础价扩展参数：三者要么都不传（仅附加费），要么都传（基础价+附加费）
    const hasAnyPricingSelector = !!(input.carrierCode || input.serviceCode || input.productLine);
    const hasAllPricingSelector = !!(input.carrierCode && input.serviceCode && input.productLine);
    if (hasAnyPricingSelector && !hasAllPricingSelector) {
      res.status(400).json({
        success: false,
        message: '基础价模式需同时提供：carrierCode, serviceCode, productLine'
      });
      return;
    }

    const result = await costEngineService.calculate(input);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('[ExpressCostAPI] 计算失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '计算失败'
    });
  }
});

/**
 * GET /api/v1/express-cost/versions
 * 获取所有可用版本列表
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "versionKey": "20260214",
 *       "sourceFileName": "全球快递费规则_20260214.xlsx",
 *       "effectiveFrom": "2026-02-14",
 *       "createdAt": "2026-04-23T10:00:00.000Z"
 *     }
 *   ]
 * }
 */
router.get('/versions', async (req, res) => {
  try {
    const versionRepo = AppDataSource.getRepository(ExpressSurchargeVersion);
    const versions = await versionRepo.find({
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      data: versions
    });
  } catch (error: any) {
    logger.error('[ExpressCostAPI] 查询版本失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '查询失败'
    });
  }
});

/**
 * GET /api/v1/express-cost/carriers
 * 获取某国别的承运商列表
 *
 * Query Params:
 * - countryCode: string (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "countryCode": "US",
 *       "serviceName": "FedEx Ground",
 *       "defaultLengthUnit": "in",
 *       "defaultWeightUnit": "lb"
 *     }
 *   ]
 * }
 */
router.get('/carriers', async (req, res) => {
  try {
    const { countryCode } = req.query;

    if (!countryCode) {
      res.status(400).json({
        success: false,
        message: '缺少 countryCode 参数'
      });
      return;
    }

    const carrierRepo = AppDataSource.getRepository(ExpressCarrierService);
    const carriers = await carrierRepo.find({
      where: {
        countryCode: String(countryCode),
        isActive: true
      },
      order: { serviceName: 'ASC' }
    });

    res.json({
      success: true,
      data: carriers
    });
  } catch (error: any) {
    logger.error('[ExpressCostAPI] 查询承运商失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '查询失败'
    });
  }
});

/**
 * GET /api/v1/express-cost/rules
 * 查询规则列表（支持筛选）
 *
 * Query Params:
 * - versionId: number (optional)
 * - countryCode: string (optional)
 * - carrierServiceId: number (optional)
 * - typeNormalized: string (optional)
 * - ingestCompleteness: string (optional)
 */
router.get('/rules', async (req, res) => {
  try {
    const { versionId, countryCode, carrierServiceId, typeNormalized, ingestCompleteness } =
      req.query;

    const ruleRepo = AppDataSource.getRepository(ExpressSurchargeRule);
    const queryBuilder = ruleRepo
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.version', 'version')
      .leftJoinAndSelect('rule.carrierService', 'carrierService')
      .orderBy('rule.id', 'ASC');

    if (versionId) {
      queryBuilder.andWhere('rule.versionId = :versionId', { versionId });
    }
    if (countryCode) {
      queryBuilder.andWhere('carrierService.countryCode = :countryCode', { countryCode });
    }
    if (carrierServiceId) {
      queryBuilder.andWhere('rule.carrierServiceId = :carrierServiceId', { carrierServiceId });
    }
    if (typeNormalized) {
      queryBuilder.andWhere('rule.typeNormalized = :typeNormalized', { typeNormalized });
    }
    if (ingestCompleteness) {
      queryBuilder.andWhere('rule.ingestCompleteness = :ingestCompleteness', {
        ingestCompleteness
      });
    }

    const rules = await queryBuilder.getMany();

    res.json({
      success: true,
      data: rules,
      total: rules.length
    });
  } catch (error: any) {
    logger.error('[ExpressCostAPI] 查询规则失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '查询失败'
    });
  }
});

export default router;

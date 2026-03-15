/**
 * AI 路由配置
 * AI Routes
 * 
 * AI 相关的 API 路由
 */

import { Router } from 'express';
import { aiController } from '../ai/controllers/ai.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: AI 对话
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: 用户消息
 *               context:
 *                 type: object
 *                 description: 上下文信息
 *     responses:
 *       200:
 *         description: AI 响应
 */
router.post('/chat', aiController.chat);

/**
 * @swagger
 * /api/v1/ai/text-to-sql:
 *   post:
 *     summary: Text-to-SQL
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: 自然语言查询
 *               tables:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 限制查询的表
 *               limit:
 *                 type: number
 *                 description: 返回行数限制
 *               execute:
 *                 type: boolean
 *                 description: 是否执行查询
 *     responses:
 *       200:
 *         description: SQL 查询结果
 */
router.post('/text-to-sql', aiController.textToSql);
router.post('/execute-sql', aiController.executeSql);

/**
 * @swagger
 * /api/v1/ai/tables:
 *   get:
 *     summary: 获取数据库表列表
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: 表列表
 */
router.get('/tables', aiController.getTables);

/**
 * @swagger
 * /api/v1/ai/tables/:tableName/columns:
 *   get:
 *     summary: 获取表的列信息
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 列信息
 */
router.get('/tables/:tableName/columns', aiController.getTableColumns);

/**
 * @swagger
 * /api/v1/ai/schema:
 *   get:
 *     summary: 获取完整数据库结构
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 数据库结构
 */
router.get('/schema', aiController.getSchema);

/**
 * @swagger
 * /api/v1/ai/validate-sql:
 *   post:
 *     summary: 验证 SQL 安全性
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sql:
 *                 type: string
 *     responses:
 *       200:
 *         description: 验证结果
 */
router.post('/validate-sql', aiController.validateSql);

/**
 * @swagger
 * /api/v1/ai/knowledge:
 *   get:
 *     summary: 获取知识库内容
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 知识类别
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 知识库内容
 */
router.get('/knowledge', aiController.getKnowledge);

/**
 * @swagger
 * /api/v1/ai/health:
 *   get:
 *     summary: 检查 AI 服务健康状态
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: 健康状态
 */
router.get('/health', aiController.health);

/**
 * @swagger
 * /api/v1/ai/stats/overview:
 *   get:
 *     summary: 获取业务概览统计
 *     tags: [AI Stats]
 *     responses:
 *       200:
 *         description: 概览统计
 */
router.get('/stats/overview', aiController.getStatsOverview);

/**
 * @swagger
 * /api/v1/ai/stats/status:
 *   get:
 *     summary: 按物流状态统计
 *     tags: [AI Stats]
 *     responses:
 *       200:
 *         description: 状态统计
 */
router.get('/stats/status', aiController.getStatsByStatus);

/**
 * @swagger
 * /api/v1/ai/stats/arrival:
 *   get:
 *     summary: 按到港统计
 *     tags: [AI Stats]
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 到港统计
 */
router.get('/stats/arrival', aiController.getStatsByArrival);

/**
 * @swagger
 * /api/v1/ai/stats/eta:
 *   get:
 *     summary: 按 ETA 统计
 *     tags: [AI Stats]
 *     responses:
 *       200:
 *         description: ETA统计
 */
router.get('/stats/eta', aiController.getStatsByETA);

/**
 * @swagger
 * /api/v1/ai/stats/last-free-date:
 *   get:
 *     summary: 按最晚提柜日统计
 *     tags: [AI Stats]
 *     responses:
 *       200:
 *         description: 最晚提柜日统计
 */
router.get('/stats/last-free-date', aiController.getStatsByLastFreeDate);

/**
 * @swagger
 * /api/v1/ai/stats/demurrage:
 *   get:
 *     summary: 滞港费概览
 *     tags: [AI Stats]
 *     responses:
 *       200:
 *         description: 滞港费统计
 */
router.get('/stats/demurrage', aiController.getStatsDemurrage);

/**
 * @swagger
 * /api/v1/ai/stats/shipping-company:
 *   get:
 *     summary: 按船公司统计
 *     tags: [AI Stats]
 *     responses:
 *       200:
 *         description: 船公司统计
 */
router.get('/stats/shipping-company', aiController.getStatsByShippingCompany);

/**
 * @swagger
 * /api/v1/ai/stats/destination-port:
 *   get:
 *     summary: 按目的港统计
 *     tags: [AI Stats]
 *     responses:
 *       200:
 *         description: 目的港统计
 */
router.get('/stats/destination-port', aiController.getStatsByDestinationPort);
router.get('/stats/country', aiController.getStatsByCountry);
router.get('/stats/freight-forwarder', aiController.getStatsByFreightForwarder);
router.get('/stats/container-type', aiController.getStatsByContainerType);
router.get('/stats/customs-status', aiController.getStatsByCustomsStatus);
router.get('/stats/transit-port', aiController.getStatsByTransitPort);
router.get('/stats/warehouse', aiController.getStatsByWarehouse);
router.get('/stats/demurrage-by-country', aiController.getStatsDemurrageByCountry);
router.get('/stats/demurrage-by-shipping-company', aiController.getStatsDemurrageByShippingCompany);
router.get('/stats/demurrage-by-port', aiController.getStatsDemurrageByPort);
router.get('/stats/pending-scheduling', aiController.getStatsPendingScheduling);
router.get('/stats/empty-return', aiController.getStatsEmptyReturn);
router.get('/stats/replenishment-order', aiController.getStatsByReplenishmentOrder);
router.get('/stats/trucking', aiController.getStatsTrucking);

/**
 * @swagger
 * /api/v1/ai/containers/search:
 *   get:
 *     summary: 搜索货柜
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: 货柜列表
 */
router.get('/containers/search', aiController.searchContainers);
router.get('/containers/pending-customs', aiController.getPendingCustomsContainers);
router.get('/alerts/demurrage', aiController.getDemurrageAlerts);

export default router;

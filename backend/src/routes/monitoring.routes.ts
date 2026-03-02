/**
 * 监控路由
 * Monitoring Routes
 */
import express from 'express'
import monitoringController from '../controllers/monitoring.controller'

const router = express.Router()

// 导出监控路由的所有端点
router.use('/', monitoringController)

export default router

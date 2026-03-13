/**
 * 字典列表控制器
 * 提供港口、船公司、货代、海外公司等字典的下拉数据（口径统一用）
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Port } from '../entities/Port';
import { ShippingCompany } from '../entities/ShippingCompany';
import { FreightForwarder } from '../entities/FreightForwarder';
import { OverseasCompany } from '../entities/OverseasCompany';
import { logger } from '../utils/logger';

export class DictController {
  /**
   * GET /api/v1/dict/ports
   * 港口列表（用于下拉选择，口径统一）
   */
  getPorts = async (_req: Request, res: Response): Promise<void> => {
    try {
      const repo = AppDataSource.getRepository(Port);
      const list = await repo.find({
        select: ['portCode', 'portName', 'portNameEn', 'country'],
        order: { portName: 'ASC' }
      });
      res.json({
        success: true,
        data: list.map((p) => ({
          code: p.portCode,
          name: p.portName,
          nameEn: p.portNameEn,
          country: p.country
        }))
      });
    } catch (error: any) {
      logger.error('[Dict] getPorts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/dict/shipping-companies
   * 船公司列表
   */
  getShippingCompanies = async (_req: Request, res: Response): Promise<void> => {
    try {
      const repo = AppDataSource.getRepository(ShippingCompany);
      const list = await repo.find({
        select: ['companyCode', 'companyName', 'companyNameEn'],
        order: { companyName: 'ASC' }
      });
      res.json({
        success: true,
        data: list.map((s) => ({
          code: s.companyCode,
          name: s.companyName,
          nameEn: s.companyNameEn
        }))
      });
    } catch (error: any) {
      logger.error('[Dict] getShippingCompanies error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/dict/freight-forwarders
   * 货代公司列表
   */
  getFreightForwarders = async (_req: Request, res: Response): Promise<void> => {
    try {
      const repo = AppDataSource.getRepository(FreightForwarder);
      const list = await repo.find({
        select: ['forwarderCode', 'forwarderName', 'forwarderNameEn'],
        order: { forwarderName: 'ASC' }
      });
      res.json({
        success: true,
        data: list.map((f) => ({
          code: f.forwarderCode,
          name: f.forwarderName,
          nameEn: f.forwarderNameEn
        }))
      });
    } catch (error: any) {
      logger.error('[Dict] getFreightForwarders error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/dict/overseas-companies
   * 海外公司列表（客户/境外公司）
   */
  getOverseasCompanies = async (_req: Request, res: Response): Promise<void> => {
    try {
      const repo = AppDataSource.getRepository(OverseasCompany);
      const list = await repo.find({
        select: ['companyCode', 'companyName', 'companyNameEn', 'country'],
        where: { isActive: true },
        order: { companyName: 'ASC' }
      });
      res.json({
        success: true,
        data: list.map((o) => ({
          code: o.companyCode,
          name: o.companyName,
          nameEn: o.companyNameEn,
          country: o.country
        }))
      });
    } catch (error: any) {
      logger.error('[Dict] getOverseasCompanies error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/dict/resolve-demurrage-codes
   * 根据名称解析四项匹配编码（导入时口径统一）
   * Body: { destination_port_name?, shipping_company_name?, origin_forwarder_name?, foreign_company_name? }
   * Returns: { destination_port_code?, shipping_company_code?, origin_forwarder_code?, foreign_company_code?, warnings? }
   */
  resolveDemurrageCodes = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body || {};
      const warnings: string[] = [];
      const result: Record<string, string | null> = {};

      const portName = body.destination_port_name?.trim() || body.destination_port_code?.trim();
      if (portName) {
        const portRepo = AppDataSource.getRepository(Port);
        const port = await portRepo
          .createQueryBuilder('p')
          .where('p.port_code = :v OR LOWER(TRIM(p.port_name)) = LOWER(:v) OR (p.port_name_en IS NOT NULL AND LOWER(TRIM(p.port_name_en)) = LOWER(:v))', {
            v: portName
          })
          .getOne();
        result.destination_port_code = port?.portCode ?? null;
        if (!port && portName) warnings.push(`目的港未匹配: ${portName}`);
      }

      const shipName = body.shipping_company_name?.trim() || body.shipping_company_code?.trim();
      if (shipName) {
        const shipRepo = AppDataSource.getRepository(ShippingCompany);
        const ship = await shipRepo
          .createQueryBuilder('s')
          .where('s.company_code = :v OR LOWER(TRIM(s.company_name)) = LOWER(:v) OR (s.company_name_en IS NOT NULL AND LOWER(TRIM(s.company_name_en)) = LOWER(:v))', {
            v: shipName
          })
          .getOne();
        result.shipping_company_code = ship?.companyCode ?? null;
        if (!ship && shipName) warnings.push(`船公司未匹配: ${shipName}`);
      }

      const forwarderName = body.origin_forwarder_name?.trim() || body.origin_forwarder_code?.trim();
      if (forwarderName) {
        const ffRepo = AppDataSource.getRepository(FreightForwarder);
        const ff = await ffRepo
          .createQueryBuilder('f')
          .where('f.forwarder_code = :v OR LOWER(TRIM(f.forwarder_name)) = LOWER(:v) OR (f.forwarder_name_en IS NOT NULL AND LOWER(TRIM(f.forwarder_name_en)) = LOWER(:v))', {
            v: forwarderName
          })
          .getOne();
        result.origin_forwarder_code = ff?.forwarderCode ?? null;
        if (!ff && forwarderName) warnings.push(`货代未匹配: ${forwarderName}`);
      }

      const foreignName = body.foreign_company_name?.trim() || body.foreign_company_code?.trim();
      if (foreignName) {
        const ocRepo = AppDataSource.getRepository(OverseasCompany);
        const oc = await ocRepo
          .createQueryBuilder('o')
          .where('o.company_code = :v OR LOWER(TRIM(o.company_name)) = LOWER(:v) OR (o.company_name_en IS NOT NULL AND LOWER(TRIM(o.company_name_en)) = LOWER(:v))', {
            v: foreignName
          })
          .getOne();
        result.foreign_company_code = oc?.companyCode ?? null;
        if (!oc && foreignName) warnings.push(`海外公司未匹配: ${foreignName}`);
      }

      res.json({
        success: true,
        data: result,
        warnings: warnings.length > 0 ? warnings : undefined
      });
    } catch (error: any) {
      logger.error('[Dict] resolveDemurrageCodes error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

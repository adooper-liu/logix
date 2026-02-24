/**
 * 客户类型字典控制器
 * Customer Type Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { CustomerType } from '../entities/CustomerType';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';

export class CustomerTypeController {
  private customerTypeRepository: Repository<CustomerType>;

  constructor() {
    this.customerTypeRepository = AppDataSource.getRepository(CustomerType);
  }

  /**
   * 获取所有客户类型
   * Get all customer types
   */
  getAllCustomerTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerTypes = await this.customerTypeRepository.find({
        order: { sortOrder: 'ASC', typeCode: 'ASC' },
        where: { isActive: true }
      });

      res.json({
        success: true,
        data: customerTypes
      });

      logger.info(`Retrieved ${customerTypes.length} customer types`);
    } catch (error) {
      logger.error('Failed to get customer types', error);
      res.status(500).json({
        success: false,
        message: '获取客户类型列表失败'
      });
    }
  };

  /**
   * 根据代码获取客户类型
   * Get customer type by code
   */
  getCustomerTypeByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const customerType = await this.customerTypeRepository.findOne({
        where: { typeCode: code }
      });

      if (!customerType) {
        res.status(404).json({
          success: false,
          message: '客户类型不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: customerType
      });
    } catch (error) {
      logger.error('Failed to get customer type', error);
      res.status(500).json({
        success: false,
        message: '获取客户类型信息失败'
      });
    }
  };

  /**
   * 创建客户类型
   * Create customer type
   */
  createCustomerType = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerTypeData = req.body;

      const customerType = this.customerTypeRepository.create(customerTypeData);
      const savedCustomerType = await this.customerTypeRepository.save(customerType);

      logger.info(`Customer type created: ${savedCustomerType.typeName} (${savedCustomerType.typeCode})`);

      res.status(201).json({
        success: true,
        data: savedCustomerType,
        message: '客户类型创建成功'
      });
    } catch (error) {
      logger.error('Failed to create customer type', error);
      res.status(500).json({
        success: false,
        message: '创建客户类型失败'
      });
    }
  };

  /**
   * 更新客户类型
   * Update customer type
   */
  updateCustomerType = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const updateData = req.body;

      const customerType = await this.customerTypeRepository.findOne({
        where: { typeCode: code }
      });

      if (!customerType) {
        res.status(404).json({
          success: false,
          message: '客户类型不存在'
        });
        return;
      }

      const updatedCustomerType = this.customerTypeRepository.merge(customerType, updateData);
      await this.customerTypeRepository.save(updatedCustomerType);

      logger.info(`Customer type updated: ${code}`);

      res.json({
        success: true,
        data: updatedCustomerType,
        message: '客户类型更新成功'
      });
    } catch (error) {
      logger.error('Failed to update customer type', error);
      res.status(500).json({
        success: false,
        message: '更新客户类型失败'
      });
    }
  };

  /**
   * 删除客户类型
   * Delete customer type
   */
  deleteCustomerType = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const customerType = await this.customerTypeRepository.findOne({
        where: { typeCode: code }
      });

      if (!customerType) {
        res.status(404).json({
          success: false,
          message: '客户类型不存在'
        });
        return;
      }

      await this.customerTypeRepository.remove(customerType);

      logger.info(`Customer type deleted: ${code}`);

      res.json({
        success: true,
        message: '客户类型删除成功'
      });
    } catch (error) {
      logger.error('Failed to delete customer type', error);
      res.status(500).json({
        success: false,
        message: '删除客户类型失败'
      });
    }
  };
}

/**
 * 客户控制器
 * Customer Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Customer } from '../entities/Customer';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';

export class CustomerController {
  private customerRepository: Repository<Customer>;

  constructor() {
    this.customerRepository = AppDataSource.getRepository(Customer);
  }

  /**
   * 获取客户列表
   * Get customers list
   */
  getCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, pageSize = 50, search = '', customerType, country, isActive } = req.query;

      const queryBuilder = this.customerRepository
        .createQueryBuilder('customer')
        .leftJoinAndSelect('customer.countryInfo', 'countryInfo')
        .leftJoinAndSelect('customer.customerTypeInfo', 'customerTypeInfo');

      // 搜索条件
      if (search) {
        queryBuilder.andWhere(
          '(customer.customerCode ILIKE :search OR customer.customerName ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (customerType) {
        queryBuilder.andWhere('customer.customerTypeCode = :customerType', { customerType });
      }

      if (country) {
        queryBuilder.andWhere('customer.country = :country', { country });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('customer.isActive = :isActive', { isActive: isActive === 'true' });
      }

      const [items, total] = await queryBuilder
        .orderBy('customer.createdAt', 'DESC')
        .skip((Number(page) - 1) * Number(pageSize))
        .take(Number(pageSize))
        .getManyAndCount();

      res.json({
        success: true,
        items,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });

      logger.info(`Retrieved ${items.length} customers`);
    } catch (error) {
      logger.error('Failed to get customers', error);
      res.status(500).json({
        success: false,
        message: '获取客户列表失败'
      });
    }
  };

  /**
   * 获取客户详情
   * Get customer details
   */
  getCustomerByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const customer = await this.customerRepository
        .createQueryBuilder('customer')
        .leftJoinAndSelect('customer.countryInfo', 'countryInfo')
        .leftJoinAndSelect('customer.customerTypeInfo', 'customerTypeInfo')
        .where('customer.customerCode = :code', { code })
        .getOne();

      if (!customer) {
        res.status(404).json({
          success: false,
          message: '客户不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      logger.error('Failed to get customer', error);
      res.status(500).json({
        success: false,
        message: '获取客户信息失败'
      });
    }
  };

  /**
   * 创建客户
   * Create customer
   */
  createCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerData = req.body;

      const customer = this.customerRepository.create(customerData);
      const savedCustomer = await this.customerRepository.save(customer);

      logger.info(`Customer created: ${savedCustomer.customerName} (${savedCustomer.customerCode})`);

      res.status(201).json({
        success: true,
        data: savedCustomer,
        message: '客户创建成功'
      });
    } catch (error) {
      logger.error('Failed to create customer', error);
      res.status(500).json({
        success: false,
        message: '创建客户失败'
      });
    }
  };

  /**
   * 更新客户
   * Update customer
   */
  updateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const updateData = req.body;

      const customer = await this.customerRepository.findOne({
        where: { customerCode: code }
      });

      if (!customer) {
        res.status(404).json({
          success: false,
          message: '客户不存在'
        });
        return;
      }

      const updatedCustomer = this.customerRepository.merge(customer, updateData);
      await this.customerRepository.save(updatedCustomer);

      logger.info(`Customer updated: ${code}`);

      res.json({
        success: true,
        data: updatedCustomer,
        message: '客户更新成功'
      });
    } catch (error) {
      logger.error('Failed to update customer', error);
      res.status(500).json({
        success: false,
        message: '更新客户失败'
      });
    }
  };

  /**
   * 删除客户
   * Delete customer
   */
  deleteCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const customer = await this.customerRepository.findOne({
        where: { customerCode: code }
      });

      if (!customer) {
        res.status(404).json({
          success: false,
          message: '客户不存在'
        });
        return;
      }

      await this.customerRepository.remove(customer);

      logger.info(`Customer deleted: ${code}`);

      res.json({
        success: true,
        message: '客户删除成功'
      });
    } catch (error) {
      logger.error('Failed to delete customer', error);
      res.status(500).json({
        success: false,
        message: '删除客户失败'
      });
    }
  };
}

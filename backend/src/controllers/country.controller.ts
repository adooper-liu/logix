/**
 * 国别字典控制器
 * Country Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Country } from '../entities/Country';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';

export class CountryController {
  private countryRepository: Repository<Country>;

  constructor() {
    this.countryRepository = AppDataSource.getRepository(Country);
  }

  /**
   * 获取所有国家列表
   * Get all countries
   */
  getAllCountries = async (req: Request, res: Response): Promise<void> => {
    try {
      const countries = await this.countryRepository.find({
        order: { sortOrder: 'ASC', code: 'ASC' },
        where: { isActive: true }
      });

      res.json({
        success: true,
        data: countries
      });

      logger.info(`Retrieved ${countries.length} countries`);
    } catch (error) {
      logger.error('Failed to get countries', error);
      res.status(500).json({
        success: false,
        message: '获取国家列表失败'
      });
    }
  };

  /**
   * 根据代码获取国家信息
   * Get country by code
   */
  getCountryByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const country = await this.countryRepository.findOne({
        where: { code }
      });

      if (!country) {
        res.status(404).json({
          success: false,
          message: '国家不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: country
      });
    } catch (error) {
      logger.error('Failed to get country', error);
      res.status(500).json({
        success: false,
        message: '获取国家信息失败'
      });
    }
  };

  /**
   * 创建国家
   * Create country
   */
  createCountry = async (req: Request, res: Response): Promise<void> => {
    try {
      const countryData = req.body;

      const country = this.countryRepository.create(countryData);
      const savedCountry = await this.countryRepository.save(country);

      logger.info(`Country created: ${savedCountry.nameCn} (${savedCountry.code})`);

      res.status(201).json({
        success: true,
        data: savedCountry,
        message: '国家创建成功'
      });
    } catch (error) {
      logger.error('Failed to create country', error);
      res.status(500).json({
        success: false,
        message: '创建国家失败'
      });
    }
  };

  /**
   * 更新国家
   * Update country
   */
  updateCountry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const updateData = req.body;

      const country = await this.countryRepository.findOne({ where: { code } });

      if (!country) {
        res.status(404).json({
          success: false,
          message: '国家不存在'
        });
        return;
      }

      const updatedCountry = this.countryRepository.merge(country, updateData);
      await this.countryRepository.save(updatedCountry);

      logger.info(`Country updated: ${code}`);

      res.json({
        success: true,
        data: updatedCountry,
        message: '国家更新成功'
      });
    } catch (error) {
      logger.error('Failed to update country', error);
      res.status(500).json({
        success: false,
        message: '更新国家失败'
      });
    }
  };

  /**
   * 删除国家
   * Delete country
   */
  deleteCountry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const country = await this.countryRepository.findOne({ where: { code } });

      if (!country) {
        res.status(404).json({
          success: false,
          message: '国家不存在'
        });
        return;
      }

      await this.countryRepository.remove(country);

      logger.info(`Country deleted: ${code}`);

      res.json({
        success: true,
        message: '国家删除成功'
      });
    } catch (error) {
      logger.error('Failed to delete country', error);
      res.status(500).json({
        success: false,
        message: '删除国家失败'
      });
    }
  };
}

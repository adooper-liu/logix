/**
 * 国别字典路由
 * Country Routes
 */

import { Router } from 'express';
import { CountryController } from '../controllers/country.controller';

const router = Router();
const countryController = new CountryController();

// 获取所有国家
router.get('/', countryController.getAllCountries);

// 根据代码获取国家
router.get('/:code', countryController.getCountryByCode);

// 创建国家
router.post('/', countryController.createCountry);

// 更新国家
router.put('/:code', countryController.updateCountry);

// 删除国家
router.delete('/:code', countryController.deleteCountry);

export default router;

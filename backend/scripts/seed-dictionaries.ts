/**
 * 字典数据初始化脚本
 * Dictionary Data Seeding Script
 */

import path from 'path';
import * as dotenv from 'dotenv';

// 必须在任何导入之前加载 .env，因为这些模块会在初始化时读取 process.env
const envPath = path.join(__dirname, '..', '.env');
const envConfig = dotenv.config({ path: envPath });

if (envConfig.error) {
  console.error(`Error loading .env from ${envPath}:`, envConfig.error);
  throw envConfig.error;
}

// 修正工作目录到backend
process.chdir(path.join(__dirname, '..'));

// 现在可以安全地导入这些模块，因为 process.env 已经设置好了
import { initDatabase } from '../src/database';
import { Country } from '../src/entities/Country';
import { CustomerType } from '../src/entities/CustomerType';
import { Customer } from '../src/entities/Customer';
import { AppDataSource } from '../src/database';
import { logger } from '../src/utils/logger';

async function seedDictionaries() {
  await initDatabase();

  const countryRepository = AppDataSource.getRepository(Country);
  const customerTypeRepository = AppDataSource.getRepository(CustomerType);
  const customerRepository = AppDataSource.getRepository(Customer);

  try {
    // 1. 初始化国别数据
    console.log('🌍 Seeding countries...');
    const countries = [
      { code: 'US', nameCn: '美国', nameEn: 'United States', region: 'NA', continent: 'North America', currency: 'USD', phoneCode: '+1', sortOrder: 1 },
      { code: 'CA', nameCn: '加拿大', nameEn: 'Canada', region: 'NA', continent: 'North America', currency: 'CAD', phoneCode: '+1', sortOrder: 2 },
      { code: 'GB', nameCn: '英国', nameEn: 'United Kingdom', region: 'EU', continent: 'Europe', currency: 'GBP', phoneCode: '+44', sortOrder: 3 },
      { code: 'FR', nameCn: '法国', nameEn: 'France', region: 'EU', continent: 'Europe', currency: 'EUR', phoneCode: '+33', sortOrder: 4 },
      { code: 'DE', nameCn: '德国', nameEn: 'Germany', region: 'EU', continent: 'Europe', currency: 'EUR', phoneCode: '+49', sortOrder: 5 },
      { code: 'IT', nameCn: '意大利', nameEn: 'Italy', region: 'EU', continent: 'Europe', currency: 'EUR', phoneCode: '+39', sortOrder: 6 },
      { code: 'IE', nameCn: '爱尔兰', nameEn: 'Ireland', region: 'EU', continent: 'Europe', currency: 'EUR', phoneCode: '+353', sortOrder: 7 },
      { code: 'ES', nameCn: '西班牙', nameEn: 'Spain', region: 'EU', continent: 'Europe', currency: 'EUR', phoneCode: '+34', sortOrder: 8 },
      { code: 'RO', nameCn: '罗马尼亚', nameEn: 'Romania', region: 'EU', continent: 'Europe', currency: 'RON', phoneCode: '+40', sortOrder: 9 },
      { code: 'NL', nameCn: '荷兰', nameEn: 'Netherlands', region: 'EU', continent: 'Europe', currency: 'EUR', phoneCode: '+31', sortOrder: 10 },
      { code: 'AU', nameCn: '澳大利亚', nameEn: 'Australia', region: 'OC', continent: 'Oceania', currency: 'AUD', phoneCode: '+61', sortOrder: 11 },
      { code: 'JP', nameCn: '日本', nameEn: 'Japan', region: 'ASIA', continent: 'Asia', currency: 'JPY', phoneCode: '+81', sortOrder: 12 },
      { code: 'KR', nameCn: '韩国', nameEn: 'South Korea', region: 'ASIA', continent: 'Asia', currency: 'KRW', phoneCode: '+82', sortOrder: 13 },
      { code: 'CN', nameCn: '中国', nameEn: 'China', region: 'ASIA', continent: 'Asia', currency: 'CNY', phoneCode: '+86', sortOrder: 14 },
    ];

    for (const country of countries) {
      const existing = await countryRepository.findOne({ where: { code: country.code } });
      if (!existing) {
        await countryRepository.save(country);
        console.log(`  ✅ Created country: ${country.nameCn} (${country.code})`);
      }
    }

    // 2. 初始化客户类型
    console.log('\n👥 Seeding customer types...');
    const customerTypes = [
      { typeCode: 'WAYFAIR', typeName: 'Wayfair', category: 'PLATFORM', description: 'Wayfair平台客户', sortOrder: 1 },
      { typeCode: 'AMAZON', typeName: 'Amazon', category: 'PLATFORM', description: 'Amazon平台客户', sortOrder: 2 },
      { typeCode: 'WALMART', typeName: 'Walmart', category: 'PLATFORM', description: 'Walmart平台客户', sortOrder: 3 },
      { typeCode: 'TARGET', typeName: 'Target', category: 'PLATFORM', description: 'Target平台客户', sortOrder: 4 },
      { typeCode: 'PRIVATE', typeName: '私有客户', category: 'PRIVATE', description: '私人客户', sortOrder: 5 },
      { typeCode: 'RESELLER', typeName: '经销商', category: 'RESELLER', description: '批发经销商', sortOrder: 6 },
      { typeCode: 'WHOLESALER', typeName: '批发商', category: 'RESELLER', description: '批发商', sortOrder: 7 },
      { typeCode: 'SUBSIDIARY', typeName: '子公司', category: 'SUBSIDIARY', description: '海外子公司', sortOrder: 8 },
    ];

    for (const type of customerTypes) {
      const existing = await customerTypeRepository.findOne({ where: { typeCode: type.typeCode } });
      if (!existing) {
        await customerTypeRepository.save(type);
        console.log(`  ✅ Created customer type: ${type.typeName} (${type.typeCode})`);
      }
    }

    // 3. 初始化示例客户 - AoSOM/MH 集团9个海外子公司
    console.log('\n🏢 Seeding AoSOM/MH subsidiary customers (9 companies)...');
    const customers = [
      // AOSOM/MH 集团9个海外子公司
      { customerCode: 'AOSOM_US', customerName: 'AOSOM LLC', customerTypeCode: 'SUBSIDIARY', country: 'US', address: '', isActive: true, sortOrder: 1 },
      { customerCode: 'AOSOM_CA', customerName: 'AOSOM CANADA INC.', customerTypeCode: 'SUBSIDIARY', country: 'CA', address: '', isActive: true, sortOrder: 2 },
      { customerCode: 'MH_UK', customerName: 'MH STAR UK LTD', customerTypeCode: 'SUBSIDIARY', country: 'GB', address: '', isActive: true, sortOrder: 3 },
      { customerCode: 'MH_FR', customerName: 'MH FRANCE', customerTypeCode: 'SUBSIDIARY', country: 'FR', address: '', isActive: true, sortOrder: 4 },
      { customerCode: 'MH_DE', customerName: 'MH HANDEL GMBH', customerTypeCode: 'SUBSIDIARY', country: 'DE', address: '', isActive: true, sortOrder: 5 },
      { customerCode: 'AOSOM_IT', customerName: 'AOSOM ITALY SRL', customerTypeCode: 'SUBSIDIARY', country: 'IT', address: '', isActive: true, sortOrder: 6 },
      { customerCode: 'AOSOM_IE', customerName: 'AOSOM IRELAND LIMITED', customerTypeCode: 'SUBSIDIARY', country: 'IE', address: '', isActive: true, sortOrder: 7 },
      { customerCode: 'AOSOM_ES', customerName: 'SPANISH AOSOM, S.L.', customerTypeCode: 'SUBSIDIARY', country: 'ES', address: '', isActive: true, sortOrder: 8 },
      { customerCode: 'AOSOM_RO', customerName: 'AOSOM ROMANIA S.R.L.', customerTypeCode: 'SUBSIDIARY', country: 'RO', address: '', isActive: true, sortOrder: 9 },
    ];

    for (const customer of customers) {
      const existing = await customerRepository.findOne({ where: { customerCode: customer.customerCode } });
      if (!existing) {
        await customerRepository.save(customer);
        console.log(`  ✅ Created customer: ${customer.customerName} (${customer.customerCode})`);
      }
    }

    console.log('\n✅ Dictionary data seeded successfully!');
  } catch (error) {
    console.error('\n❌ Error seeding dictionaries:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

// 执行初始化
seedDictionaries().catch(console.error);

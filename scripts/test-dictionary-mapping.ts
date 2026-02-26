/**
 * 测试船公司和货代公司名称到代码的转换
 */

import { AppDataSource } from '../backend/src/database';
import { DictShippingCompany } from '../backend/src/entities/DictShippingCompany';
import { DictFreightForwarder } from '../backend/src/entities/DictFreightForwarder';

async function testDictionaryMapping() {
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    const shippingRepo = AppDataSource.getRepository(DictShippingCompany);
    const forwarderRepo = AppDataSource.getRepository(DictFreightForwarder);

    // 测试船公司转换
    console.log('\n=== 测试船公司转换 ===');
    const testShippingCompanies = ['马士基', 'Maersk', 'MSK', '中远', 'COS', '达飞', 'CMA'];

    for (const name of testShippingCompanies) {
      let code = null;

      // 检查是否是代码
      const existsByCode = await shippingRepo.exists({
        where: { companyCode: name }
      });

      if (existsByCode) {
        code = name;
      } else {
        // 按名称查找
        const byName = await shippingRepo.findOne({
          where: [
            { companyName: name },
            { companyNameEn: name }
          ]
        });
        if (byName) code = byName.companyCode;
      }

      console.log(`  ${name.padEnd(10)} -> ${code || '未找到'}`);
    }

    // 测试货代公司转换
    console.log('\n=== 测试货代公司转换 ===');
    const testForwarders = ['敦豪全球货运', 'DHL', 'DHL Global Forwarding', '德迅物流', 'KUEHNE_NAGEL'];

    for (const name of testForwarders) {
      let code = null;

      // 检查是否是代码
      const existsByCode = await forwarderRepo.exists({
        where: { forwarderCode: name }
      });

      if (existsByCode) {
        code = name;
      } else {
        // 按名称查找
        const byName = await forwarderRepo.findOne({
          where: [
            { forwarderName: name },
            { forwarderNameEn: name }
          ]
        });
        if (byName) code = byName.forwarderCode;
      }

      console.log(`  ${name.padEnd(30)} -> ${code || '未找到'}`);
    }

    await AppDataSource.destroy();
    console.log('\n测试完成');
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

testDictionaryMapping();

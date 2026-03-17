/**
 * 智能排柜服务测试脚本
 * 用于验证后端服务的基本功能
 */

import { intelligentSchedulingService } from '../src/services/intelligentScheduling.service';
import { initDatabase, closeDatabase } from '../src/database';

async function testSchedulingService() {
  console.log('开始测试智能排柜服务...');
  
  try {
    // 初始化数据库连接
    await initDatabase();
    console.log('数据库连接成功');
    
    // 测试批量排产功能
    const result = await intelligentSchedulingService.batchSchedule({
      country: 'CA',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      limit: 5
    });
    
    console.log('测试结果:', result);
    
    if (result.success) {
      console.log(`成功排产 ${result.successCount} 个货柜`);
      console.log(`失败 ${result.failedCount} 个货柜`);
    } else {
      console.log('排产失败:', result);
    }
    
    console.log('智能排柜服务测试完成！');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  } finally {
    // 关闭数据库连接
    try {
      await closeDatabase();
      console.log('数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库连接时出现错误:', error);
    }
  }
}

// 运行测试
testSchedulingService();

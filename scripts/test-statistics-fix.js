/**
 * 测试统计API修复
 * Test Statistics API Fix
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const API_BASE_URL = 'http://localhost:3001/api/v1';
const API_TIMEOUT = 10000;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step) {
  console.log('\n' + '='.repeat(60));
  log(step, colors.cyan);
  console.log('='.repeat(60));
}

async function testStatisticsAPI() {
  logStep('测试统计API修复');

  try {
    log(`正在调用: ${API_BASE_URL}/containers/statistics`, colors.yellow);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/containers/statistics`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok && data?.success && data.data) {
      log(`✅ 统计API调用成功！`, colors.green);
      log('\n统计数据:', colors.blue);
      console.log(JSON.stringify(data.data, null, 2));
      return { success: true, data: data.data };
    } else {
      log('❌ API返回数据格式不正确', colors.red);
      log(`状态码: ${response.status} ${response.statusText}`, colors.yellow);
      log('\n响应内容:', colors.yellow);
      console.log(JSON.stringify(data, null, 2));
      return { success: false, error: 'Invalid response format', data };
    }
  } catch (error) {
    log('❌ API调用失败', colors.red);
    log(`错误: ${error.message}`, colors.red);
    return { success: false, error: error.message };
  }
}

async function testStatisticsWithCountryFilter(countryCode) {
  logStep(`测试统计API（国家筛选: ${countryCode || '全部'}）`);

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (countryCode) {
      headers['X-Country-Code'] = countryCode;
    }

    log(`正在调用: ${API_BASE_URL}/containers/statistics`, colors.yellow);
    if (countryCode) {
      log(`国家筛选Header: X-Country-Code = ${countryCode}`, colors.yellow);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/containers/statistics`, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok && data?.success && data.data) {
      log(`✅ 统计查询成功！`, colors.green);
      log('\n统计数据:', colors.blue);
      console.log(JSON.stringify(data.data, null, 2));
      return { success: true, data: data.data };
    } else {
      log('❌ API返回数据格式不正确', colors.red);
      log(`状态码: ${response.status} ${response.statusText}`, colors.yellow);
      log('\n响应内容:', colors.yellow);
      console.log(JSON.stringify(data, null, 2));
      return { success: false, error: 'Invalid response format', data };
    }
  } catch (error) {
    log('❌ 查询失败', colors.red);
    log(`错误: ${error.message}`, colors.red);
    return { success: false, error: error.message };
  }
}

async function main() {
  log('🧪 LogiX 统计API修复验证', colors.cyan);
  log('================================', colors.cyan);

  // 测试1: 基础统计API
  await testStatisticsAPI();

  // 测试2: 统计API（无国家筛选）
  await testStatisticsWithCountryFilter('');

  // 测试3: 统计API（有国家筛选）
  await testStatisticsWithCountryFilter('US');

  log('\n' + '='.repeat(60), colors.cyan);
  log('✅ 测试完成！', colors.green);
  log('='.repeat(60), colors.cyan);

  log('\n如果所有测试都通过，说明统计API已修复。', colors.green);
  log('\n现在前端的国家筛选应该可以正常工作了。', colors.green);
}

main().catch(error => {
  log(`\n❌ 测试失败: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

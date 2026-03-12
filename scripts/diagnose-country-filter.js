/**
 * 国家筛选诊断脚本
 * Country Filter Diagnostic Script
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
const API_TIMEOUT = 10000; // 10秒超时

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step) {
  console.log('\n' + '='.repeat(60));
  log(step, colors.cyan);
  console.log('='.repeat(60));
}

async function testCountriesAPI() {
  logStep('步骤1: 测试国家列表API');

  try {
    log(`正在调用: ${API_BASE_URL}/countries`, colors.yellow);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/countries`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok && data?.success && Array.isArray(data.data)) {
      const countries = data.data;
      log(`✅ API调用成功！返回 ${countries.length} 个国家`, colors.green);

      log('\n前10个国家:', colors.blue);
      countries.slice(0, 10).forEach(c => {
        log(`  ${c.code} - ${c.nameCn} (${c.nameEn})`, colors.reset);
      });

      return { success: true, countries };
    } else {
      log('❌ API返回数据格式不正确', colors.red);
      log(JSON.stringify(data, null, 2), colors.red);
      return { success: false, error: 'Invalid response format' };
    }
  } catch (error) {
    log('❌ API调用失败', colors.red);

    if (error.name === 'AbortError') {
      log('错误: 请求超时', colors.red);
    } else if (error.cause?.code === 'ECONNREFUSED') {
      log('错误: 无法连接到后端服务器', colors.red);
      log('可能的原因:', colors.yellow);
      log('  1. 后端服务未启动', colors.reset);
      log('  2. 端口3001被占用', colors.reset);
      log('  3. 防火墙阻止连接', colors.reset);
      log('\n解决方法:', colors.yellow);
      log('  cd backend && npm run dev', colors.reset);
    } else {
      log(`错误: ${error.message}`, colors.red);
      if (error.cause) {
        log(`错误详情: ${error.cause.message}`, colors.red);
      }
    }

    return { success: false, error: error.message };
  }
}

async function testContainersWithCountryFilter(countryCode) {
  logStep(`步骤2: 测试货柜列表API（国家筛选: ${countryCode || '全部'}）`);

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (countryCode) {
      headers['X-Country-Code'] = countryCode;
    }

    log(`正在调用: ${API_BASE_URL}/containers`, colors.yellow);
    if (countryCode) {
      log(`国家筛选Header: X-Country-Code = ${countryCode}`, colors.yellow);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/containers`, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok && data?.success && Array.isArray(data.data)) {
      const containers = data.data;
      log(`✅ 查询成功！返回 ${containers.length} 个货柜`, colors.green);

      if (containers.length > 0) {
        log('\n第一个货柜信息:', colors.blue);
        const c = containers[0];
        log(`  集装箱号: ${c.containerNumber}`, colors.reset);
        log(`  备货单号: ${c.orderNumber}`, colors.reset);
        log(`  目的港: ${c.destinationPort}`, colors.reset);
      }

      return { success: true, containers };
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

async function testStatisticsWithCountryFilter(countryCode) {
  logStep(`步骤3: 测试统计API（国家筛选: ${countryCode || '全部'}）`);

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
  log('🌍 LogiX 国家筛选功能诊断工具', colors.cyan);
  log('=====================================', colors.cyan);
  
  // 测试1: 国家列表API
  const countriesResult = await testCountriesAPI();
  
  if (!countriesResult.success) {
    log('\n❌ 国家列表API测试失败，无法继续测试', colors.red);
    log('\n建议:', colors.yellow);
    log('  1. 确保后端服务已启动: cd backend && npm run dev', colors.reset);
    log('  2. 检查后端日志是否有错误', colors.reset);
    log('  3. 检查数据库连接是否正常', colors.reset);
    process.exit(1);
  }
  
  // 测试2: 货柜列表API（无国家筛选）
  await testContainersWithCountryFilter('');
  
  // 测试3: 货柜列表API（有国家筛选）
  await testContainersWithCountryFilter('US');
  
  // 测试4: 统计API（无国家筛选）
  await testStatisticsWithCountryFilter('');
  
  // 测试5: 统计API（有国家筛选）
  await testStatisticsWithCountryFilter('GB');
  
  log('\n' + '='.repeat(60), colors.cyan);
  log('✅ 所有测试完成！', colors.green);
  log('='.repeat(60), colors.cyan);
  
  log('\n如果所有测试都通过，说明后端API工作正常。', colors.green);
  log('前端问题可能是:', colors.yellow);
  log('  1. 浏览器缓存问题 - 请清除缓存并刷新页面', colors.reset);
  log('  2. 前端网络问题 - 请打开浏览器开发者工具查看Network标签', colors.reset);
  log('  3. 前端代码问题 - 请查看浏览器Console标签的错误信息', colors.reset);
}

main().catch(error => {
  log(`\n❌ 诊断脚本运行失败: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

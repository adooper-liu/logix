// 测试货柜详情接口
const axios = require('axios');

async function testGetContainer(containerNumber) {
  try {
    console.log(`\n========== 测试货柜详情接口: ${containerNumber} ==========\n`);
    
    const response = await axios.get(`http://localhost:3001/api/v1/containers/${containerNumber}`);
    
    console.log('✅ 请求成功');
    console.log('状态码:', response.status);
    
    if (response.data?.success) {
      const data = response.data.data;
      console.log('\n📊 返回数据:');
      console.log('- containerNumber:', data.containerNumber);
      console.log('- ataDestPort:', data.ataDestPort);
      console.log('- etaDestPort:', data.etaDestPort);
      console.log('- pickupDate:', data.pickupDate);
      console.log('- returnTime:', data.returnTime);
      console.log('- portOperations 数量:', data.portOperations?.length || 0);
      console.log('- truckingTransports 数量:', data.truckingTransports?.length || 0);
      console.log('- emptyReturns 数量:', data.emptyReturns?.length || 0);
    } else {
      console.log('❌ API返回错误:', response.data?.message);
    }
  } catch (error) {
    console.log('\n❌ 请求失败');
    console.log('错误信息:', error.message);
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误详情:', error.response.data);
    }
  }
}

// 从命令行参数获取 containerNumber
const containerNumber = process.argv[2] || 'ECMU5399586';

testGetContainer(containerNumber).catch(console.error);

import fetch from 'node-fetch';

async function testLogisticsPath() {
  try {
    console.log('=== 测试 HMMU6232153 的物流路径 ===\n');
    
    const response = await fetch('http://localhost:4000/api/v1/logistics-path/container/HMMU6232153');
    const data = await response.json();
    
    if (data.data && data.data.nodes) {
      console.log(`总节点数：${data.data.nodes.length}\n`);
      
      // 查找提柜阶段的节点
      const pickupNodes = data.data.nodes.filter((n: any) => 
        n.status === 'IN_TRANSIT_TO_DEST' || 
        n.status === 'GATE_OUT' ||
        n.status === 'DELIVERY_ARRIVED' ||
        n.statusCode === 'STCS' ||
        n.statusCode === 'FETA'
      );
      
      console.log('提柜相关节点:');
      console.log(JSON.stringify(pickupNodes, null, 2));
      console.log('\n');
      
      // 显示所有节点的 status 和 statusCode
      console.log('所有节点的状态:');
      data.data.nodes.forEach((n: any, i: number) => {
        console.log(`${i + 1}. ${n.status} - ${n.statusCode || 'N/A'} - ${n.description || 'N/A'} - ${n.rawData?.dataSource || 'N/A'}`);
      });
    } else {
      console.log('没有返回数据');
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

testLogisticsPath();

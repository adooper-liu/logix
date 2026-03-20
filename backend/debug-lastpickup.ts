import { AppDataSource } from './src/database';
import { Container } from './src/entities/Container';

async function test() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Container);

  // 查询目标集
  const result = await repo.query(`
    SELECT c.container_number, c.logistics_status, po.ata, po.last_free_date, po.port_sequence
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    WHERE po.port_type = 'destination'
    AND po.ata IS NOT NULL
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
    )
    AND c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  `);

  console.log('=== TARGET SET ===');
  console.log('Total:', result.length);
  console.log('Sample (first 5):', result.slice(0, 5));

  // 按状态分组
  const byStatus = {};
  result.forEach(r => {
    byStatus[r.logistics_status] = (byStatus[r.logistics_status] || 0) + 1;
  });
  console.log('\n=== BY LOGISTICS STATUS ===');
  console.log(byStatus);

  // 检查有/无last_free_date
  const withLastFreeDate = result.filter(r => r.last_free_date !== null);
  const withoutLastFreeDate = result.filter(r => r.last_free_date === null);
  console.log('\n=== LAST FREE DATE ===');
  console.log('With last_free_date:', withLastFreeDate.length);
  console.log('Without last_free_date:', withoutLastFreeDate.length);

  // 显示无last_free_date的样本
  if (withoutLastFreeDate.length > 0) {
    console.log('\nSample without last_free_date:', withoutLastFreeDate.slice(0, 5));
  }

  await AppDataSource.destroy();
}

test().catch(console.error);

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname);

// 定义临时文档分类映射
const docMappings = {
  '01-state-machine': [
    { src: '状态机完善方案.md', dst: '01-状态机完善方案.md' },
    { src: '状态机方案-明确区分中转港和目的港.md', dst: '02-状态机方案-明确区分中转港和目的港.md' },
    { src: 'UNIFIED_STATUS_MACHINE_IMPLEMENTATION.md', dst: '03-统一状态机实现.md' },
    { src: 'LOGISTICS_STATUS_STATE_MACHINE.md', dst: '04-物流状态机.md' },
    { src: 'ContainerStatusService设计.md', dst: '05-ContainerStatusService设计.md' },
  ],
  '02-optimization': [
    { src: 'refactoring-comparison.md', dst: '01-重构对比.md' },
    { src: '飞驼API与状态机集成方案.md', dst: '02-飞驼API与状态机集成方案.md' },
  ],
  '03-visualization': [
    { src: 'statistics-visualization.md', dst: '01-统计可视化.md' },
  ],
  '04-analysis': [
    { src: 'SHIPMENTS_DATA_SCALABILITY_ANALYSIS.md', dst: '01-货柜数据可扩展性分析.md' },
    { src: 'SHIPMENTS_PERFORMANCE_OPTIMIZATION.md', dst: '02-货柜性能优化.md' },
    { src: 'Shipments 页面子维度数据口径总览_最终版.md', dst: '03-Shipments页面子维度数据口径总览_最终版.md' },
    { src: '中转港问题根本解决方案.md', dst: '04-中转港问题根本解决方案.md' },
    { src: '仓库操作状态映射关系.md', dst: '05-仓库操作状态映射关系.md' },
    { src: '统计口径完整说明_按到港维度.md', dst: '06-统计口径完整说明_按到港维度.md' },
    { src: 'PROJECT_STATUS_AND_DEVELOPMENT_PLAN.md', dst: '07-项目状态与开发计划.md' },
  ],
  '99-keep': [
    { src: 'README.md', dst: 'README.md' },
    { src: 'MULTIPLE_ORDERS_PER_CONTAINER.md', dst: 'MULTIPLE_ORDERS_PER_CONTAINER.md' },
    { src: 'ARCHITECTURE_EXPLAINED.md', dst: 'ARCHITECTURE_EXPLAINED.md' },
  ],
};

// 创建目录
console.log('创建目录结构...');
const dirs = Object.keys(docMappings);
for (const dir of dirs) {
  const dirPath = path.join(baseDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ✓ 创建目录: ${dir}`);
  }
}

// 执行移动
let movedCount = 0;
let skippedCount = 0;
let errorCount = 0;

console.log('\n开始移动文件...');
for (const [category, files] of Object.entries(docMappings)) {
  console.log(`\n处理分类: ${category}`);

  for (const { src, dst } of files) {
    const srcPath = path.join(baseDir, src);
    const dstPath = path.join(baseDir, category, dst);

    try {
      if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, dstPath);
        console.log(`  ✓ ${src} -> ${category}/${dst}`);
        movedCount++;
      } else {
        console.log(`  ✗ ${src} 不存在，跳过`);
        skippedCount++;
      }
    } catch (error) {
      console.log(`  ✗ ${src} 移动失败: ${error.message}`);
      errorCount++;
    }
  }
}

console.log(`\n========== 统计 ==========`);
console.log(`成功移动: ${movedCount} 个文件`);
console.log(`跳过文件: ${skippedCount} 个文件`);
console.log(`失败文件: ${errorCount} 个文件`);
console.log(`========== 完成 ==========`);

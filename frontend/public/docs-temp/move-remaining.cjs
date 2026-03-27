const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname);

// 定义剩余文档分类映射
const remainingMappings = {
  '01-standards': [
    { src: 'LINT_SETUP_SUMMARY.md', dst: '09-Lint设置完成总结.md' },
  ],
  '02-architecture': [],
  '03-database': [],
  '04-api': [],
  '05-state-machine': [],
  '06-statistics': [
    { src: 'GANTT_LANES_VS_SHIPMENTS_CARDS_COMPARISON.md', dst: '10-甘特图车道与货柜卡片对比.md' },
  ],
  '07-performance': [],
  '08-deployment': [],
  '09-misc': [
    { src: 'DOCUMENT_TRANSFER_DATE_TYPE_CHANGE.md', dst: '07-文档传输日期类型变更.md' },
    { src: 'FREIGHT_CURRENCY_AMOUNT_IMPORT_FIX.md', dst: '08-运费金额导入修复.md' },
    { src: 'IMPLEMENT_TIME_FIX_GUIDE.md', dst: '09-实现时间修复指南.md' },
    { src: 'IMPORT_MAPPING_FIX_SUMMARY.md', dst: '10-导入映射修复总结.md' },
    { src: 'TIMESTAMP_MIGRATION_COMPLETE.md', dst: '11-时间戳迁移完成.md' },
    { src: 'SHIPMENTS_TABLE_BINDING.md', dst: '12-货柜表格绑定.md' },
    { src: 'SHIPMENTS_TABLE_PLAN.md', dst: '13-货柜表格计划.md' },
    { src: 'SHIPMENTS_PAGE_LOGIC_AND_TROUBLESHOOTING.md', dst: '14-货柜页面逻辑与故障排除.md' },
    { src: 'SYNTAX_HIGHLIGHT_TEST.md', dst: '15-语法高亮测试.md' },
  ],
  '10-guides': [
    { src: 'BACKEND_QUICK_REFERENCE.md', dst: '01-后端快速参考.md' },
    { src: 'backend.md', dst: '02-后端文档.md' },
    { src: 'DEV_ENVIRONMENT_GUIDE.md', dst: '03-开发环境指南.md' },
    { src: 'frontend.md', dst: '04-前端文档.md' },
    { src: 'QUICK_START.md', dst: '05-快速开始.md' },
  ],
  '11-project': [
    { src: 'PROJECT_STATUS_AND_PLAN.md', dst: '01-项目状态与计划.md' },
    { src: 'INDEX.md', dst: '02-文档索引.md' },
    { src: 'README.md', dst: '03-项目README.md' },
  ],
};

// 创建10-guides和11-project目录
console.log('创建额外目录...');
const extraDirs = ['10-guides', '11-project'];
for (const dir of extraDirs) {
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

console.log('\n开始移动剩余文件...');
for (const [category, files] of Object.entries(remainingMappings)) {
  if (files.length === 0) continue;
  
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

// 删除临时脚本文件
const tempFiles = ['reorganize-docs.cjs', 'reorganize-docs.js', 'reorganize-docs-en.cjs'];
console.log('\n删除临时脚本文件...');
for (const file of tempFiles) {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  ✓ 删除: ${file}`);
  }
}

console.log(`\n========== 统计 ==========`);
console.log(`成功移动: ${movedCount} 个文件`);
console.log(`跳过文件: ${skippedCount} 个文件`);
console.log(`失败文件: ${errorCount} 个文件`);
console.log(`========== 完成 ==========`);

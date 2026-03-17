/**
 * 颜色变量分析工具
 * 分析前端代码中的硬编码颜色与 SCSS 变量的映射关系
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.join(__dirname, '../frontend/src');

// SCSS 变量系统中定义的颜色
const SCSS_VARIABLES = {
  // 主题色
  '#409EFF': '$primary-color',
  '#79bbff': '$primary-light',
  '#a0cfff': '$primary-lighter',
  '#c6e2ff': '$primary-extra-light',
  '#337ecc': '$primary-dark',
  
  // 功能色
  '#67C23A': '$success-color',
  '#95d475': '$success-light',
  '#E6A23C': '$warning-color',
  '#eebe77': '$warning-light',
  '#F56C6C': '$danger-color',
  '#f89898': '$danger-light',
  '#909399': '$info-color',
  '#b1b3b8': '$info-light',
  
  // 中性色 - Text
  '#303133': '$text-primary',
  '#606266': '$text-regular',
  '#C0C4CC': '$text-placeholder',
  
  // 中性色 - Background
  '#ffffff': '$bg-color',
  '#f5f7fa': '$bg-page',
  
  // 中性色 - Border
  '#DCDFE6': '$border-base',
  '#E4E7ED': '$border-light',
  '#EBEEF5': '$border-lighter',
  '#F2F6FC': '$border-extra-light',
  
  // 业务色 - 物流状态
  '#409EFF': '$status-shipped',
  '#67C23A': '$status-at-port',
  '#E6A23C': '$status-picked-up',
  
  // 业务色 - 优先级
  '#F56C6C': '$priority-critical',
  '#E6A23C': '$priority-high',
  '#409EFF': '$priority-medium',
  '#67C23A': '$priority-low',
  
  // 导航相关
  '#0a0e27': '$nav-bg-gradient-start',
  '#1a1f3a': '$nav-bg-gradient-mid',
  '#252b4a': '$nav-bg-gradient-end',
  '#00d4ff': '$nav-accent-cyan',
  '#7c3aed': '$nav-accent-purple',
  '#ec4899': '$nav-accent-pink',
};

// 额外常用颜色映射（未在variables.scss中定义但常用的）
const COMMON_COLORS = {
  '#000000': 'black',
  '#ffffff': 'white',
  '#fff': 'white',
  '#000': 'black',
  '#666': '$text-regular',
  '#333': '$text-primary',
  '#999': '$text-secondary',
  '#eee': '$border-light',
  '#ddd': '$border-base',
  '#ccc': '$text-placeholder',
  '#fafafa': '$bg-page',
  '#f8f9fa': '$bg-page',
  '#2c3e50': '$text-primary',
  '#555': '$text-regular',
  '#1a1a1a': '$text-primary',
};

// 统计结果
const colorStats = new Map();

// 扫描Vue文件中的颜色
function scanVueFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 匹配 style 标签中的颜色
  const styleRegex = /#[0-9A-Fa-f]{3,6}/g;
  const styleMatches = content.match(styleRegex) || [];
  
  // 匹配行内样式中的颜色
  const inlineStyleRegex = /:style\s*=\s*["'][^"']*#[0-9A-Fa-f]{3,6}[^"']*["']/g;
  const inlineMatches = content.match(inlineStyleRegex) || [];
  
  // 匹配 class 绑定中的颜色
  const classBindRegex = /:class\s*=\s*["'][^"']*#[0-9A-Fa-f]{3,6}[^"']*["']/g;
  const classMatches = content.match(classBindRegex) || [];
  
  const allMatches = [...styleMatches, ...inlineMatches, ...classMatches];
  
  // 提取独立颜色值
  const colorSet = new Set();
  allMatches.forEach(match => {
    const colors = match.match(/#([0-9A-Fa-f]{3,6})/g) || [];
    colors.forEach(c => colorSet.add(c.toLowerCase()));
  });
  
  colorSet.forEach(color => {
    const normalizedColor = color.toLowerCase();
    if (!colorStats.has(normalizedColor)) {
      colorStats.set(normalizedColor, {
        color: normalizedColor,
        count: 0,
        mapped: SCSS_VARIABLES[normalizedColor] || COMMON_COLORS[normalizedColor] || null,
        files: []
      });
    }
    const stats = colorStats.get(normalizedColor);
    stats.count++;
    if (!stats.files.includes(filePath)) {
      stats.files.push(filePath);
    }
  });
}

// 扫描目录
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      return;
    }
    
    if (stat.isDirectory()) {
      // 跳过特定目录
      if (file === 'node_modules' || file === '.git' || file === 'assets') {
        return;
      }
      scanDirectory(filePath);
    } else if (file.endsWith('.vue')) {
      scanVueFile(filePath);
    }
  });
}

// 执行扫描
console.log('🔍 扫描前端代码中的硬编码颜色...\n');
scanDirectory(FRONTEND_ROOT);

// 排序输出
const sortedStats = Array.from(colorStats.values())
  .filter(s => s.count > 5) // 只显示使用超过5次的颜色
  .sort((a, b) => b.count - a.count);

console.log('📊 硬编码颜色统计（使用>5次）:\n');
console.log('| 颜色 | 出现次数 | 建议变量 | 文件数 |');
console.log('|------|----------|----------|--------|');

sortedStats.forEach(stat => {
  const mapped = stat.mapped || '❌ 无映射';
  console.log(`| ${stat.color} | ${stat.count} | ${mapped} | ${stat.files.length} |`);
});

console.log('\n📈 统计摘要:');
console.log(`- 总计发现颜色种类: ${colorStats.size}`);
console.log(`- 已映射到SCSS变量: ${sortedStats.filter(s => s.mapped).length}`);
console.log(`- 未映射颜色: ${sortedStats.filter(s => !s.mapped).length}`);

// 输出迁移建议
console.log('\n📝 迁移建议:');
console.log('='.repeat(60));

const unmappedColors = sortedStats.filter(s => !s.mapped);
if (unmappedColors.length > 0) {
  console.log('\n⚠️  建议添加到 variables.scss 的颜色:');
  unmappedColors.slice(0, 10).forEach(stat => {
    console.log(`  ${stat.color}: 使用 ${stat.count} 次，覆盖 ${stat.files.length} 个文件`);
  });
}

// 生成建议报告
const report = {
  timestamp: new Date().toISOString(),
  totalColors: colorStats.size,
  mappedColors: sortedStats.filter(s => s.mapped).length,
  unmappedColors: sortedStats.filter(s => !s.mapped).length,
  topColors: sortedStats.slice(0, 20).map(s => ({
    color: s.color,
    count: s.count,
    suggested: s.mapped,
    files: s.files.length
  }))
};

const reportDir = path.join(__dirname, '../public/docs-temp');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const reportPath = path.join(reportDir, '颜色迁移分析报告.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 详细报告已保存至: ${reportPath}`);

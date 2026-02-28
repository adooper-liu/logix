#!/usr/bin/env node

/**
 * 🔄 颜色迁移脚本
 *
 * 自动替换硬编码颜色为 SCSS 变量
 * 用法：node scripts/migrate-colors.js
 */

const fs = require('fs')
const path = require('path')

// 颜色映射表（硬编码颜色 -> SCSS 变量）
const colorMap = {
  // 主题色
  '#409EFF': '$primary-color',
  '#409eff': '$primary-color',
  '#79bbff': '$primary-light',
  '#a0cfff': '$primary-lighter',
  '#c6e2ff': '$primary-extra-light',
  '#337ecc': '$primary-dark',

  // 功能色
  '#67C23A': '$success-color',
  '#67c23a': '$success-color',
  '#95d475': '$success-light',

  '#E6A23C': '$warning-color',
  '#e6a23c': '$warning-color',
  '#eebe77': '$warning-light',

  '#F56C6C': '$danger-color',
  '#f56c6c': '$danger-color',
  '#f89898': '$danger-light',

  '#909399': '$info-color',
  '#b1b3b8': '$info-light',

  // 文字色
  '#303133': '$text-primary',
  '#606266': '$text-regular',
  '#909399': '$text-secondary',
  '#C0C4CC': '$text-placeholder',

  // 背景色
  '#ffffff': '$bg-color',
  '#f5f7fa': '$bg-page',

  // 边框色
  '#DCDFE6': '$border-base',
  '#E4E7ED': '$border-light',
  '#EBEEF5': '$border-lighter',
  '#F2F6FC': '$border-extra-light',
}

// 统计信息
let totalFiles = 0
let totalReplacements = 0
let fileStats = {}

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir, extensions = []) {
  const files = []

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name)

      if (item.isDirectory()) {
        // 跳过 node_modules 和 .git
        if (item.name !== 'node_modules' && item.name !== '.git') {
          traverse(fullPath)
        }
      } else if (item.isFile()) {
        // 检查文件扩展名
        if (extensions.length === 0 || extensions.includes(path.extname(item.name))) {
          files.push(fullPath)
        }
      }
    }
  }

  traverse(dir)
  return files
}

/**
 * 替换文件中的颜色
 */
function replaceColorsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    let newContent = content
    let replacements = 0

    // 替换所有匹配的颜色
    Object.entries(colorMap).forEach(([hexColor, scssVar]) => {
      // 匹配 CSS 中的颜色声明
      const regex = new RegExp(
        `(color|background-color|border-color|\\s+):\\s*${hexColor}(\\s*[;,]?)`,
        'gi'
      )
      newContent = newContent.replace(regex, `$1: ${scssVar}$2`)

      // 匹配字符串中的颜色（用于 Vue/TS 中的 color: '#409EFF'）
      const stringRegex = new RegExp(
        `(color|backgroundColor|borderColor):\\s*(['"])${hexColor}\\2`,
        'g'
      )
      newContent = newContent.replace(stringRegex, `$1: ${scssVar}`)

      // 统计替换次数
      const matches = content.match(regex)
      const stringMatches = content.match(stringRegex)
      replacements += (matches?.length || 0) + (stringMatches?.length || 0)
    })

    if (replacements > 0) {
      fs.writeFileSync(filePath, newContent)
      console.log(`✅ ${filePath}: ${replacements} 次替换`)
      fileStats[filePath] = replacements
      totalReplacements += replacements
    }

    return replacements
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message)
    return 0
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🎨 开始颜色迁移...\n')

  // 获取所有 .vue, .scss, .css 文件
  const srcDir = path.join(__dirname, '..', 'src')
  const files = getAllFiles(srcDir, ['.vue', '.scss', '.css'])

  console.log(`📁 找到 ${files.length} 个文件\n`)

  // 处理每个文件
  files.forEach(file => {
    const replacements = replaceColorsInFile(file)
    if (replacements > 0) {
      totalFiles++
    }
  })

  // 输出统计信息
  console.log('\n' + '='.repeat(50))
  console.log('📊 迁移完成！')
  console.log('='.repeat(50))
  console.log(`处理文件数: ${totalFiles}`)
  console.log(`总替换次数: ${totalReplacements}`)
  console.log('='.repeat(50))

  if (Object.keys(fileStats).length > 0) {
    console.log('\n📝 详细统计:')
    Object.entries(fileStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([file, count]) => {
        console.log(`  ${file}: ${count} 次`)
      })
  }

  console.log('\n✨ 请检查修改后的文件，确保没有引入错误！\n')
}

// 运行主函数
main()


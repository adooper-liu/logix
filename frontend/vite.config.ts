import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

// ESM 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 辅助函数：在子目录中递归查找文件
function findFileInSubdirs(dir: string, fileName: string): string | null {
  if (!fs.existsSync(dir)) return null

  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      const found = findFileInSubdirs(fullPath, fileName)
      if (found) return found
    } else if (item.isFile() && item.name === fileName) {
      return fullPath
    }
  }
  return null
}

// 自定义插件：确保 Markdown 文件以 UTF-8 编码返回
function markdownUtf8Plugin(): Plugin {
  return {
    name: 'markdown-utf8-plugin',
    enforce: 'pre', // 在其他中间件之前执行
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.endsWith('.md')) {
          const fs = await import('fs')
          console.log('[Markdown Plugin] Processing request:', req.url)

          // 处理 /docs/ 路径（frontend/public/docs/）
          let filePath: string

          if (req.url.startsWith('/docs/')) {
            // docs 在 frontend/public/docs/ 或 frontend/public/
            // 解码 URL 编码的字符（如 %E5%BC%80%E5%8F%91%E6%A0%87%E5%87%86 → 开发标准）
            let relativePath = req.url.replace('/docs/', '')
            try {
              relativePath = decodeURIComponent(relativePath)
            } catch (err) {
              console.error('[Markdown Plugin] Failed to decode URL:', relativePath, err)
            }

            const publicDocsPath = path.resolve(__dirname, 'public', 'docs', relativePath)
            const publicPath = path.resolve(__dirname, 'public', relativePath)

            console.log('[Markdown Plugin] Checking paths:', {
              relativePath,
              publicDocsPath,
              publicPath,
            })

            // 优先查找 public/docs/，然后查找 public/
            if (fs.existsSync(publicDocsPath)) {
              filePath = publicDocsPath
            } else if (fs.existsSync(publicPath)) {
              filePath = publicPath
            } else {
              // 文件未找到，尝试在 docs 子目录中搜索（后备方案）
              const docsDir = path.resolve(__dirname, 'public', 'docs')
              const foundPath = findFileInSubdirs(docsDir, path.basename(relativePath))
              if (foundPath) {
                console.log('[Markdown Plugin] Found file in subdirectory:', foundPath)
                filePath = foundPath
              } else {
                console.log('[Markdown Plugin] File not found:', req.url)
                res.statusCode = 404
                res.end('File not found')
                return
              }
            }
          } else if (req.url.startsWith('/.cursor/skills/')) {
            // 处理 /.cursor/skills/ 路径
            let relativePath = req.url.replace('/.cursor/skills/', '')
            try {
              relativePath = decodeURIComponent(relativePath)
            } catch (err) {
              console.error('[Markdown Plugin] Failed to decode URL:', relativePath, err)
            }

            const skillsPath = path.resolve(__dirname, '..', '.cursor', 'skills', relativePath)
            console.log('[Markdown Plugin] Skills path:', {
              relativePath,
              skillsPath,
            })

            if (fs.existsSync(skillsPath)) {
              filePath = skillsPath
            } else {
              console.log('[Markdown Plugin] Skill file not found:', req.url)
              res.statusCode = 404
              res.end('Skill file not found')
              return
            }
          } else {
            // 其他路径使用原来的逻辑
            try {
              filePath = path.join(process.cwd(), decodeURIComponent(req.url))
            } catch (err) {
              console.error('[Markdown Plugin] Failed to decode URL:', req.url, err)
              filePath = path.join(process.cwd(), req.url)
            }
          }

          console.log('[Markdown Plugin] Resolved path:', filePath)

          try {
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
              res.end(content)
              console.log('[Markdown Plugin] Successfully served:', req.url)
              return
            } else {
              console.log('[Markdown Plugin] File does not exist:', filePath)
            }
          } catch (err) {
            console.error('[Markdown Plugin] Failed to read file:', filePath, err)
          }
        }
        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), markdownUtf8Plugin()],
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      // 允许访问项目根目录和上级目录的文件
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '..', '.cursor'),
      ],
      strict: false,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/assets/styles/variables.scss" as *;`,
      },
    },
  },
  // 性能优化配置
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        // 手动代码分割
        manualChunks: {
          // Vue 核心
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // Element Plus
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          // 工具库
          utils: ['axios'],
          // 图表库
          charts: ['echarts'],
        },
      },
    },
    // 启用 gzip 压缩
    reportCompressedSize: true,
    // 启用 chunk 大小警告
    chunkSizeWarningLimit: 1000,
    // 构建优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    // CSS 代码分割
    cssCodeSplit: true,
    // Source map 配置
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
  },
  // 预构建优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      '@element-plus/icons-vue',
      'axios',
      'echarts',
    ],
    exclude: [],
  },
  // ESBuild 配置
  esbuild: {
    // 生产环境移除 console
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})

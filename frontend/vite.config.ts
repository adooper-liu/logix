import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'

// ESM 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

          // 处理 /docs/ 和 /docs-temp/ 路径
          let filePath: string

          if (req.url.startsWith('/docs-temp/')) {
            // docs-temp 在项目根目录
            const relativePath = req.url.replace('/docs-temp/', '')
            filePath = path.resolve(__dirname, '..', 'public', 'docs-temp', relativePath)
          } else if (req.url.startsWith('/docs/')) {
            // docs 在 frontend/public/docs/ 或 frontend/public/
            const relativePath = req.url.replace('/docs/', '')
            const publicDocsPath = path.resolve(__dirname, 'public', 'docs', relativePath)
            const publicPath = path.resolve(__dirname, 'public', relativePath)

            console.log('[Markdown Plugin] Checking paths:', {
              publicDocsPath,
              publicPath
            })

            // 优先查找 public/docs/，然后查找 public/
            if (fs.existsSync(publicDocsPath)) {
              filePath = publicDocsPath
            } else if (fs.existsSync(publicPath)) {
              filePath = publicPath
            } else {
              console.log('[Markdown Plugin] File not found:', req.url)
              res.statusCode = 404
              res.end('File not found')
              return
            }
          } else {
            // 其他路径使用原来的逻辑
            filePath = path.join(process.cwd(), req.url)
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
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), markdownUtf8Plugin()],
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
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
        secure: false
      }
    },
    fs: {
      // 允许访问项目根目录和上级目录的文件
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '..')
      ],
      strict: false
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "@/assets/styles/variables.scss" as *;`
      }
    }
  }
})
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import type { Plugin } from 'vite'

// 自定义插件：确保 Markdown 文件以 UTF-8 编码返回
function markdownUtf8Plugin(): Plugin {
  return {
    name: 'markdown-utf8-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.endsWith('.md')) {
          const fs = await import('fs')
          const filePath = path.join(process.cwd(), req.url)
          try {
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
              res.end(content)
              return
            }
          } catch (err) {
            console.error('读取 Markdown 文件失败:', err)
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
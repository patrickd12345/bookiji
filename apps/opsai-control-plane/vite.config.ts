import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()] as PluginOption[],
  server: {
    port: 4173,
    fs: {
      // allow imports from repo root (server types/helpers)
      allow: ['..', '../..', '../../..', '../../../..']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Allow local workspace package resolution when dist isn't built yet
      '@bookiji/opsai': path.resolve(__dirname, '../../packages/opsai-sdk/src')
    }
  }
})

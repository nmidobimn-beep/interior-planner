import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 상대 경로로 빌드하면 GitHub Pages(하위 경로 /interior-planner/)와 Cloudflare Pages(루트 경로)
  // 양쪽 모두에서 같은 빌드 산출물을 그대로 쓸 수 있다(클라이언트 라우팅이 없는 SPA라 안전함).
  base: './',
  plugins: [react()],
})

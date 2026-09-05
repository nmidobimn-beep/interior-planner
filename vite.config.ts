import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages는 https://<user>.github.io/interior-planner/ 경로(프로젝트 사이트)로 서빙되므로,
  // 빌드된 index.html이 참조하는 에셋 경로도 이 하위 경로 기준으로 맞춰야 한다.
  base: '/interior-planner/',
  plugins: [react()],
})

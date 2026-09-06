import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MobileFurnitureApp } from './MobileFurnitureApp.tsx'

// 모바일에서는 평면도 편집 화면 대신 가구 실측 등록 화면만 보여준다(요구사항).
// 데스크탑 평면도 편집 기능은 그대로 유지하고, 화면 폭으로만 갈라 진입점을 나눈다.
const isMobile = window.matchMedia('(max-width: 768px)').matches

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMobile ? <MobileFurnitureApp /> : <App />}
  </StrictMode>,
)

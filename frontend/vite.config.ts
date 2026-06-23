import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 백엔드와 함께 사용하는 루트 .env에서 VITE_* 설정을 읽습니다.
  envDir: '..',
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
})

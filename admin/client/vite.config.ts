/**
 * 관리 페이지(React) Vite 설정
 *
 *   npm run dev:client    → http://localhost:5173 (API 는 관리 서버 3001 로 프록시)
 *   npm run build:client  → admin/public/dist 에 빌드. 관리 서버가 /admin/* 과 /assets/* 로 서빙한다.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	root: import.meta.dirname,
	plugins: [react()],
	build: {
		outDir: '../public/dist',
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		open: '/admin',
		proxy: {
			'/api': {
				target: `http://localhost:${process.env.ADMIN_PORT || 3001}`,
				changeOrigin: false,
			},
		},
	},
});

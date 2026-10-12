/**
 * 관리 서버 Hono 앱 생성
 *
 *  - /api/v1/admin/*     : 관리 API (세션 로그인 필요)
 *  - /assets/*           : React 관리 페이지 정적 파일 (admin/public/dist, `npm run build:client` 결과물)
 *  - /admin/*            : React SPA index.html
 *
 * 호출 전에 G.create('admin'), database.connect(), cache.connect(), session.connect(), mail.init() 이 끝나 있어야 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import G from '#config/global';
import { createAccessLogger } from '#lib/logger';
import session from '#lib/session';
import { notFoundHandler, errorHandler } from '#lib/error';
import type { AdminEnv } from '#lib/types';

export type AdminRouteModule = { register: (app: Hono<AdminEnv>) => void };

/**
 * routes/preroute.ts → routes/api/*.ts 순서로 등록한다.
 */
async function registerRoutes(app: Hono<AdminEnv>): Promise<void> {
	const preroute = (await import(path.join(G.path.routes, 'preroute.ts'))) as AdminRouteModule;
	preroute.register(app);

	const apiRoot = path.join(G.path.routes, 'api');
	for (const file of fs.readdirSync(apiRoot).sort()) {
		if (path.extname(file) !== '.ts') continue;
		const mod = (await import(path.join(apiRoot, file))) as AdminRouteModule;
		mod.register(app);
	}
}

/**
 * React SPA 의 index.html. 빌드 전이면 안내 문구를 돌려준다.
 */
function readSpaIndex(): string {
	const indexPath = path.join(G.path.adminClientDist, 'index.html');
	if (fs.existsSync(indexPath)) return fs.readFileSync(indexPath, 'utf8');
	return `<!doctype html><html lang="ko"><body style="font-family:sans-serif;padding:40px">
<h2>관리 페이지가 빌드되지 않았습니다.</h2>
<p>프로젝트 루트에서 <code>npm run build:client</code> 를 실행한 뒤 다시 접속해 주세요.</p>
<p>개발 중에는 <code>npm run dev:client</code> 로 Vite 개발 서버(http://localhost:5173)를 사용할 수 있습니다.</p>
</body></html>`;
}

export async function createApp(): Promise<Hono<AdminEnv>> {
	const app = new Hono<AdminEnv>();
	const config = G.config;

	app.use(secureHeaders());
	app.use(bodyLimit({ maxSize: config.server.bodyLimit }));
	app.use(session.middleware<AdminEnv>());

	// 접근 로그 (관리자 ID 기록)
	app.use(createAccessLogger(config, (c) => (c as unknown as { get: (k: 'loginId') => string | undefined }).get('loginId') || 'nologin'));

	// 정적 파일 (React 빌드 결과)
	const distRoot = path.relative(process.cwd(), G.path.adminClientDist) || '.';
	app.use('/assets/*', serveStatic({ root: distRoot }));
	app.use('/favicon.ico', serveStatic({ root: distRoot }));

	// 라우트 (인증 미들웨어 + API)
	await registerRoutes(app);

	// 헬스체크
	app.get('/health', (c) => c.json({ status: 'ok', env: G.env }));

	// SPA
	app.get('/', (c) => c.redirect('/admin'));
	app.get('/admin', (c) => c.html(readSpaIndex()));
	app.get('/admin/*', (c) => c.html(readSpaIndex()));

	app.notFound(notFoundHandler);
	app.onError(errorHandler);

	return app;
}

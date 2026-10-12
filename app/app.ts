/**
 * API 서버 Hono 앱 생성
 *
 * server.ts(실행) 와 분리해 두어 테스트에서 app.request() 로 바로 사용할 수 있다.
 * 호출 전에 G.create('app'), database.connect(), cache.connect(), mail.init() 이 끝나 있어야 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import G from '#config/global';
import { createAccessLogger } from '#lib/logger';
import { notFoundHandler, errorHandler } from '#lib/error';
import type { AppEnv } from '#lib/types';

export type AppRouteModule = { register: (app: Hono<AppEnv>) => void };

/**
 * routes/api/v1, v2 ... 와 routes/web 의 모든 라우트 파일을 읽어 register(app) 를 호출한다.
 */
async function registerRoutes(app: Hono<AppEnv>): Promise<void> {
	const apiRoot = path.join(G.path.routes, 'api');
	for (const version of fs.readdirSync(apiRoot).sort()) {
		if (!/^v[0-9]+$/.test(version)) continue;
		for (const file of fs.readdirSync(path.join(apiRoot, version)).sort()) {
			if (path.extname(file) !== '.ts') continue;
			const mod = (await import(path.join(apiRoot, version, file))) as AppRouteModule;
			mod.register(app);
		}
	}

	const webRoot = path.join(G.path.routes, 'web');
	for (const file of fs.readdirSync(webRoot).sort()) {
		if (path.extname(file) !== '.ts') continue;
		const mod = (await import(path.join(webRoot, file))) as AppRouteModule;
		mod.register(app);
	}
}

export async function createApp(): Promise<Hono<AppEnv>> {
	const app = new Hono<AppEnv>();
	const config = G.config;

	// 보안 헤더
	app.use(secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }));

	// CORS
	const origins = config.cors.origins || ['*'];
	app.use(
		cors({
			origin: origins.includes('*') ? '*' : origins,
			credentials: !origins.includes('*'),
			allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowHeaders: ['Accept', 'Authorization', 'Content-Type', config.auth.headerName, 'X-App-Version'],
		})
	);

	// 요청 본문 크기 제한
	app.use(bodyLimit({ maxSize: config.server.bodyLimit }));

	// 접근 로그 (사용자 식별은 preroute 이후에 채워지므로 응답 시점의 컨텍스트 변수를 본다)
	app.use(createAccessLogger(config, (c) => String((c as unknown as { get: (k: string) => unknown }).get('loginId') || 'nologin')));

	// 정적 파일 (app/public → /css/*, /img/*)
	const publicRoot = path.relative(process.cwd(), G.path.public) || '.';
	app.use('/css/*', serveStatic({ root: publicRoot }));
	app.use('/img/*', serveStatic({ root: publicRoot }));
	app.use('/favicon.ico', serveStatic({ root: publicRoot }));

	// 라우트
	await registerRoutes(app);

	// 404 / 에러
	app.notFound(notFoundHandler);
	app.onError(errorHandler);

	return app;
}

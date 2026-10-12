/**
 * 테스트 공통 helper
 *  - mongodb-memory-server 로 임시 MongoDB 를 띄우고
 *  - G.create(kind) → database/cache/session/mail 초기화 → Hono 앱 생성까지 해준다.
 *
 * 주의: 한 프로세스에서 G 는 kind 하나로만 초기화할 수 있으므로
 *       app 테스트와 admin 테스트는 별도 파일(별도 프로세스)로 둔다.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Hono } from 'hono';

process.env.NODE_ENV = 'test';
process.env.REDIS_ENABLE = 'false';
process.env.MAIL_ENABLE = 'false';
process.env.MYSQL_ENABLE = 'false';

export interface TestContext {
	app: Hono<any>;
	teardown: () => Promise<void>;
}

export async function setup(kind: 'app' | 'admin'): Promise<TestContext> {
	const mongod = await MongoMemoryServer.create();
	process.env.MONGO_URI = mongod.getUri('node_backend_test');

	const { default: G } = await import('#config/global');
	await G.create(kind);
	const loggerLib = await import('#lib/logger');
	loggerLib.configure(G.config);

	const { default: database } = await import('#lib/database');
	const { default: cache } = await import('#lib/cache');
	const { default: session } = await import('#lib/session');
	const { default: mail } = await import('#lib/mail');
	await database.connect();
	await cache.connect();
	if (kind === 'admin') await session.connect();
	mail.init();

	const { createApp } = (await import(`../${kind}/app.ts`)) as { createApp: () => Promise<Hono<any>> };
	const app = await createApp();

	async function teardown() {
		if (kind === 'admin') await session.close();
		await cache.close();
		await database.close();
		await mongod.stop();
	}

	return { app, teardown };
}

/**
 * JSON 요청 helper
 */
export async function json(app: Hono<any>, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
	const res = await app.request(path, {
		method,
		headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	let data: any = null;
	try {
		data = JSON.parse(text);
	} catch {
		data = text;
	}
	return { status: res.status, body: data, headers: res.headers };
}

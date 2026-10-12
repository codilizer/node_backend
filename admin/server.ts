/**
 * 관리 서버 기동 모듈
 *
 *   NODE_ENV=production node admin/server.ts
 */
import fs from 'node:fs';
import { serve } from '@hono/node-server';
import G from '#config/global';
import * as loggerLib from '#lib/logger';

const { logger, critLogger } = loggerLib;

await G.create('admin');
fs.mkdirSync(G.path.logs, { recursive: true });
loggerLib.configure(G.config);

async function start(): Promise<void> {
	const { default: database } = await import('#lib/database');
	const { default: cache } = await import('#lib/cache');
	const { default: session } = await import('#lib/session');
	const { default: mail } = await import('#lib/mail');
	const { default: mysql } = await import('#lib/mysql');
	const { createApp } = await import('./app.ts');

	logger.info(`start admin server pid: ${process.pid}, env: ${G.env}`);

	const unspecified = G.listUnspecified();
	if (unspecified.length > 0) {
		const line = `config has "#need to specify" values: ${unspecified.join(', ')}`;
		if (G.env === 'production') logger.error(line);
		else logger.warn(line);
	}
	if (G.adminConfig.skipAuth) {
		logger.warn('admin auth is skipped (config.skipAuth = true). never use this in a server environment.');
	}

	await database.connect();
	await cache.connect();
	await session.connect();
	mail.init();
	mysql.connect();

	const app = await createApp();
	const server = serve({ fetch: app.fetch, port: G.config.server.port }, (info) => {
		logger.info(`start admin server: ${info.port}, env: ${G.env}`);
	});

	let shuttingDown = false;
	const exit = (code: number) => {
		if (shuttingDown) return;
		shuttingDown = true;
		server.close(async () => {
			try {
				await session.close();
				await cache.close();
				await mysql.close();
				await database.close();
			} catch (err) {
				logger.error(err);
			}
			process.exit(code);
		});
		setTimeout(() => process.exit(code), 10000).unref();
	};
	process.on('SIGINT', () => exit(0));
	process.on('SIGTERM', () => exit(0));
	process.on('uncaughtException', (err) => {
		critLogger.error('uncaughtException');
		critLogger.error(err.stack || err);
	});
	process.on('unhandledRejection', (reason) => {
		critLogger.error('unhandledRejection');
		critLogger.error(reason instanceof Error ? reason.stack : reason);
	});
}

start().catch((err) => {
	critLogger.error('failed to start admin server');
	critLogger.error(err instanceof Error ? err.stack : err);
	process.exit(1);
});

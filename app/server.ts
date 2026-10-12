/**
 * API 서버 기동 모듈
 *
 *   NODE_ENV=production node app/server.ts
 *   node app/server.ts --env development
 */
import cluster from 'node:cluster';
import os from 'node:os';
import fs from 'node:fs';
import { serve } from '@hono/node-server';
import G from '#config/global';
import * as loggerLib from '#lib/logger';

const { logger, critLogger } = loggerLib;

// 설정 초기화는 다른 모듈을 사용하기 전에 가장 먼저 한다.
await G.create('app');
fs.mkdirSync(G.path.logs, { recursive: true });
loggerLib.configure(G.config);

/**
 * 워커(실제 서버) 기동
 */
async function startWorker(): Promise<void> {
	const { default: database } = await import('#lib/database');
	const { default: cache } = await import('#lib/cache');
	const { default: mail } = await import('#lib/mail');
	const { default: mysql } = await import('#lib/mysql');
	const { createApp } = await import('./app.ts');

	logger.info(`start worker pid: ${process.pid}, env: ${G.env}`);

	// 비어 있는 설정 경고
	const unspecified = G.listUnspecified();
	if (unspecified.length > 0) {
		const line = `config has "#need to specify" values: ${unspecified.join(', ')}`;
		if (G.env === 'production') logger.error(line);
		else logger.warn(line);
	}

	// 외부 자원 연결
	await database.connect();
	await cache.connect();
	mail.init();
	mysql.connect();

	const app = await createApp();
	const server = serve({ fetch: app.fetch, port: G.config.server.port }, (info) => {
		logger.info(`start node server: ${info.port}, env: ${G.env}`);
	});

	// 종료 처리
	let shuttingDown = false;
	const exit = (code: number) => {
		if (shuttingDown) return;
		shuttingDown = true;
		logger.info('shutting down...');
		server.close(async () => {
			try {
				await cache.close();
				await mysql.close();
				await database.close();
			} catch (err) {
				logger.error(err);
			}
			process.exit(code);
		});
		// 10초 안에 안 닫히면 강제 종료
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

/**
 * 마스터: cluster 모드일 때 CPU 수만큼 워커를 띄우고 죽으면 다시 띄운다.
 */
function startMaster(): void {
	const workers = new Map<number, ReturnType<typeof cluster.fork>>();
	for (let i = 0; i < os.cpus().length; i++) {
		const worker = cluster.fork();
		workers.set(worker.process.pid!, worker);
		logger.info(`create new worker pid: ${worker.process.pid}`);
	}

	cluster.on('exit', (exitWorker, code, signal) => {
		workers.delete(exitWorker.process.pid!);
		logger.warn(`worker ${exitWorker.process.pid} died (${signal || code}). restarting...`);
		const worker = cluster.fork();
		workers.set(worker.process.pid!, worker);
	});

	const exit = (code: number) => {
		cluster.removeAllListeners('exit');
		for (const worker of workers.values()) {
			worker.kill('SIGTERM');
			logger.info(`terminate worker pid: ${worker.process.pid}`);
		}
		process.exit(code);
	};
	process.on('SIGINT', () => exit(0));
	process.on('SIGTERM', () => exit(0));
}

if (G.config.server.cluster && cluster.isPrimary) {
	startMaster();
} else {
	startWorker().catch((err) => {
		critLogger.error('failed to start server');
		critLogger.error(err instanceof Error ? err.stack : err);
		process.exit(1);
	});
}

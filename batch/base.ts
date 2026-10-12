/**
 * base batch
 *
 * 배치 스크립트 공통 초기화. 설정 → 로거 → DB/캐시/메일 연결까지 해주고,
 * 작업 함수를 순서대로 실행한 뒤 자원을 정리하고 종료한다.
 *
 * 사용:
 *   import batch from '../base.ts';
 *   batch.push(async (dryRun) => { ... });
 *   await batch.start('작업 이름');
 *
 * 옵션:
 *   --dryRun=false  실제 반영 (기본은 dryRun=true 로 변경하지 않음)
 *   --env=production
 */
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import G from '#config/global';
import * as loggerLib from '#lib/logger';

type Task = (dryRun: boolean) => Promise<void>;

class BaseBatch {
	private tasks: Task[] = [];
	readonly dryRun: boolean;
	readonly args: Record<string, string | boolean | undefined>;
	logger = loggerLib.getLogger('batch');

	constructor() {
		const { values } = parseArgs({
			options: {
				dryRun: { type: 'string' },
				env: { type: 'string' },
				id: { type: 'string' },
				password: { type: 'string' },
				name: { type: 'string' },
				email: { type: 'string' },
				role: { type: 'string' },
			},
			strict: false,
		});
		this.args = values as Record<string, string | boolean | undefined>;
		this.dryRun = !(values.dryRun === 'false');
	}

	/**
	 * 설정/로거/DB 초기화
	 */
	async init(): Promise<void> {
		await G.create('batch');
		fs.mkdirSync(G.path.logs, { recursive: true });
		loggerLib.configure(G.config);

		const { default: database } = await import('#lib/database');
		const { default: cache } = await import('#lib/cache');
		const { default: mail } = await import('#lib/mail');
		await database.connect();
		await cache.connect();
		mail.init();

		process.on('uncaughtException', (err) => {
			this.logger.error('uncaughtException');
			this.logger.error(err.stack || err);
			process.exit(1);
		});
	}

	push(task: Task): void {
		this.tasks.push(task);
	}

	/**
	 * 등록된 작업을 순서대로 실행하고 종료한다.
	 */
	async start(name: string): Promise<void> {
		this.logger.info(`start : ${name}, dryRun : ${this.dryRun}, env : ${G.env}`);
		let exitCode = 0;
		try {
			for (const [index, task] of this.tasks.entries()) {
				await task(this.dryRun);
				this.logger.info(`${name} progress ${Math.floor(((index + 1) / this.tasks.length) * 100)}%`);
			}
			this.logger.info(`complete : ${name}`);
		} catch (err) {
			exitCode = 1;
			this.logger.error(err instanceof Error ? err.stack : err);
		} finally {
			const { default: database } = await import('#lib/database');
			const { default: cache } = await import('#lib/cache');
			await cache.close();
			await database.close();
			process.exit(exitCode);
		}
	}
}

const batch = new BaseBatch();
await batch.init();
export default batch;

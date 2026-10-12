/**
 * MySQL library (mysql2/promise)
 *
 * 설정 db.mysql.enable 이 true 일 때만 커넥션 풀을 만든다.
 * 원본 프로젝트의 execQuery/execUpdate/startTransaction 구조를 유지하되 Promise 기반으로 바꾸었다.
 * 플레이스홀더는 mysql2 의 namedPlaceholders(:name) 를 사용한다.
 *
 * 사용:
 *   import MySQL from '#lib/mysql';
 *   const rows = await MySQL.execQuery<AuthRow>('SELECT * FROM auth WHERE _id = :id', { id });
 *   await MySQL.transaction(async (conn) => { await conn.execute(...); });
 */
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import G from '#config/global';
import { logger, queryLogger } from '#lib/logger';
import { CustomError } from '#lib/error';

type Params = Record<string, unknown>;

/** mysql2 의 execute 는 namedPlaceholders 객체를 받지만 타입 정의가 배열만 허용해 캐스팅한다. */
function asValues(params: Params): any[] {
	return params as unknown as any[];
}

/**
 * 파라미터 로그 포맷. Buffer 는 내용 대신 <Buffer> 로 남긴다.
 */
function loggingFormat(parameters: Params = {}): string {
	return Object.entries(parameters)
		.map(([key, val]) => (Buffer.isBuffer(val) ? `${key}=<Buffer>` : `${key}=${String(val)}`))
		.join(',');
}

class MySQL {
	pool: Pool | null = null;
	enabled = false;
	private pingTimer: NodeJS.Timeout | null = null;

	/** enum 정의 (원본 호환). 필요 시 추가한다. */
	readonly enums = {
		STATUS: {
			NORMAL: 'normal',
			RETIRE: 'retire',
			ADMIN_RETIRE: 'admin_retire',
		},
	} as const;

	connect(): this {
		const config = G.config.db.mysql;
		if (!config || !config.enable) {
			logger.info('mysql is disabled (db.mysql.enable = false)');
			return this;
		}

		this.pool = mysql.createPool({
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			connectionLimit: config.connectionLimit || 5,
			namedPlaceholders: true,
			timezone: 'Z',
		});
		this.enabled = true;

		// 30초마다 ping 으로 커넥션 유지
		this.pingTimer = setInterval(async () => {
			try {
				const conn = await this.pool!.getConnection();
				await conn.ping();
				conn.release();
			} catch (err) {
				logger.error(`mysql connection error. ${err}`);
			}
		}, 30000);
		this.pingTimer.unref();

		logger.info(`mysql pool created: ${config.host}:${config.port}/${config.database}`);
		return this;
	}

	private assertEnabled(): Pool {
		if (!this.enabled || !this.pool) throw new CustomError(G.err.other, 'mysql is not enabled');
		return this.pool;
	}

	/**
	 * 조회 쿼리
	 */
	async execQuery<T extends RowDataPacket = RowDataPacket>(sql: string, placeholder: Params = {}): Promise<T[]> {
		const pool = this.assertEnabled();
		queryLogger.debug(`==>  Preparing: ${sql}`);
		queryLogger.debug(`==>  Parameters: ${loggingFormat(placeholder)}`);
		try {
			const [rows] = await pool.execute<T[]>(sql, asValues(placeholder));
			queryLogger.debug(`<==      Total: ${rows.length}`);
			return rows;
		} catch (err) {
			throw new CustomError(G.err.other, err as Error);
		}
	}

	/**
	 * 변경 쿼리 (INSERT/UPDATE/DELETE)
	 */
	async execUpdate(sql: string, placeholder: Params = {}): Promise<ResultSetHeader> {
		const pool = this.assertEnabled();
		queryLogger.info(`==>  Preparing: ${sql}`);
		queryLogger.info(`==>  Parameters: ${loggingFormat(placeholder)}`);
		try {
			const [result] = await pool.execute<ResultSetHeader>(sql, asValues(placeholder));
			queryLogger.info(`<==      Result: ${JSON.stringify(result || '')}`);
			return result;
		} catch (err) {
			const error = err as Error & { code?: string };
			if (error.code === 'ER_DUP_ENTRY') throw new CustomError(G.err.conflict, error);
			throw new CustomError(G.err.other, error);
		}
	}

	/**
	 * 트랜잭션. fn(conn) 이 정상 종료되면 commit, 예외가 나면 rollback.
	 */
	async transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
		const pool = this.assertEnabled();
		const conn = await pool.getConnection();
		try {
			await conn.beginTransaction();
			queryLogger.debug('transaction started');
			const result = await fn(conn);
			await conn.commit();
			queryLogger.debug('transaction committed');
			return result;
		} catch (err) {
			await conn.rollback();
			queryLogger.error(`transaction rollback = ${err}`);
			throw err instanceof CustomError ? err : new CustomError(G.err.other, err as Error);
		} finally {
			conn.release();
		}
	}

	async close(): Promise<void> {
		if (this.pingTimer) clearInterval(this.pingTimer);
		if (this.pool) await this.pool.end();
		this.pool = null;
		this.enabled = false;
	}
}

const instance = new MySQL();
export default instance;

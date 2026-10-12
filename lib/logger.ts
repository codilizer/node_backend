/**
 * Logger library (log4js)
 *
 * 카테고리:
 *   action   - 일반 동작 로그
 *   query    - DB 쿼리 로그
 *   access   - HTTP 접근 로그
 *   critical - 프로세스 레벨 치명적 오류
 *
 * 사용: import { logger } from '#lib/logger';  logger.info(...)
 * configure() 는 서버 기동 시 1회 호출한다. 호출 전에도 콘솔로는 출력된다.
 */
import log4js from 'log4js';
import type { Context, MiddlewareHandler } from 'hono';
import type { AnyConfig } from '#config/types';
import { getClientIp } from '#lib/user_agent';

let configured = false;

export function configure(config: AnyConfig): void {
	if (!config || !config.log4js) return;
	log4js.configure({
		appenders: config.log4js.appenders,
		categories: config.log4js.categories,
	});
	configured = true;
}

export const isConfigured = (): boolean => configured;
export const getLogger = (category: string) => log4js.getLogger(category);
export const logger = log4js.getLogger('action');
export const queryLogger = log4js.getLogger('query');
export const critLogger = log4js.getLogger('critical');
export const accessLogger = log4js.getLogger('access');

const MASK_KEYS = ['password', 'new_password', 'current_password', 'token', 'accessToken', 'email', 'push_token'];

/**
 * 본문에서 민감한 값을 마스킹한다.
 */
export function maskBody(body: unknown): unknown {
	if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
	const masked: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
		masked[key] = MASK_KEYS.includes(key) ? '**********' : value;
	}
	return masked;
}

/**
 * Hono 접근 로그 미들웨어
 *   형식: ip  user  status  method  path  user-agent  response-time  body  query
 */
export function createAccessLogger(config: AnyConfig, getUserLabel: (c: Context) => string): MiddlewareHandler {
	const level = config.log4js.access?.level || 'info';

	return async (c, next) => {
		const start = Date.now();
		await next();
		const elapsed = Date.now() - start;

		let body: unknown = {};
		const contentType = c.req.header('content-type') || '';
		if (c.req.method !== 'GET' && contentType.includes('application/json')) {
			try {
				body = maskBody(await c.req.json());
			} catch {
				body = {};
			}
		}

		const line = [
			getClientIp(c, config.server.trustProxy),
			getUserLabel(c),
			c.res.status,
			c.req.method,
			c.req.path,
			c.req.header('user-agent') || '-',
			`${elapsed}ms`,
			JSON.stringify(body),
			JSON.stringify(c.req.query()),
		].join('\t');
		accessLogger.log(level, line);
	};
}

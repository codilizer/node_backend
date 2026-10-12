/**
 * App API (헬스체크 / 버전)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseQuery, field, z } from '#lib/validate';
import * as preroute from '#lib/preroute';
import versionModel from '#model/version';
import { deviceType } from '#doc/main';
import type { AppEnv } from '#lib/types';

export function register(app: Hono<AppEnv>): void {
	/**
	 * 헬스체크 (로드밸런서용)
	 */
	app.get('/api/v1/health', (c) => {
		return success(c, { status: 'ok', env: G.env, time: new Date() });
	});

	/**
	 * 앱 버전 확인
	 *   GET /api/v1/app/version?type=ios&version=1.0.0
	 *   type 을 생략하면 User-Agent 로 판단한다. version 은 X-App-Version 헤더로도 받는다.
	 */
	app.get('/api/v1/app/version', preroute.getMiddleware(), async (c) => {
		const query = parseQuery(
			c,
			z.object({
				type: z.enum(deviceType).optional(),
				version: field.version.optional(),
			})
		);
		const type = query.type || c.get('userClient');
		const currentVersion = query.version || c.req.header('X-App-Version') || null;

		const result = await versionModel.check(type, currentVersion);
		return success(c, result);
	});
}

/**
 * Admin Version API (앱 버전 관리)
 */
import type { Hono } from 'hono';
import { success } from '#lib/response';
import { parseJson, parseParams, field, z } from '#lib/validate';
import versionModel from '#model/version';
import { deviceType } from '#doc/main';
import type { AdminEnv } from '#lib/types';

export function register(app: Hono<AdminEnv>): void {
	app.get('/api/v1/admin/versions', async (c) => {
		return success(c, await versionModel.getList());
	});

	/**
	 * 디바이스 종류별 버전 저장
	 *   body: version, min_version?, store_url?
	 */
	app.put('/api/v1/admin/version/:type', async (c) => {
		const { type } = parseParams(c, z.object({ type: z.enum(deviceType) }));
		const body = await parseJson(
			c,
			z.object({
				version: field.version,
				min_version: field.version.or(z.literal('')).optional(),
				store_url: field.url.or(z.literal('')).optional(),
			})
		);

		const result = await versionModel.upsert(type, {
			version: body.version,
			minVersion: body.min_version,
			storeUrl: body.store_url,
		});
		return success(c, result);
	});
}
